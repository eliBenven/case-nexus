"""Smoke tests for Case Nexus — critical paths that must not break.

These run without an API key and verify:
1. Database layer works (create tables, insert/query cases)
2. Demo data generates correctly (500 cases, key cases present)
3. Legal corpus loads and maps charges to statutes
4. Flask app boots and serves the index page
5. AI engine JSON parser handles edge cases
"""

import json
import os
import tempfile

import pytest


# ============================================================
#  DATABASE
# ============================================================

def test_database_roundtrip():
    """Insert a case, query it back, verify fields."""
    import database as db

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    original_path = db.DB_PATH
    db.DB_PATH = db_path
    try:
        db.init_db()
        db.insert_cases([{
            "case_number": "TEST-001",
            "defendant_name": "Test Defendant",
            "charges": json.dumps(["Simple Assault"]),
            "severity": "misdemeanor",
            "status": "ACTIVE",
            "court": "Test Court",
            "judge": "Hon. Test",
            "prosecutor": "ADA Test",
            "filing_date": "2026-01-01",
            "arrest_date": "2025-12-28",
            "arresting_officer": "Officer Test",
            "precinct": "Test Precinct",
            "witnesses": json.dumps(["Witness A"]),
            "next_hearing_date": "2026-03-01",
            "hearing_type": "Status Conference",
            "evidence_summary": "Test evidence",
            "notes": "Test notes",
            "attorney_notes": "Test attorney notes",
            "plea_offer": None,
            "plea_offer_details": None,
            "disposition": None,
            "prior_record": "No prior record.",
            "bond_status": "ROR",
            "created_at": "2026-01-01T00:00:00",
            "updated_at": "2026-01-01T00:00:00",
        }])
        case = db.get_case("TEST-001")
        assert case is not None
        assert case["defendant_name"] == "Test Defendant"
        assert case["severity"] == "misdemeanor"

        cases = db.get_all_cases()
        assert len(cases) == 1

        context = db.build_caseload_context()
        assert "TEST-001" in context
        assert "Test Defendant" in context
    finally:
        db.DB_PATH = original_path
        os.unlink(db_path)


# ============================================================
#  DEMO DATA
# ============================================================

def test_demo_data_generates_500_cases():
    """Verify demo caseload has 500 cases with required key cases."""
    from demo_data import generate_demo_caseload

    cases = generate_demo_caseload()
    assert len(cases) == 500

    # Key cases that the AI is designed to discover
    case_numbers = {c["case_number"] for c in cases}
    assert "CR-2025-0012" in case_numbers  # Officer Rodriguez DUI
    assert "CR-2025-0089" in case_numbers  # Officer Rodriguez possession
    assert "CR-2025-0047" in case_numbers  # Speedy trial risk


def test_demo_data_officer_rodriguez_pattern():
    """The Officer Rodriguez cross-case pattern must be present."""
    from demo_data import generate_demo_caseload

    cases = generate_demo_caseload()
    rodriguez_cases = [
        c for c in cases if "Rodriguez" in c.get("arresting_officer", "")
    ]
    assert len(rodriguez_cases) >= 4, (
        f"Expected 4+ Rodriguez cases, got {len(rodriguez_cases)}"
    )


# ============================================================
#  LEGAL CORPUS
# ============================================================

def test_legal_corpus_charge_mapping():
    """Charge-to-law mapping returns Georgia statutes."""
    import legal_corpus

    mapping = legal_corpus.CHARGE_TO_LAW.get("Aggravated Assault")
    assert mapping is not None
    assert "16-5-21" in mapping["georgia"]


def test_legal_corpus_fuzzy_match():
    """Fuzzy matching handles common charge variations."""
    import legal_corpus

    result = legal_corpus._match_charge("DUI - Under the Influence")
    assert result is not None


# ============================================================
#  AI ENGINE — JSON PARSER
# ============================================================

def test_parse_json_direct():
    """Direct JSON string parses correctly."""
    from ai_engine import _parse_json_response

    result = _parse_json_response('{"key": "value"}')
    assert result == {"key": "value"}


def test_parse_json_with_markdown_fences():
    """JSON wrapped in markdown code fences parses correctly."""
    from ai_engine import _parse_json_response

    result = _parse_json_response('```json\n{"key": "value"}\n```')
    assert result == {"key": "value"}


def test_parse_json_with_surrounding_text():
    """JSON embedded in narrative text is extracted."""
    from ai_engine import _parse_json_response

    result = _parse_json_response('Here is the analysis:\n{"key": "value"}\nEnd.')
    assert result == {"key": "value"}


def test_parse_json_returns_none_for_garbage():
    """Non-JSON input returns None, not an exception."""
    from ai_engine import _parse_json_response

    assert _parse_json_response("no json here") is None
    assert _parse_json_response("") is None
    assert _parse_json_response(None) is None


# ============================================================
#  FLASK APP
# ============================================================

def test_flask_app_boots():
    """The Flask app creates and serves index.html."""
    import app as case_nexus_app

    client = case_nexus_app.app.test_client()
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"Case Nexus" in resp.data


def test_api_stats_empty_db():
    """Stats endpoint works with an empty database."""
    import app as case_nexus_app

    client = case_nexus_app.app.test_client()
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "cases" in data
