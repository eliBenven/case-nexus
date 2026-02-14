# Case Nexus

**AI-Powered Legal Caseload Intelligence for Public Defenders**

Built for the *Built with Opus 4.6: a Claude Code Hackathon*

Case Nexus transforms how public defenders manage crushing caseloads. It loads an entire 500-case caseload into Claude Opus 4.6's 1M context window and provides real-time AI analysis — from identifying speedy trial risks across all cases simultaneously, to generating court-ready motions, to simulating adversarial prosecution vs. defense debates.

## What It Does

Public defenders in Georgia carry 400-700 cases. They walk into court with minutes to prepare. Case Nexus gives them an AI co-counsel that sees their entire caseload at once.

### 9 AI Analysis Modes

| Mode | What It Does | Opus 4.6 Feature |
|------|-------------|-------------------|
| **Caseload Health Check** | Scans ALL 500 cases for risks, cross-case connections, plea disparities | 1M context window (275K+ tokens loaded) |
| **Deep Case Analysis** | Defense strategy with strength meter, evidence gaps, constitutional issues | Extended thinking (40K tokens) |
| **Adversarial Simulation** | Prosecution builds case -> Defense dismantles it -> Judge provides synthesis | 80K+ thinking tokens across 3 phases |
| **Motion Generation** | Court-ready legal motions with Georgia formatting and citation verification | 128K output (64K response tokens) |
| **Evidence Analysis** | Forensic analysis of evidence images (photos, surveillance, documents) | Multimodal vision |
| **Caseload Chat** | Ask questions about your entire caseload conversationally | 1M context + multi-turn |
| **Hearing Prep Brief** | 30-second brief for walking into court (judge tendencies included) | Fast extended thinking |
| **Client Letter** | Plain-language letter explaining case status to client | Empathetic generation |
| **Case Law Search** | Search Georgia case law via CourtListener API | External API integration |

### Autonomous Agent with Tool Use

The **Cascade Intelligence** feature transforms Claude from a chatbot into an autonomous investigator. Claude receives 9 tools and decides what to investigate:

| Tool | What Claude Can Do |
|------|--------------------|
| `get_case` | Pull any case from the 500-case caseload |
| `get_case_context` | Get full markdown context for a case |
| `get_legal_context` | Look up Georgia statutes and federal law |
| `get_alerts` | Check for deadline risks and red flags |
| `get_connections` | Find cross-case patterns (same officer, shared witnesses) |
| `get_prior_analyses` | Recall previous AI analysis results |
| `search_case_law` | Search CourtListener for relevant precedent |
| `verify_citations` | Verify legal citations against real databases |
| `search_precedents_for_charges` | Find charge-specific case law |

Claude autonomously calls these tools in a multi-turn loop (up to 8 rounds), deciding what cases to pull, what statutes to check, and what precedents to search for — all visible in a real-time tool timeline.

### Key Technical Features

- **Real-time streaming** — Watch Claude's extended thinking in real-time via WebSocket
- **Live token visualization** — See cumulative token usage across the 1M context window
- **Citation verification** — Auto-verify legal citations against CourtListener database
- **Cross-case intelligence** — AI discovers patterns: same officer in multiple stops, shared witnesses, judge tendencies
- **Adversarial reasoning chains** — Each phase builds on the previous phase's output
- **Agentic tool-use loop** — Claude decides what to investigate using 9 tools with extended thinking

## Tech Stack

- **Backend**: Python, Flask, Flask-SocketIO (WebSocket streaming)
- **AI**: Claude Opus 4.6 via Anthropic SDK (streaming, extended thinking, multimodal)
- **Database**: SQLite with WAL mode
- **Frontend**: Vanilla JS, marked.js (markdown), DOMPurify (XSS prevention)
- **External API**: CourtListener (citation verification, case law search)

## Setup

```bash
# Clone
git clone https://github.com/eliBenven/case-nexus.git
cd case-nexus

# Install dependencies
pip install -r requirements.txt

# Set your API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run
python app.py
```

Open `http://localhost:5001` and click **Sync Caseload** to load 500 demo cases.

## How Opus 4.6 Is Used

This project is a thesis on what Claude Opus 4.6 can do:

1. **1M Context Window** — The entire 500-case caseload (275K+ tokens) is loaded into a single prompt for the health check and chat features
2. **Extended Thinking** — Every analysis mode uses thinking budgets from 10K to 60K tokens, all streamed to the UI in real-time
3. **Tool Use (Function Calling)** — 9 tools exposed to Claude for autonomous investigation with extended thinking (requires `tool_choice: "auto"`)
4. **128K Output** — Motion generation uses up to 64K response tokens for comprehensive legal documents
5. **Multimodal Vision** — Evidence images (surveillance, injury photos, dashcam stills) are analyzed with Opus 4.6's vision capabilities
6. **Streaming** — All AI operations stream thinking and response deltas via SocketIO for real-time UX
7. **Sequential Reasoning** — The adversarial simulation chains three separate thinking processes, each building on the previous

## Demo Data

The 500 cases include 15 hand-crafted cases with planted cross-connections:
- **Officer Rodriguez pattern**: 4 cases with the same officer, contested vehicle searches
- **Speedy trial risks**: Cases approaching 180-day and 90-day limits
- **Plea disparities**: Similar assault cases with dramatically different plea offers
- **Shared witness**: James Patterson is a witness in one case and defendant in another
- **Detective Harris**: 3 cases with IAB complaint and excessive force allegations

These are designed for the AI to discover during health checks and cross-case analysis.

## License

MIT
