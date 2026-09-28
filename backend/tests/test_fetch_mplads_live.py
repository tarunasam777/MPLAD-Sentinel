"""Offline tests for the live eSAKSHI harvester (no network)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from fetch_mplads_live import parse_amount, tile_row  # noqa: E402

SAMPLE_TILES = {
    "Allocated Limit for Hon'ble MPs": ["\u20b983,41,87,02,273.80", "\u20b98,341.87 Crore"],
    "Expenditure on Completed and On-going Works as on Date": ["\u20b928,56,90,21,832.45", "\u20b92,856.90 Crore"],
    "Works Recommended": ["109625", "\u20b95,89,24,25,79,791.00", "\u20b95,892.43 Crore"],
    "Works Sanctioned": ["81727", "\u20b94,31,38,27,18,338.00", "\u20b94,313.83 Crore"],
    "Works Completed": ["35648", "\u20b91,75,19,64,05,638.00", "\u20b91,751.96 Crore"],
    "Amount consented for Calamity": ["12", "\u20b94,05,67,400.00", "\u20b94.06 Crore"],
    "Current Tenure": [{"ID": 7, "CAPTION": "18th Lok Sabha"}],
}


def test_parse_amount_strips_currency_glyphs_and_commas():
    assert parse_amount("\u20b983,41,87,02,273.80") == 83_418_702_273.80
    assert parse_amount("\u20b914.70 Crore") == 14.70
    assert parse_amount("") == 0.0
    assert parse_amount("\u20b90.00") == 0.0


def test_parse_amount_is_locale_tolerant():
    # the portal sometimes mangles the rupee glyph to a replacement char
    assert parse_amount("\ufffd7,34,22,85,090.94") == 7_342_285_090.94


def test_tile_row_extracts_counts_and_amounts():
    row = tile_row("national", 0, 0, 0, SAMPLE_TILES)
    assert row["level"] == "national"
    assert row["allocated_limit_rupees"] == 83_418_702_273.80
    assert row["works_recommended_count"] == 109625
    assert row["works_sanctioned_count"] == 81727
    assert row["works_completed_count"] == 35648
    assert row["tenure"] == 2


def test_tile_row_is_total_strut_with_missing_keys():
    row = tile_row("state", "21", 0, 0, {})
    assert row["allocated_limit_rupees"] == 0.0
    assert row["works_recommended_count"] == 0
    assert row["raw"] == {}
