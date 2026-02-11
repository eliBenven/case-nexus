"""Case Nexus — AI-Powered Legal Caseload Intelligence

Flask + SocketIO server that orchestrates caseload analysis
with streaming extended thinking from Claude Opus 4.6.

Four analysis modes:
1. Caseload Health Check (1M context, all cases at once)
2. Deep Case Analysis (single case strategy)
3. Adversarial Simulation (prosecution vs defense debate)
4. Motion Generation (128K output)
"""

import threading
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

import ai_engine
import courtlistener
import database as db
from demo_data import generate_demo_caseload, generate_demo_evidence

app = Flask(__name__)
app.config["SECRET_KEY"] = "case-nexus-legal-intelligence"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")


# --- Routes ---

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/stats")
def api_stats():
    """Get caseload summary statistics."""
    counts = db.get_case_count()
    alerts = db.get_alerts()
    connections = db.get_connections()
    return jsonify({
        "cases": counts,
        "alert_count": len(alerts),
        "critical_alerts": sum(1 for a in alerts if a["severity"] == "critical"),
        "connection_count": len(connections),
    })


@app.route("/api/cases")
def api_cases():
    """Get all cases (summary list)."""
    cases = db.get_all_cases()
    return jsonify(cases)


@app.route("/api/case/<case_number>")
def api_case(case_number):
    """Get single case detail."""
    case = db.get_case(case_number)
    if not case:
        return jsonify({"error": "Case not found"}), 404
    return jsonify(case)


@app.route("/api/alerts")
def api_alerts():
    """Get all active alerts."""
    return jsonify(db.get_alerts())


@app.route("/api/connections")
def api_connections():
    """Get all cross-case connections."""
    return jsonify(db.get_connections())


@app.route("/api/evidence/<case_number>")
def api_evidence(case_number):
    """Get evidence items for a case."""
    return jsonify(db.get_evidence(case_number))


# --- SocketIO Events ---

@socketio.on("connect")
def handle_connect():
    print(f"[Case Nexus] Client connected: {request.sid}")


@socketio.on("load_demo_caseload")
def handle_load_demo():
    """Load the demo caseload of 187 cases into SQLite."""
    emit("status", {"message": "Generating caseload...", "phase": "loading"})

    db.clear_cases()
    cases = generate_demo_caseload()
    db.insert_cases(cases)
    evidence = generate_demo_evidence()
    db.insert_evidence(evidence)

    counts = db.get_case_count()
    emit("caseload_loaded", {
        "total": counts["total"],
        "felonies": counts["felonies"],
        "misdemeanors": counts["misdemeanors"],
        "active": counts["active"],
        "message": f"Loaded {counts['total']} cases ({counts['felonies']} felonies, {counts['misdemeanors']} misdemeanors)",
    })


@socketio.on("run_health_check")
def handle_health_check():
    """Run full caseload health check — the hero feature.

    Loads ALL cases into the 1M context window and uses extended
    thinking to scan for risks, connections, and opportunities.
    """
    sid = request.sid
    emit("status", {"message": "Preparing caseload for analysis...", "phase": "health_check"})

    def run():
        caseload_context = db.build_caseload_context()
        context_tokens = len(caseload_context) // 4  # rough estimate

        socketio.emit("status", {
            "message": f"Loading {context_tokens:,} tokens into Opus 4.6 context window...",
            "phase": "health_check",
            "context_tokens": context_tokens,
        }, to=sid)

        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_health_check(
            caseload_context=caseload_context,
            emit_callback=emit_cb,
        )

        if result.get("success") and result.get("parsed"):
            parsed = result["parsed"]

            # Store alerts in database
            db.clear_alerts()
            now = datetime.now().isoformat()
            alert_records = []
            for a in parsed.get("alerts", []):
                alert_records.append({
                    "case_id": None,
                    "case_number": a.get("case_number", ""),
                    "alert_type": a.get("alert_type", "strategy"),
                    "severity": a.get("severity", "info"),
                    "title": a.get("title", ""),
                    "message": a.get("message", ""),
                    "details": a.get("details", ""),
                    "created_at": now,
                })
            if alert_records:
                db.insert_alerts(alert_records)

            # Store connections
            db.clear_connections()
            conn_records = []
            for c in parsed.get("connections", []):
                conn_records.append({
                    "case_numbers": json.dumps(c.get("case_numbers", [])),
                    "connection_type": c.get("connection_type", ""),
                    "title": c.get("title", ""),
                    "description": c.get("description", ""),
                    "confidence": c.get("confidence", 0.0),
                    "actionable": c.get("actionable", ""),
                    "created_at": now,
                })
            if conn_records:
                db.insert_connections(conn_records)

            # Log analysis
            db.log_analysis(
                "health_check", "full_caseload",
                result.get("thinking", ""),
                parsed, context_tokens, now
            )

            socketio.emit("health_check_results", {
                "alerts": parsed.get("alerts", []),
                "connections": parsed.get("connections", []),
                "priority_actions": parsed.get("priority_actions", []),
                "caseload_insights": parsed.get("caseload_insights", {}),
                "thinking_length": len(result.get("thinking", "")),
                "context_tokens": context_tokens,
            }, to=sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Health check failed"),
                "phase": "health_check",
            }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("run_deep_analysis")
def handle_deep_analysis(data):
    """Deep-dive analysis of a single case."""
    case_number = data.get("case_number")
    if not case_number:
        emit("analysis_error", {"error": "No case number provided"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Analyzing {case_number} in depth...",
        "phase": "deep_analysis"
    })

    def run():
        case_context = db.build_single_case_context(case_number)
        # Also include full caseload for cross-referencing
        caseload_context = db.build_caseload_context()

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_deep_analysis(
            case_context=case_context,
            caseload_context=caseload_context,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            socketio.emit("deep_analysis_results", {
                "case_number": case_number,
                "analysis": result.get("parsed") or result.get("response", ""),
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Analysis failed"),
                "phase": "deep_analysis",
                "case_number": case_number,
            }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("run_adversarial")
def handle_adversarial(data):
    """Run prosecution vs defense adversarial simulation."""
    case_number = data.get("case_number")
    if not case_number:
        emit("analysis_error", {"error": "No case number provided"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Starting adversarial simulation for {case_number}...",
        "phase": "adversarial"
    })

    def run():
        case_context = db.build_single_case_context(case_number)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_adversarial_simulation(
            case_context=case_context,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            socketio.emit("adversarial_results", {
                "case_number": case_number,
                "prosecution": result.get("prosecution", {}).get("response", ""),
                "defense": result.get("defense", {}).get("response", ""),
                "judge": result.get("judge", {}).get("response", ""),
                "prosecution_thinking": len(result.get("prosecution", {}).get("thinking", "")),
                "defense_thinking": len(result.get("defense", {}).get("thinking", "")),
                "judge_thinking": len(result.get("judge", {}).get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Adversarial simulation failed"),
                "phase": "adversarial",
                "case_number": case_number,
            }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("generate_motion")
def handle_generate_motion(data):
    """Generate a legal motion using 128K output."""
    case_number = data.get("case_number")
    motion_type = data.get("motion_type", "Motion to Suppress Evidence")
    if not case_number:
        emit("analysis_error", {"error": "No case number provided"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Drafting {motion_type} for {case_number}...",
        "phase": "motion"
    })

    def run():
        case_context = db.build_single_case_context(case_number)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.generate_motion(
            case_context=case_context,
            motion_type=motion_type,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            motion_text = result.get("response", "")
            socketio.emit("motion_results", {
                "case_number": case_number,
                "motion_type": motion_type,
                "motion_text": motion_text,
                "thinking_length": len(result.get("thinking", "")),
                "motion_length": len(motion_text),
            }, to=sid)

            # Auto-verify citations in the generated motion
            _verify_motion_citations(motion_text, case_number, sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Motion generation failed"),
                "phase": "motion",
                "case_number": case_number,
            }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("dismiss_alert")
def handle_dismiss_alert(data):
    alert_id = data.get("alert_id")
    if alert_id:
        db.dismiss_alert(alert_id)
        emit("alert_dismissed", {"alert_id": alert_id})


# --- Citation Verification ---

def _verify_motion_citations(motion_text: str, case_number: str, sid: str):
    """Verify citations in a generated motion via CourtListener API."""
    socketio.emit("citation_verification_started", {
        "case_number": case_number,
        "status": "Verifying citations against CourtListener...",
    }, to=sid)

    # First try local regex extraction as a quick preview
    local_cites = courtlistener.extract_citations_local(motion_text)

    # Then hit the CourtListener API for authoritative verification
    result = courtlistener.verify_citations(motion_text)

    socketio.emit("citation_verification_results", {
        "case_number": case_number,
        "verified": result.get("verified", []),
        "not_found": result.get("not_found", []),
        "ambiguous": result.get("ambiguous", []),
        "total_found": result.get("total_found", 0),
        "verified_count": result.get("verified_count", 0),
        "local_citations": local_cites,
        "error": result.get("error"),
    }, to=sid)


@socketio.on("verify_citations")
def handle_verify_citations(data):
    """Standalone citation verification for any text."""
    text = data.get("text", "")
    case_number = data.get("case_number", "")
    if not text:
        emit("citation_verification_results", {
            "error": "No text provided",
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": 0, "verified_count": 0, "local_citations": [],
        })
        return

    sid = request.sid

    def run():
        _verify_motion_citations(text, case_number, sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("analyze_evidence")
def handle_analyze_evidence(data):
    """Analyze an evidence image using Opus 4.6 vision."""
    case_number = data.get("case_number", "")
    evidence_id = data.get("evidence_id")
    if not case_number or not evidence_id:
        emit("evidence_analysis_error", {"error": "Missing case number or evidence ID"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Analyzing evidence for {case_number}...",
        "phase": "evidence_analysis"
    })

    def run():
        # Get the evidence item and case context
        evidence_items = db.get_evidence(case_number)
        evidence_item = None
        for e in evidence_items:
            if e["id"] == evidence_id:
                evidence_item = e
                break

        if not evidence_item:
            socketio.emit("evidence_analysis_error", {
                "error": "Evidence item not found"
            }, to=sid)
            return

        case_context = db.build_single_case_context(case_number)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            payload["evidence_id"] = evidence_id
            socketio.emit(event, payload, to=sid)

        result = ai_engine.analyze_evidence(
            case_context=case_context,
            evidence_item=evidence_item,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            socketio.emit("evidence_analysis_results", {
                "case_number": case_number,
                "evidence_id": evidence_id,
                "analysis": result.get("response", ""),
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("evidence_analysis_error", {
                "error": result.get("error", "Evidence analysis failed"),
                "case_number": case_number,
                "evidence_id": evidence_id,
            }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


@socketio.on("search_case_law")
def handle_search_case_law(data):
    """Search CourtListener for relevant case law."""
    query = data.get("query", "")
    court = data.get("court", "ga")
    if not query:
        emit("case_law_results", {"results": [], "error": "No query provided"})
        return

    sid = request.sid

    def run():
        results = courtlistener.search_opinions(query, court=court, max_results=5)
        socketio.emit("case_law_results", {
            "query": query,
            "court": court,
            "results": results,
        }, to=sid)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()


# --- Initialize ---

db.init_db()

if __name__ == "__main__":
    print("\n  Case Nexus — AI-Powered Legal Caseload Intelligence")
    print("  Powered by Claude Opus 4.6 Extended Thinking")
    print("  http://localhost:5001\n")
    socketio.run(app, host="0.0.0.0", port=5001, debug=True, allow_unsafe_werkzeug=True)
