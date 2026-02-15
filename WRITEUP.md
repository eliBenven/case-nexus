# Case Nexus — Hackathon Submission

## Track: Amplify Human Judgment

---

## Summary (for submission form)

Public defenders carry 400–700 cases. They walk into court with minutes to prepare. A 4th Amendment pattern across four separate cases goes unnoticed because no human can hold 500 files in their head at once.

Case Nexus loads an entire 500-case caseload — 275,000+ tokens — into Claude Opus 4.6's million-token context window and autonomously investigates it. The Cascade Intelligence feature gives Claude 9 tools (case lookup, statute search, AI-powered case law search via web search, cross-case pattern detection) and lets it decide what to investigate across up to 8 rounds, all with extended thinking streaming to the UI in real-time. The adversarial simulation chains three separate reasoning sessions — prosecution, defense, judicial analysis — generating 80,000+ tokens of visible reasoning. Every analysis mode streams Claude's thinking live, turning the AI from a black box into a transparent co-counsel whose reasoning the attorney can supervise and challenge.

Built with: 1M context window, extended thinking + tool use, 128K output, multimodal vision, sequential reasoning chains. ~20,000 lines of code. No RAG, no chunking — the AI sees everything at once. Even the demo video was built programmatically with Claude Code using Remotion — zero manual editing.

---

## One-Liner

Case Nexus is an AI co-counsel that loads a public defender's entire 500-case caseload into Claude Opus 4.6's context window and autonomously investigates it — finding buried risks, cross-case patterns, and legal strategies that no human could spot across that volume.

---

## The Problem

Public defenders in Georgia carry 400–700 active cases. They walk into court with minutes to prepare. A speedy trial deadline buried in case #347 can mean a client sits in jail for months. A pattern of unconstitutional stops by the same officer across four separate cases goes unnoticed because no human can hold 500 case files in their head simultaneously.

This isn't a technology problem — it's a cognitive bandwidth problem. The information exists. The legal strategies exist. But the sheer volume makes it impossible for one attorney to connect the dots.

## The Solution

Case Nexus transforms Claude Opus 4.6 into an autonomous legal investigator that sees everything at once.

**Load the entire caseload.** All 500 cases — charges, witnesses, evidence, prior records, hearing dates, plea offers — go into a single prompt. That's 275,000+ tokens of structured legal data filling Opus 4.6's 1M context window.

**Let Claude investigate autonomously.** The Cascade Intelligence feature gives Claude 9 tools (case lookup, statute search, case law search via web search, alert checking, cross-case pattern detection) and lets it decide what to investigate. Claude calls tools in a multi-turn loop — pulling specific cases, looking up Georgia statutes, searching for relevant precedent — all with extended thinking visible in real-time.

**Watch the reasoning.** Every analysis streams Claude's extended thinking to the UI in real-time. You see the AI weighing evidence, considering constitutional issues, and forming strategy — not just the final answer. The attorney can evaluate the reasoning, not just trust the output.

## What It Does

### 9 AI Analysis Modes

| Mode | What It Does | Opus 4.6 Feature |
|------|-------------|-------------------|
| **Cascade Intelligence** | Autonomous multi-turn investigation with 9 tools | Tool use + extended thinking |
| **Caseload Health Check** | Scans ALL 500 cases for risks, connections, plea disparities | 1M context window (275K+ tokens) |
| **Deep Case Analysis** | Individual defense strategy with strength assessment | Extended thinking (40K budget) |
| **Adversarial Simulation** | Prosecution builds case → Defense dismantles → Judge synthesizes | 3-phase chained reasoning (80K+ thinking) |
| **Motion Generation** | Court-ready motions with Georgia formatting and real citations | 128K output (64K response) |
| **Evidence Analysis** | Forensic analysis of evidence photos, surveillance, documents | Multimodal vision |
| **Caseload Chat** | Conversational Q&A across all 500 cases | 1M context + multi-turn |
| **Hearing Prep Brief** | 30-second brief for walking into court | Fast extended thinking |
| **Client Letter** | Plain-language letter explaining case status | Empathetic generation |

### Autonomous Agent (Tool Use)

The Cascade Intelligence feature is the centerpiece. Claude receives 9 tools and autonomously decides what to investigate:

- `get_case` / `get_case_context` — Pull any case from the 500-case caseload
- `get_legal_context` — Look up Georgia statutes (O.C.G.A.) and federal law
- `get_alerts` — Check for deadline risks and red flags
- `get_connections` — Find cross-case patterns (same officer, shared witnesses)
- `get_prior_analyses` — Recall previous AI analysis results
- `search_case_law` — Search the web for relevant case law
- `verify_citations` — Verify legal citations via AI web search
- `search_precedents_for_charges` — Find charge-specific precedent

Claude calls these tools across up to 8 rounds of investigation, all with extended thinking active. The UI shows each tool call in real-time — you watch Claude decide to pull a case, look up a statute, then search for precedent, building its analysis iteratively.

### Real Legal Data

- **59 Georgia statutes** (O.C.G.A.) with full statutory text from official sources
- **8,952 federal code sections** (USC) indexed and searchable
- **Constitutional provisions** (4th, 5th, 6th, 8th, 14th Amendments) with key holdings
- **Landmark case summaries** (Miranda, Brady, Batson, Strickland, etc.)
- **AI-powered web search** for real-time case law search and citation verification

## How Opus 4.6 Is Used

This project is built as a thesis on Claude Opus 4.6's capabilities:

1. **1M Context Window** — 275K+ tokens of caseload data loaded in a single prompt. No RAG, no chunking, no summarization. The AI sees every case simultaneously.

2. **Extended Thinking** — Every analysis mode uses thinking budgets from 10K to 60K tokens, all streamed to the UI in real-time via WebSocket. The attorney watches the reasoning happen.

3. **Tool Use with Extended Thinking** — The Cascade Intelligence feature combines tool use with extended thinking (requires `tool_choice: "auto"`). Claude thinks deeply about what to investigate, calls tools, thinks about the results, calls more tools — a genuine agentic loop.

4. **128K Output** — Motion generation uses up to 64K response tokens for comprehensive, court-formatted legal documents with proper Georgia jurisdiction formatting.

5. **Multimodal Vision** — Evidence images (surveillance footage, injury photos, crime scene photos) are analyzed using Opus 4.6's vision capabilities with extended thinking.

6. **Streaming** — All AI operations stream thinking and response deltas via Flask-SocketIO for real-time UX. The user never stares at a loading spinner.

7. **Sequential Reasoning Chains** — The adversarial simulation chains three separate extended thinking sessions, each building on the previous phase's output: prosecution → defense → judicial analysis.

## Tech Stack

- **Backend**: Python 3, Flask, Flask-SocketIO (WebSocket streaming)
- **AI**: Claude Opus 4.6 via Anthropic SDK v0.52.0 (streaming, extended thinking, tool use, multimodal)
- **Database**: SQLite with WAL mode, per-call connections for thread safety
- **Frontend**: Vanilla JS, marked.js (markdown rendering), DOMPurify (XSS prevention)
- **Citation Verification**: Claude Opus 4.6 + web search (no external API keys needed)
- **Legal Corpus**: 59 GA statutes, 8,952 USC sections, constitutional provisions, landmark cases

~20,000 lines of code across 20+ source files. The core app is a Flask server with vanilla JS — no React, no build step, no framework overhead. The demo video is a separate Remotion project (3,200+ lines of TypeScript/React) built entirely with Claude Code — every scene, animation, and title card generated programmatically.

## Why This Amplifies Human Judgment

Case Nexus doesn't replace the attorney. It amplifies what they can see.

A public defender already knows the law. They know defense strategy. What they can't do is hold 500 cases in their head at once and spot the pattern where Officer Rodriguez's four traffic stops all have contested vehicle searches — a pattern that could invalidate evidence across multiple cases.

The extended thinking stream is the key design decision. By showing Claude's reasoning in real-time, the attorney can evaluate the analysis as it forms. They see when the AI weighs evidence correctly and when it misses something. The thinking stream turns Claude from a black box into a transparent co-counsel whose reasoning the attorney can supervise, challenge, and build upon.

The adversarial simulation makes this concrete: the attorney watches the prosecution build its strongest case, then watches the defense dismantle it, then reads a judicial synthesis — three perspectives on the same facts, each with visible reasoning chains. The attorney's judgment is amplified by seeing the case from angles they might not have considered.

## Setup

```bash
git clone https://github.com/eliBenven/case-nexus.git
cd case-nexus
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=your-key-here" > .env
python app.py
```

Open `http://localhost:5001` → Click **Sync Caseload** → 500 cases load in seconds.

## Demo Data

500 realistic Georgia criminal cases including 15 hand-crafted cases with planted cross-connections:
- **Officer Rodriguez pattern**: 4 cases with the same officer, contested vehicle searches, potential 4th Amendment violations
- **Speedy trial risks**: Cases approaching Georgia's 180-day (felony) and 90-day (misdemeanor) limits
- **Plea disparities**: Similar assault cases with dramatically different plea offers
- **Shared witness/defendant overlap**: James Patterson is a witness in one case and defendant in another
- **Detective Harris**: 3 cases with IAB complaint and excessive force allegations
- **Closed cases**: Dismissed cases with documented outcomes for reference

These patterns are designed for the AI to discover autonomously during health checks and cascade investigations.
