"""Case Nexus — AI-Powered Legal Caseload Intelligence

Flask + SocketIO server that orchestrates caseload analysis
with streaming extended thinking from Claude Opus 4.6.

Four analysis modes:
1. Caseload Health Check (1M context, all cases at once)
2. Deep Case Analysis (single case strategy)
3. Adversarial Simulation (prosecution vs defense debate)
4. Motion Generation (128K output)
"""

import os
import threading
import traceback
import json
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

import ai_engine
import courtlistener
import database as db
import legal_corpus
from demo_data import generate_demo_caseload, generate_demo_evidence

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "case-nexus-legal-intelligence")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Global token usage tracker — cumulative across ALL Opus 4.6 calls
_token_lock = threading.Lock()
token_usage = {
    "total_input": 0,
    "total_output": 0,
    "total_thinking": 0,
    "call_count": 0,
}


def track_tokens(result, sid):
    """Update global token counter and emit to client."""
    with _token_lock:
        usage = result.get("usage", {})
        if usage:
            token_usage["total_input"] += usage.get("input_tokens", 0)
            token_usage["total_output"] += usage.get("output_tokens", 0)
        token_usage["total_thinking"] += len(result.get("thinking", "")) // 4
        token_usage["call_count"] += 1
    socketio.emit("token_update", token_usage, to=sid)


def emit_input_estimate(text_length, sid):
    """Emit an estimated input token count so the viz ticks up immediately.

    This adds a rough estimate to total_input. When track_tokens fires
    later with the real API usage, it adds the actual input_tokens on top.
    The slight over-count is fine — it makes the viz feel more dramatic.
    """
    est = text_length // 3  # conservative: legal text ≈ 3 chars/token
    with _token_lock:
        token_usage["total_input"] += est
    socketio.emit("token_update", token_usage, to=sid)


def _start_safe_thread(run_fn, phase, sid):
    """Start a daemon thread with top-level exception handling.

    If run_fn raises, emit analysis_error so the frontend can recover
    instead of leaving the UI frozen with a permanent spinner.
    """
    def wrapper():
        try:
            run_fn()
        except Exception as exc:
            traceback.print_exc()
            socketio.emit("analysis_error", {
                "error": f"Internal error: {exc}",
                "phase": phase,
            }, to=sid)

    threading.Thread(target=wrapper, daemon=True).start()


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


@app.route("/api/upload-evidence/<case_number>", methods=["POST"])
def api_upload_evidence(case_number):
    """Upload an evidence photo for a case."""
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    # Validate file type
    allowed = {"png", "jpg", "jpeg", "mp4", "mov", "webm"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        return jsonify({"error": "Supported: PNG, JPG, MP4, MOV, WebM"}), 400

    # Save to static/evidence/
    evidence_dir = os.path.join(app.static_folder, "evidence")
    os.makedirs(evidence_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_case = case_number.replace("/", "_").replace("\\", "_")
    filename = f"{safe_case}_{timestamp}.{ext}"
    filepath = os.path.join(evidence_dir, filename)
    file.save(filepath)

    # Insert into database
    video_exts = {"mp4", "mov", "webm"}
    ev_type = "video" if ext in video_exts else "photograph"
    evidence_record = {
        "case_number": case_number,
        "evidence_type": ev_type,
        "title": file.filename,
        "description": f"Uploaded evidence {ev_type}",
        "file_path": f"/static/evidence/{filename}",
        "source": "User upload",
        "date_collected": datetime.now().isoformat(),
        "created_at": datetime.now().isoformat(),
    }
    db.insert_evidence([evidence_record])

    # Get the inserted ID
    evidence_items = db.get_evidence(case_number)
    new_id = evidence_items[-1]["id"] if evidence_items else None

    return jsonify({
        "success": True,
        "evidence_id": new_id,
        "file_path": f"/static/evidence/{filename}",
    })


@app.route("/api/analysis-log")
def api_analysis_log():
    """Get recent analysis history."""
    limit = request.args.get("limit", 20, type=int)
    return jsonify(db.get_prior_insights(limit=limit))


@app.route("/api/analysis-log/<case_number>")
def api_analysis_log_case(case_number):
    """Get analysis history for a specific case."""
    limit = request.args.get("limit", 10, type=int)
    return jsonify(db.get_prior_insights(case_number=case_number, limit=limit))


# --- SocketIO Events ---

@socketio.on("connect")
def handle_connect():
    print(f"[Case Nexus] Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    chat_histories.pop(sid, None)
    print(f"[Case Nexus] Client disconnected: {sid}")


@socketio.on("load_demo_caseload")
def handle_load_demo():
    """Load the demo caseload into SQLite."""
    emit("status", {"message": "Generating caseload...", "phase": "loading"})

    db.clear_cases()
    cases = generate_demo_caseload()
    db.insert_cases(cases)
    evidence = generate_demo_evidence(cases)
    db.insert_evidence(evidence)

    # Match generated evidence images/videos on disk to DB records
    db.link_evidence_files(os.path.join(os.path.dirname(__file__), "static", "evidence"))

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
        # Include key legal reference (constitutional provisions + landmark cases)
        # but skip full statute text — AI can cite statutes by section number
        corpus_stats = legal_corpus.get_corpus_stats()
        legal_summary = (
            "\n\n# LEGAL REFERENCE\n"
            "## Constitutional Provisions & Key Holdings\n"
        )
        for amend_key, prov in legal_corpus.CONSTITUTIONAL_PROVISIONS.items():
            legal_summary += f"\n### {amend_key} Amendment\n\"{prov['text']}\"\n"
            for holding in prov["key_holdings"]:
                legal_summary += f"- {holding}\n"
        legal_summary += "\n## Landmark Cases\n"
        for name, summary in legal_corpus.LANDMARK_CASES.items():
            legal_summary += f"- **{name}**, {summary}\n"

        full_context = caseload_context + legal_summary
        context_tokens = len(full_context) // 4
        emit_input_estimate(len(full_context), sid)

        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)

        socketio.emit("status", {
            "message": f"Loading {context_tokens:,} tokens into Opus 4.6 context window...",
            "phase": "health_check",
            "context_tokens": context_tokens,
        }, to=sid)

        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_health_check(
            caseload_context=full_context,
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

            track_tokens(result, sid)
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

    _start_safe_thread(run, "analysis", sid)


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
        legal_context = db.build_legal_context(case_number)
        memory_context = db.build_memory_context(case_number)
        emit_input_estimate(len(case_context) + len(legal_context), sid)

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)

        # Feed legal authority and prior insights (skip full caseload — single case focus)
        supplemental = legal_context
        if memory_context:
            supplemental += "\n\n" + memory_context
            socketio.emit("memory_loaded", {
                "case_number": case_number,
                "insight_count": memory_context.count("Prior Analysis #"),
            }, to=sid)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_deep_analysis(
            case_context=case_context,
            caseload_context=supplemental,
            emit_callback=emit_cb,
            agentic=True,
        )

        if result.get("success"):
            track_tokens(result, sid)
            # Log for memory (always store response text for persistence)
            analysis = result.get("parsed") or result.get("response", "")
            log_data = analysis if isinstance(analysis, dict) else {"response_text": str(analysis)}
            # Ensure response_text is always present for restore
            if isinstance(log_data, dict) and "response_text" not in log_data:
                log_data["response_text"] = result.get("response", "")
            db.log_analysis("deep_analysis", case_number,
                            result.get("thinking", ""),
                            log_data,
                            0, datetime.now().isoformat())
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

    _start_safe_thread(run, "analysis", sid)


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
        legal_context = db.build_legal_context(case_number)
        full_context = case_context + "\n\n" + legal_context

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)
        emit_input_estimate(len(full_context), sid)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_adversarial_simulation(
            case_context=full_context,
            emit_callback=emit_cb,
            agentic=True,
        )

        if result.get("success"):
            for phase in ("prosecution", "defense", "judge"):
                phase_data = result.get(phase, {})
                if phase_data:
                    track_tokens(phase_data, sid)
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

    _start_safe_thread(run, "analysis", sid)


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
        legal_context = db.build_legal_context(case_number)
        full_context = case_context + "\n\n" + legal_context

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)
        emit_input_estimate(len(full_context), sid)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.generate_motion(
            case_context=full_context,
            motion_type=motion_type,
            emit_callback=emit_cb,
            agentic=True,
        )

        if result.get("success"):
            track_tokens(result, sid)
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

    _start_safe_thread(run, "analysis", sid)


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

    _start_safe_thread(run, "analysis", sid)


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
        emit_input_estimate(len(case_context), sid)

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
            track_tokens(result, sid)
            response_text = result.get("response", "")
            usage = result.get("usage") or {}
            db.log_analysis("evidence_analysis", case_number,
                            result.get("thinking", ""),
                            {"response_text": response_text},
                            usage.get("input_tokens", 0) if isinstance(usage, dict) else 0,
                            datetime.now().isoformat())
            socketio.emit("evidence_analysis_results", {
                "case_number": case_number,
                "evidence_id": evidence_id,
                "analysis": response_text,
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("evidence_analysis_error", {
                "error": result.get("error", "Evidence analysis failed"),
                "case_number": case_number,
                "evidence_id": evidence_id,
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


# --- Chat History (per-session) ---
chat_histories = {}  # sid -> list of {role, content}


@socketio.on("chat_message")
def handle_chat_message(data):
    """Handle a caseload chat message — loads ALL cases into context."""
    message = data.get("message", "").strip()
    if not message:
        emit("chat_error", {"error": "Empty message"})
        return

    sid = request.sid
    emit("status", {"message": "Thinking about your caseload...", "phase": "chat"})

    # Initialize chat history for this session
    if sid not in chat_histories:
        chat_histories[sid] = []

    def run():
        caseload_context = db.build_caseload_context()

        # Use lightweight legal summary (full corpus exceeds 200K token limit)
        legal_summary = (
            "\n\n# LEGAL REFERENCE\n"
            "## Constitutional Provisions & Key Holdings\n"
        )
        for amend_key, prov in legal_corpus.CONSTITUTIONAL_PROVISIONS.items():
            legal_summary += f"\n### {amend_key} Amendment\n\"{prov['text']}\"\n"
            for holding in prov["key_holdings"]:
                legal_summary += f"- {holding}\n"
        legal_summary += "\n## Landmark Cases\n"
        for name, summary in legal_corpus.LANDMARK_CASES.items():
            legal_summary += f"- **{name}**, {summary}\n"
        legal_summary += "\nUse get_statute tool to look up specific statutory text as needed.\n"
        caseload_context = caseload_context + "\n\n" + legal_summary
        emit_input_estimate(len(caseload_context), sid)

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)

        history = chat_histories.get(sid, [])

        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_chat(
            caseload_context=caseload_context,
            message=message,
            chat_history=history if history else None,
            emit_callback=emit_cb,
            agentic=True,
        )

        if result.get("context_reset"):
            # Context exceeded 1M tokens — wipe chat history and reload
            chat_histories.pop(sid, None)
            socketio.emit("chat_error", {
                "error": "Context window full — chat history cleared. Please resend your message.",
            }, to=sid)
            socketio.emit("chat_cleared", {}, to=sid)
        elif result.get("success"):
            track_tokens(result, sid)
            # Store in chat history
            if sid not in chat_histories:
                chat_histories[sid] = []
            # On first message, include caseload context
            if not history:
                chat_histories[sid].append({
                    "role": "user",
                    "content": caseload_context + "\n\n---\n\nThe attorney asks: " + message,
                })
            else:
                chat_histories[sid].append({"role": "user", "content": message})
            chat_histories[sid].append({
                "role": "assistant",
                "content": result.get("response", ""),
            })

            # Keep history manageable (last 10 exchanges)
            if len(chat_histories[sid]) > 20:
                chat_histories[sid] = chat_histories[sid][-20:]

            socketio.emit("chat_results", {
                "response": result.get("response", ""),
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("chat_error", {
                "error": result.get("error", "Chat failed"),
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


@socketio.on("clear_chat")
def handle_clear_chat():
    """Clear chat history for this session."""
    sid = request.sid
    chat_histories.pop(sid, None)
    emit("chat_cleared", {})


@socketio.on("run_hearing_prep")
def handle_hearing_prep(data):
    """Generate a rapid hearing prep brief."""
    case_number = data.get("case_number")
    if not case_number:
        emit("analysis_error", {"error": "No case number provided"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Generating hearing brief for {case_number}...",
        "phase": "hearing_prep"
    })

    def run():
        case_context = db.build_single_case_context(case_number)
        legal_context = db.build_legal_context(case_number)
        case_context = case_context + "\n\n" + legal_context

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)
        emit_input_estimate(len(case_context), sid)

        # Get cases with the same judge for tendency analysis
        case = db.get_case(case_number)
        judge_context = ""
        if case and case.get("judge"):
            all_cases = db.get_all_cases()
            judge_cases = [c for c in all_cases
                          if c.get("judge") == case["judge"]
                          and c["case_number"] != case_number]
            if judge_cases:
                judge_lines = []
                for jc in judge_cases[:10]:  # Limit to 10 for speed
                    charges = jc.get("charges", "[]")
                    judge_lines.append(
                        f"- {jc['case_number']}: {jc.get('defendant_name', '')}, "
                        f"Charges: {charges}, Status: {jc.get('status', '')}"
                    )
                judge_context = "\n".join(judge_lines)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_hearing_prep(
            case_context=case_context,
            caseload_context=judge_context,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            track_tokens(result, sid)
            response_text = result.get("response", "")
            db.log_analysis("hearing_prep", case_number,
                            result.get("thinking", ""),
                            {"response_text": response_text},
                            0, datetime.now().isoformat())
            socketio.emit("hearing_prep_results", {
                "case_number": case_number,
                "brief": response_text,
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Hearing prep failed"),
                "phase": "hearing_prep",
                "case_number": case_number,
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


@socketio.on("run_client_letter")
def handle_client_letter(data):
    """Generate a plain-language client letter."""
    case_number = data.get("case_number")
    if not case_number:
        emit("analysis_error", {"error": "No case number provided"})
        return

    sid = request.sid
    emit("status", {
        "message": f"Writing client letter for {case_number}...",
        "phase": "client_letter"
    })

    def run():
        case_context = db.build_single_case_context(case_number)

        corpus_stats = legal_corpus.get_corpus_stats()
        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)
        emit_input_estimate(len(case_context), sid)

        def emit_cb(event, payload):
            payload["case_number"] = case_number
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_client_letter(
            case_context=case_context,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            track_tokens(result, sid)
            response_text = result.get("response", "")
            db.log_analysis("client_letter", case_number,
                            result.get("thinking", ""),
                            {"response_text": response_text},
                            0, datetime.now().isoformat())
            socketio.emit("client_letter_results", {
                "case_number": case_number,
                "letter": response_text,
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("analysis_error", {
                "error": result.get("error", "Client letter failed"),
                "phase": "client_letter",
                "case_number": case_number,
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


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

    _start_safe_thread(run, "analysis", sid)


# --- Cascade Intelligence (Agentic Tool-Use) ---

@socketio.on("run_cascade")
def handle_cascade():
    """Agentic cascade: Claude autonomously investigates the caseload using tools.

    Instead of a fixed 4-phase pipeline, Claude has tools to pull cases,
    look up statutes, search case law, and check alerts. It decides
    autonomously what to investigate and produces a strategic brief.
    """
    sid = request.sid

    def run():
        # Use compact context for agentic cascade — AI has tools to pull full case details
        caseload_context = db.build_caseload_context(max_chars=200_000)
        # Don't include full legal corpus — AI has tools to look up statutes on demand
        corpus_stats = legal_corpus.get_corpus_stats()
        corpus_summary = (
            f"\n\n# LEGAL CORPUS AVAILABLE (use tools to look up specific statutes)\n"
            f"- {corpus_stats['ga_statutes']} Georgia statutes (O.C.G.A.) loaded\n"
            f"- {corpus_stats['federal_sections']:,} Federal code sections (USC) indexed\n"
            f"- {corpus_stats['amendments']} Constitutional amendments with key holdings\n"
            f"- {corpus_stats['landmark_cases']} Landmark case summaries\n"
            f"Use get_case or get_case_context tools to pull full details for specific cases.\n"
        )
        full_context = caseload_context + corpus_summary

        # Snapshot baseline BEFORE estimate so per-turn actuals replace (not add to) estimate
        with _token_lock:
            baseline_input = token_usage["total_input"]
            baseline_output = token_usage["total_output"]
            baseline_calls = token_usage["call_count"]

        emit_input_estimate(len(full_context), sid)

        socketio.emit("legal_corpus_loaded", corpus_stats, to=sid)

        socketio.emit("cascade_phase", {
            "phase": 1, "total": 1,
            "title": "Autonomous Investigation",
            "description": "AI is autonomously investigating your caseload with tools...",
            "mode": "agentic",
        }, to=sid)

        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        def on_turn_usage(usage):
            """Update token viz after each agentic turn so it ticks up live."""
            with _token_lock:
                token_usage["total_input"] = baseline_input + usage.get("input_tokens", 0)
                token_usage["total_output"] = baseline_output + usage.get("output_tokens", 0)
                token_usage["call_count"] = baseline_calls + 1
            socketio.emit("token_update", token_usage, to=sid)

        result = ai_engine.run_agentic_cascade(
            caseload_context=full_context,
            emit_callback=emit_cb,
            usage_callback=on_turn_usage,
        )

        if result.get("success"):
            # Skip track_tokens for input/output — on_turn_usage already updated those.
            # Only add thinking estimate.
            with _token_lock:
                token_usage["total_thinking"] += len(result.get("thinking", "")) // 4
            socketio.emit("token_update", token_usage, to=sid)

            # Log the analysis
            db.log_analysis(
                "agentic_cascade", "full_caseload",
                result.get("thinking", ""),
                {"response_length": len(result.get("response", ""))},
                len(full_context) // 4,
                datetime.now().isoformat(),
            )

            # Generate smart actions from the cascade output
            action_context = result.get("response", "")
            actions_result = ai_engine.run_smart_actions(
                analysis_context=action_context,
                analysis_type="cascade intelligence",
                emit_callback=emit_cb,
            )

            actions = []
            if actions_result.get("success"):
                track_tokens(actions_result, sid)
                actions = actions_result.get("parsed") or []

            socketio.emit("cascade_complete", {
                "summary": result.get("response", ""),
                "tool_calls": result.get("tool_calls", []),
                "actions": actions,
                "mode": "agentic",
            }, to=sid)
        else:
            socketio.emit("cascade_error", {
                "error": result.get("error", "Agentic cascade failed"),
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


# --- Smart Actions (post-analysis suggestions) ---

@socketio.on("request_smart_actions")
def handle_smart_actions(data):
    """Generate context-aware next actions after any analysis."""
    context = data.get("context", "")
    analysis_type = data.get("analysis_type", "analysis")
    sid = request.sid

    def run():
        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_smart_actions(
            analysis_context=context,
            analysis_type=analysis_type,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            track_tokens(result, sid)
            socketio.emit("smart_actions_results", {
                "actions": result.get("parsed") or [],
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


# --- Custom Dashboard Widget ---

@socketio.on("create_widget")
def handle_create_widget(data):
    """Generate a custom dashboard widget from natural language."""
    request_text = data.get("request", "").strip()
    if not request_text:
        emit("widget_error", {"error": "Empty request"})
        return

    sid = request.sid
    emit("status", {"message": "Building widget...", "phase": "widget"})

    def run():
        caseload_context = db.build_caseload_context()
        emit_input_estimate(len(caseload_context), sid)
        memory_context = db.build_memory_context()

        def emit_cb(event, payload):
            socketio.emit(event, payload, to=sid)

        result = ai_engine.run_custom_widget(
            caseload_context=caseload_context,
            request=request_text,
            memory_context=memory_context,
            emit_callback=emit_cb,
        )

        if result.get("success"):
            track_tokens(result, sid)
            socketio.emit("widget_results", {
                "request": request_text,
                "content": result.get("response", ""),
                "thinking_length": len(result.get("thinking", "")),
            }, to=sid)
        else:
            socketio.emit("widget_error", {
                "error": result.get("error", "Widget generation failed"),
            }, to=sid)

    _start_safe_thread(run, "analysis", sid)


# --- Initialize ---

db.init_db()

if __name__ == "__main__":
    print("\n  Case Nexus — AI-Powered Legal Caseload Intelligence")
    print("  Powered by Claude Opus 4.6 Extended Thinking")
    print("  http://localhost:5001\n")
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5001)),
                 debug=os.environ.get("FLASK_DEBUG", "0") == "1",
                 allow_unsafe_werkzeug=True)
