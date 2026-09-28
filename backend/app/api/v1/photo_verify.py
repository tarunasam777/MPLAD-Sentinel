from __future__ import annotations

import io
import math
from typing import Literal

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel
from PIL import ExifTags, Image, UnidentifiedImageError

import imagehash

from app.core.config import MAX_IMAGE_PIXELS, MAX_UPLOAD_BYTES

router = APIRouter(prefix="/verify-photos", tags=["photo-verify"])

HASH_BITS = 64
DUPLICATE_HAMMING_THRESHOLD = 10
DUPLICATE_SIMILARITY_THRESHOLD = 85.0
EARTH_RADIUS_M = 6_371_000.0

EXIF_DATETIME = 306
EXIF_DATETIME_ORIGINAL = 36867

# Guard against decompression-bomb images (a 10x10 pixel PNG that expands to
# gigabytes on decode). Pillow raises DecompressionBombError past the cap.
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS


async def _read_limited(upload: UploadFile, field: str) -> bytes:
    """Read an upload capped at MAX_UPLOAD_BYTES so a malicious or runaway
    client cannot force unbounded memory allocation on the read."""
    content = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"{field} exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.",
        )
    if not content:
        raise HTTPException(status_code=400, detail=f"{field} must be a non-empty image file.")
    return content


def _load_image(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode uploaded image: {exc}") from exc
    try:
        img.load()
    except Image.DecompressionBombError as exc:
        raise HTTPException(
            status_code=413,
            detail=f"Image is too large to decode ({MAX_IMAGE_PIXELS:,} pixel limit).",
        ) from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode uploaded image: {exc}") from exc
    return img


def _dms_to_decimal(values: object, ref: object) -> float | None:
    if not values:
        return None
    try:
        deg = float(values[0]) + float(values[1]) / 60.0 + float(values[2]) / 3600.0
    except (TypeError, ValueError, IndexError):
        return None
    if str(ref).strip().upper() in ("S", "W"):
        deg = -deg
    return round(deg, 6)


def _extract_gps(img: Image.Image) -> dict[str, float] | None:
    exif = img.getexif()
    if not exif:
        return None
    try:
        gps = exif.get_ifd(ExifTags.IFD.GPSInfo)
    except (AttributeError, ValueError):
        return None
    if not gps:
        return None
    lat = _dms_to_decimal(gps.get(ExifTags.GPS.GPSLatitude), gps.get(ExifTags.GPS.GPSLatitudeRef))
    lng = _dms_to_decimal(gps.get(ExifTags.GPS.GPSLongitude), gps.get(ExifTags.GPS.GPSLongitudeRef))
    if lat is None or lng is None:
        return None
    return {"lat": lat, "lng": lng}


def _extract_timestamp(img: Image.Image) -> str | None:
    exif = img.getexif()
    if not exif:
        return None
    raw = exif.get(EXIF_DATETIME_ORIGINAL) or exif.get(EXIF_DATETIME)
    if not raw:
        return None
    return str(raw).strip().replace(":", "-", 2).replace(" ", "T", 1)


def _haversine_meters(a: dict[str, float], b: dict[str, float]) -> float:
    phi1, phi2 = math.radians(a["lat"]), math.radians(b["lat"])
    d_phi = math.radians(b["lat"] - a["lat"])
    d_lmb = math.radians(b["lng"] - a["lng"])
    h = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lmb / 2) ** 2
    h = min(1.0, max(0.0, h))
    return round(2 * EARTH_RADIUS_M * math.asin(math.sqrt(h)), 1)


class GeoPoint(BaseModel):
    lat: float
    lng: float


class ExifComparison(BaseModel):
    image_a_gps: GeoPoint | None = None
    image_b_gps: GeoPoint | None = None
    spatial_distance_meters: float | None = None
    timestamp_a: str | None = None
    timestamp_b: str | None = None


class VerifyPhotosOut(BaseModel):
    hash_a: str
    hash_b: str
    hamming_distance: int
    similarity_percentage: float
    is_duplicate_flag: bool
    exif_data: ExifComparison
    verdict: Literal["FLAGGED_FORGED_DUPLICATE", "VERIFIED_DISTINCT"]


@router.post("", response_model=VerifyPhotosOut)
async def verify_photos(
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
) -> VerifyPhotosOut:
    """Compare two uploaded stage photos for duplication/tampering.

    Uses perceptual hashing (pHash) for visual similarity and EXIF metadata
    (GPS + capture timestamp) for geospatial corroboration.
    """
    a_bytes = await _read_limited(image_a, "image_a")
    b_bytes = await _read_limited(image_b, "image_b")

    img_a = _load_image(a_bytes)
    img_b = _load_image(b_bytes)

    hash_a = imagehash.phash(img_a.convert("RGB"))
    hash_b = imagehash.phash(img_b.convert("RGB"))

    hamming_distance = int(hash_a - hash_b)
    similarity_percentage = round(max(0.0, 100.0 - (hamming_distance * 100.0 / HASH_BITS)), 1)
    is_duplicate_flag = hamming_distance <= DUPLICATE_HAMMING_THRESHOLD or similarity_percentage >= DUPLICATE_SIMILARITY_THRESHOLD

    gps_a = _extract_gps(img_a)
    gps_b = _extract_gps(img_b)
    spatial_distance_meters = _haversine_meters(gps_a, gps_b) if (gps_a and gps_b) else None

    return VerifyPhotosOut(
        hash_a=str(hash_a),
        hash_b=str(hash_b),
        hamming_distance=hamming_distance,
        similarity_percentage=similarity_percentage,
        is_duplicate_flag=is_duplicate_flag,
        exif_data=ExifComparison(
            image_a_gps=GeoPoint(**gps_a) if gps_a else None,
            image_b_gps=GeoPoint(**gps_b) if gps_b else None,
            spatial_distance_meters=spatial_distance_meters,
            timestamp_a=_extract_timestamp(img_a),
            timestamp_b=_extract_timestamp(img_b),
        ),
        verdict="FLAGGED_FORGED_DUPLICATE" if is_duplicate_flag else "VERIFIED_DISTINCT",
    )