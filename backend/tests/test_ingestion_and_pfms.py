import pytest
from app.db.models import Case, QuarantineQueue
from app.ingestion.esakshi_scraper import EsakshiScraperClient
from app.ingestion.pipeline import ingest_and_evaluate_batch
from app.modules.pfms_matcher import match_vendor_disbursement

def test_esakshi_scraper_normalization():
    scraper = EsakshiScraperClient()
    sample_html = """
    <table>
        <tr><th>Code</th><th>Work Description</th><th>Category</th><th>MP Name</th><th>Amount</th><th>Sanction Date</th></tr>
        <tr><td>2025-4491</td><td>Construction of CC Road, Ward 2</td><td>Rural Roads</td><td>Shri G. Kishan Reddy</td><td>₹ 18.50 Lakh</td><td>12 Jun 2025</td></tr>
    </table>
    """
    cases = scraper.parse_works_html(sample_html, "Telangana", "Hyderabad")
    assert len(cases) == 1
    c = cases[0]
    assert c["id"] == "MPL-2025-4491"
    assert c["category"] == "Rural Roads"
    assert c["sanctionedAmountLakh"] == 18.5
    assert c["district"] == "Hyderabad"
    assert "facts" in c

def test_quarantine_queue_on_corrupt_payload(test_db):
    corrupt_payloads = [
        {"title": ""},  # Missing district, category, invalid title
        {"title": "Valid Title", "district": "Hyderabad", "category": "Roads", "sanctionedAmountLakh": -5.0}, # Invalid negative amount
        "non-dict-string-payload", # Completely invalid type
    ]

    res = ingest_and_evaluate_batch(test_db, corrupt_payloads, source="esakshi")
    assert res["total"] == 3
    assert res["quarantined"] == 3
    assert res["ingested"] == 0

    quarantine_rows = test_db.query(QuarantineQueue).all()
    assert len(quarantine_rows) >= 3
    assert any("negative" in q.error_reason or "positive" in q.error_reason for q in quarantine_rows)

def test_pfms_matcher_disbursement(test_db):
    # Test case 1: Matching stage account with registered agency
    res_clean = match_vendor_disbursement(
        db=test_db,
        proposal_id="MPL-2025-1010",
        stage_number=2,
        target_account="SBIN00014239871",
        vendor_gstin="36AAAGW2345Q1Z6",
        vendor_name="Rural Water Supply & Sanitation Department",
    )
    assert res_clean.matched is True
    assert res_clean.fund_redirection_alert is False
    assert res_clean.vendor_similarity_pct >= 85.0

    # Test case 2: Redirection alert on changed bank account
    res_redirect = match_vendor_disbursement(
        db=test_db,
        proposal_id="MPL-2025-1010",
        stage_number=2,
        target_account="HDFC00099999999",  # Unregistered account
        vendor_gstin="36AAAGW2345Q1Z6",
        vendor_name="Rural Water Supply & Sanitation Department",
    )
    assert res_redirect.fund_redirection_alert is True
    assert "FUND_REDIRECTION_ALERT" in res_redirect.flags
    assert res_redirect.risk_score >= 60

    # Test case 3: Unverified vendor name mismatch
    res_vendor_mismatch = match_vendor_disbursement(
        db=test_db,
        proposal_id="MPL-2025-1010",
        stage_number=1,
        target_account="SBIN00014239871",
        vendor_gstin="36XXXXX0000X0Z0",
        vendor_name="Unknown Private Contractor Enterprise",
    )
    assert res_vendor_mismatch.vendor_similarity_pct < 85.0
    assert "UNVERIFIED_PFMS_VENDOR" in res_vendor_mismatch.flags
