"""SQLite persistence layer for Case Nexus.

Local-first design: all case data lives in a single SQLite file.
No external database server needed — a public defender can run
this on their laptop.
"""

import json
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "case_nexus.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_number TEXT UNIQUE NOT NULL,
                defendant_name TEXT NOT NULL,
                charges TEXT NOT NULL DEFAULT '[]',
                severity TEXT NOT NULL DEFAULT 'misdemeanor',
                status TEXT NOT NULL DEFAULT 'active',
                court TEXT DEFAULT '',
                judge TEXT DEFAULT '',
                prosecutor TEXT DEFAULT '',
                next_hearing_date TEXT,
                hearing_type TEXT,
                filing_date TEXT,
                arrest_date TEXT,
                evidence_summary TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                attorney_notes TEXT DEFAULT '',
                plea_offer TEXT,
                plea_offer_details TEXT,
                disposition TEXT,
                arresting_officer TEXT DEFAULT '',
                precinct TEXT DEFAULT '',
                witnesses TEXT DEFAULT '[]',
                prior_record TEXT DEFAULT '',
                bond_status TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id INTEGER,
                case_number TEXT,
                alert_type TEXT NOT NULL,
                severity TEXT NOT NULL DEFAULT 'info',
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT DEFAULT '',
                dismissed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_id) REFERENCES cases(id)
            );

            CREATE TABLE IF NOT EXISTS connections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_numbers TEXT NOT NULL DEFAULT '[]',
                connection_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                confidence REAL DEFAULT 0.0,
                actionable TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_number TEXT NOT NULL,
                evidence_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                file_path TEXT DEFAULT '',
                source TEXT DEFAULT '',
                date_collected TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (case_number) REFERENCES cases(case_number)
            );

            CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_number);

            CREATE TABLE IF NOT EXISTS analysis_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                analysis_type TEXT NOT NULL,
                scope TEXT DEFAULT '',
                thinking_text TEXT DEFAULT '',
                result_json TEXT DEFAULT '{}',
                token_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
            CREATE INDEX IF NOT EXISTS idx_cases_severity ON cases(severity);
            CREATE INDEX IF NOT EXISTS idx_cases_next_hearing ON cases(next_hearing_date);
            CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
            CREATE INDEX IF NOT EXISTS idx_alerts_dismissed ON alerts(dismissed);
        """)


# --- Case Operations ---

def get_all_cases() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM cases ORDER BY "
            "CASE WHEN next_hearing_date IS NOT NULL AND next_hearing_date != '' "
            "THEN next_hearing_date ELSE '9999-12-31' END ASC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_case(case_number: str) -> dict | None:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM cases WHERE case_number = ?", (case_number,)
        ).fetchone()
        return _row_to_dict(row) if row else None


def get_case_count() -> dict:
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
        felonies = conn.execute(
            "SELECT COUNT(*) FROM cases WHERE severity = 'felony'"
        ).fetchone()[0]
        misdemeanors = conn.execute(
            "SELECT COUNT(*) FROM cases WHERE severity = 'misdemeanor'"
        ).fetchone()[0]
        active = conn.execute(
            "SELECT COUNT(*) FROM cases WHERE status = 'active'"
        ).fetchone()[0]
        return {
            "total": total,
            "felonies": felonies,
            "misdemeanors": misdemeanors,
            "active": active,
        }


def insert_cases(cases: list[dict]):
    """Bulk insert cases."""
    with get_db() as conn:
        for c in cases:
            conn.execute("""
                INSERT OR REPLACE INTO cases (
                    case_number, defendant_name, charges, severity, status,
                    court, judge, prosecutor, next_hearing_date, hearing_type,
                    filing_date, arrest_date, evidence_summary, notes,
                    attorney_notes, plea_offer, plea_offer_details, disposition,
                    arresting_officer, precinct, witnesses, prior_record,
                    bond_status, created_at, updated_at
                ) VALUES (
                    :case_number, :defendant_name, :charges, :severity, :status,
                    :court, :judge, :prosecutor, :next_hearing_date, :hearing_type,
                    :filing_date, :arrest_date, :evidence_summary, :notes,
                    :attorney_notes, :plea_offer, :plea_offer_details, :disposition,
                    :arresting_officer, :precinct, :witnesses, :prior_record,
                    :bond_status, :created_at, :updated_at
                )
            """, c)


def clear_cases():
    with get_db() as conn:
        conn.execute("DELETE FROM cases")
        conn.execute("DELETE FROM alerts")
        conn.execute("DELETE FROM connections")
        conn.execute("DELETE FROM analysis_log")
        conn.execute("DELETE FROM evidence")


# --- Alert Operations ---

def get_alerts(include_dismissed=False) -> list[dict]:
    with get_db() as conn:
        if include_dismissed:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY "
                "CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, "
                "created_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE dismissed = 0 ORDER BY "
                "CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, "
                "created_at DESC"
            ).fetchall()
        return [_row_to_dict(r) for r in rows]


def insert_alerts(alerts: list[dict]):
    with get_db() as conn:
        for a in alerts:
            conn.execute("""
                INSERT INTO alerts (
                    case_id, case_number, alert_type, severity,
                    title, message, details, created_at
                ) VALUES (
                    :case_id, :case_number, :alert_type, :severity,
                    :title, :message, :details, :created_at
                )
            """, a)


def dismiss_alert(alert_id: int):
    with get_db() as conn:
        conn.execute("UPDATE alerts SET dismissed = 1 WHERE id = ?", (alert_id,))


def clear_alerts():
    with get_db() as conn:
        conn.execute("DELETE FROM alerts")


# --- Connection Operations ---

def get_connections() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM connections ORDER BY confidence DESC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def insert_connections(connections: list[dict]):
    with get_db() as conn:
        for c in connections:
            conn.execute("""
                INSERT INTO connections (
                    case_numbers, connection_type, title,
                    description, confidence, actionable, created_at
                ) VALUES (
                    :case_numbers, :connection_type, :title,
                    :description, :confidence, :actionable, :created_at
                )
            """, c)


def clear_connections():
    with get_db() as conn:
        conn.execute("DELETE FROM connections")


# --- Evidence Operations ---

def get_evidence(case_number: str) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM evidence WHERE case_number = ? ORDER BY date_collected",
            (case_number,)
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def insert_evidence(items: list[dict]):
    with get_db() as conn:
        for e in items:
            conn.execute("""
                INSERT INTO evidence (
                    case_number, evidence_type, title, description,
                    file_path, source, date_collected, created_at
                ) VALUES (
                    :case_number, :evidence_type, :title, :description,
                    :file_path, :source, :date_collected, :created_at
                )
            """, e)


# --- Analysis Log ---

def log_analysis(analysis_type: str, scope: str, thinking: str,
                 result: dict, tokens: int, created_at: str):
    with get_db() as conn:
        conn.execute("""
            INSERT INTO analysis_log (
                analysis_type, scope, thinking_text,
                result_json, token_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (analysis_type, scope, thinking, json.dumps(result), tokens, created_at))


def get_prior_insights(case_number: str = None, limit: int = 10) -> list[dict]:
    """Retrieve prior analysis insights to feed into new analyses.

    If case_number is provided, returns analyses relevant to that case.
    Otherwise returns all recent analyses.
    """
    with get_db() as conn:
        if case_number:
            rows = conn.execute("""
                SELECT analysis_type, scope, result_json, created_at
                FROM analysis_log
                WHERE scope LIKE ? OR scope = 'full_caseload'
                ORDER BY created_at DESC LIMIT ?
            """, (f"%{case_number}%", limit)).fetchall()
        else:
            rows = conn.execute("""
                SELECT analysis_type, scope, result_json, created_at
                FROM analysis_log
                ORDER BY created_at DESC LIMIT ?
            """, (limit,)).fetchall()
        return [dict(r) for r in rows]


def build_memory_context(case_number: str = None) -> str:
    """Build a context string from prior analyses for AI memory.

    Returns a summary of previous findings that the AI can reference.
    """
    insights = get_prior_insights(case_number, limit=5)
    if not insights:
        return ""

    parts = ["\n# PRIOR ANALYSIS MEMORY — Findings from earlier in this session\n"]
    for i, ins in enumerate(insights, 1):
        result = json.loads(ins.get("result_json", "{}"))
        analysis_type = ins["analysis_type"].replace("_", " ").title()
        scope = ins.get("scope", "unknown")

        summary_lines = [f"## Prior Analysis #{i}: {analysis_type} ({scope})"]

        # Extract key findings based on analysis type
        if isinstance(result, dict):
            if "alerts" in result:
                alerts = result["alerts"]
                critical = [a for a in alerts if a.get("severity") == "critical"]
                if critical:
                    summary_lines.append(f"- Found {len(critical)} CRITICAL alerts")
                    for a in critical[:3]:
                        summary_lines.append(f"  - {a.get('title', '')}: {a.get('message', '')[:150]}")
            if "connections" in result:
                for c in result.get("connections", [])[:3]:
                    summary_lines.append(f"- Connection: {c.get('title', '')} (confidence: {c.get('confidence', 0):.0%})")
            if "executive_summary" in result:
                summary_lines.append(f"- Summary: {str(result['executive_summary'])[:200]}")
            if "prosecution_strength_score" in result:
                summary_lines.append(f"- Prosecution strength: {result['prosecution_strength_score']}/100")
            if "plea_recommendation" in result:
                plea = result["plea_recommendation"]
                if isinstance(plea, dict):
                    summary_lines.append(f"- Plea recommendation: {plea.get('recommendation', 'unknown')}")
            if "priority_actions" in result:
                for pa in result.get("priority_actions", [])[:3]:
                    summary_lines.append(f"- Priority: {pa.get('action', pa.get('title', ''))}")

        parts.append("\n".join(summary_lines))

    return "\n\n".join(parts) + "\n"


# --- Caseload Summary for AI Context ---

def build_caseload_context() -> str:
    """Build the full caseload summary for the 1M context window.

    This is the key function that feeds ALL cases into Claude's context
    for cross-case intelligence analysis.
    """
    cases = get_all_cases()
    if not cases:
        return "No cases loaded."

    parts = [f"# FULL CASELOAD — {len(cases)} Active Cases\n"]

    for c in cases:
        charges = json.loads(c["charges"]) if isinstance(c["charges"], str) else c["charges"]
        charge_str = ", ".join(charges) if charges else "Unknown"
        witnesses = json.loads(c["witnesses"]) if isinstance(c["witnesses"], str) else c["witnesses"]
        witness_str = ", ".join(witnesses) if witnesses else "None listed"

        parts.append(f"## Case {c['case_number']}: {c['defendant_name']}")
        parts.append(f"Charges: {charge_str}")
        parts.append(f"Severity: {c['severity']} | Status: {c['status']}")
        parts.append(f"Court: {c['court']} | Judge: {c['judge']} | Prosecutor: {c['prosecutor']}")
        if c.get("next_hearing_date"):
            parts.append(f"Next Hearing: {c['next_hearing_date']} ({c.get('hearing_type', 'TBD')})")
        parts.append(f"Filing: {c['filing_date']} | Arrest: {c['arrest_date']}")
        parts.append(f"Arresting Officer: {c['arresting_officer']} | Precinct: {c['precinct']}")
        if c.get("plea_offer"):
            parts.append(f"Plea Offer: {c['plea_offer']}")
            if c.get("plea_offer_details"):
                parts.append(f"Plea Details: {c['plea_offer_details']}")
        if c.get("bond_status"):
            parts.append(f"Bond: {c['bond_status']}")
        if c.get("prior_record"):
            parts.append(f"Prior Record: {c['prior_record']}")
        parts.append(f"Witnesses: {witness_str}")
        if c.get("evidence_summary"):
            parts.append(f"Evidence: {c['evidence_summary']}")
        if c.get("notes"):
            parts.append(f"Notes: {c['notes']}")
        if c.get("attorney_notes"):
            parts.append(f"Attorney Notes: {c['attorney_notes']}")
        parts.append("")

    return "\n".join(parts)


def build_single_case_context(case_number: str) -> str:
    """Build detailed context for a single case deep-dive."""
    c = get_case(case_number)
    if not c:
        return f"Case {case_number} not found."

    charges = json.loads(c["charges"]) if isinstance(c["charges"], str) else c["charges"]
    witnesses = json.loads(c["witnesses"]) if isinstance(c["witnesses"], str) else c["witnesses"]

    parts = [
        f"# CASE DETAIL: {c['case_number']}",
        f"## Defendant: {c['defendant_name']}",
        f"",
        f"### Charges",
    ]
    for ch in charges:
        parts.append(f"- {ch}")

    parts.extend([
        f"",
        f"### Case Information",
        f"- Severity: {c['severity']}",
        f"- Status: {c['status']}",
        f"- Court: {c['court']}",
        f"- Judge: {c['judge']}",
        f"- Prosecutor: {c['prosecutor']}",
        f"- Filing Date: {c['filing_date']}",
        f"- Arrest Date: {c['arrest_date']}",
        f"- Arresting Officer: {c['arresting_officer']}",
        f"- Precinct: {c['precinct']}",
        f"- Bond Status: {c.get('bond_status', 'N/A')}",
    ])

    if c.get("next_hearing_date"):
        parts.append(f"- Next Hearing: {c['next_hearing_date']} ({c.get('hearing_type', 'TBD')})")

    if c.get("plea_offer"):
        parts.extend([
            f"",
            f"### Plea Offer",
            f"{c['plea_offer']}",
        ])
        if c.get("plea_offer_details"):
            parts.append(c["plea_offer_details"])

    if c.get("prior_record"):
        parts.extend([f"", f"### Prior Record", c["prior_record"]])

    if witnesses:
        parts.extend([f"", f"### Witnesses"])
        for w in witnesses:
            parts.append(f"- {w}")

    if c.get("evidence_summary"):
        parts.extend([f"", f"### Evidence Summary", c["evidence_summary"]])

    if c.get("notes"):
        parts.extend([f"", f"### Case Notes", c["notes"]])

    if c.get("attorney_notes"):
        parts.extend([f"", f"### Attorney Notes", c["attorney_notes"]])

    # Include evidence items
    evidence = get_evidence(case_number)
    if evidence:
        parts.extend([f"", f"### Evidence Items"])
        for e in evidence:
            parts.append(f"- [{e['evidence_type']}] {e['title']}: {e['description']}")
            if e.get('source'):
                parts.append(f"  Source: {e['source']}")

    return "\n".join(parts)


def _row_to_dict(row) -> dict:
    if row is None:
        return {}
    return dict(row)
