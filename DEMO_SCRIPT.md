# Case Nexus — 3-Minute Demo Video Plan

## The #1 Rule: 3 Features Deep > 9 Features Shallow

Judges watch 500 videos. They remember moments, not feature lists.
Your 3 "holy shit" moments are:
1. **Health Check**: 500 cases loaded → AI discovers Officer Rodriguez pattern
2. **Cascade Intelligence**: Claude autonomously calling tools in real-time
3. **Adversarial Simulation**: 3-phase prosecution vs defense with split thinking

Everything else is a footnote. Do NOT try to show chat, hearing prep, client letter, evidence analysis, widgets, or case law search. If you have extra time, show ONE of those as a quick closer.

---

## Pre-Recording Checklist

### 30 Minutes Before

1. Kill any running instance: `rm -f case_nexus.db && python app.py`
2. **Browser**: Chrome, 100% zoom, maximize to 1920x1080 or 2560x1440
3. **Close everything**: No Slack, no notifications, no menu bar clutter
4. **Microphone**: Good mic, quiet room, measured pace
5. **Screen recorder**: OBS or QuickTime at 1080p minimum
6. **API key**: Confirm `.env` has valid `ANTHROPIC_API_KEY` with sufficient credits (~$15-20 per full run)

### Pre-Warm (Critical)

Do one throwaway Health Check before recording to warm the API connection.
Then `rm -f case_nexus.db && python app.py` and start fresh for the real take.

---

## Video Script — 3 Minutes, 3 Moments

### COLD OPEN — The Problem (0:00 – 0:25)

**Screen**: The empty app landing page.

**Say this** (slow, clear, with conviction):

> "Public defenders in Georgia carry 500 active cases. They walk into court with minutes to prepare. A pattern of unconstitutional stops by the same officer across four separate cases goes unnoticed — because no human can hold 500 case files in their head at once.
>
> Case Nexus changes that. It loads the entire caseload into Claude Opus 4.6's million-token context window and autonomously investigates it."

**Do**: Let the landing page sit for a beat. Don't click yet.

---

### MOMENT 1 — Caseload Sync + Health Check (0:25 – 1:15)

This is your **1M context window** showcase.

**Action**: Click "Sync Caseload".

**Say**:

> "We sync 500 cases from the court system — felonies, misdemeanors, everything a public defender carries."

**Do**: Watch cases populate. Point at sidebar stats briefly. Click one case (CR-2025-0012) to flash the case detail card — charges, hearing date, speedy trial countdown. 5 seconds max.

**Action**: Click "Health Check".

**Say**:

> "Now the hero feature. We load all 500 cases — over 275,000 tokens — into a single Opus 4.6 prompt. No RAG, no chunking. The AI sees every case simultaneously."

**Do**: Point at the token visualization bar filling up in the header. Point at the Legal Corpus badge appearing.

> "Claude is using 60,000 tokens of extended thinking to scan the entire caseload for risks and patterns."

**Do**: Wait. Let the thinking stream flow. Don't narrate over it — let the visual do the work for 5 seconds. Then:

**When results appear, say**:

> "The AI just discovered that Officer Rodriguez appears in four separate traffic stop cases — all with contested vehicle searches. That's a Fourth Amendment pattern no attorney could spot manually across 500 files."

**Do**: Point at the alerts panel. Point at the cross-case connections. Point at the risk heatmap. 3-4 seconds each. Don't click through everything — let judges read the screen.

---

### MOMENT 2 — Cascade Intelligence (1:15 – 2:00)

This is your **autonomous agent / tool use** showcase. The highest-impact feature for Anthropic judges.

**Action**: Click "Cascade Intelligence" (the gold button).

**Say**:

> "Cascade Intelligence turns Claude into an autonomous investigator. It has nine tools — it can pull any case, look up Georgia statutes, search real case law through the CourtListener API, and find cross-case patterns. It decides what to investigate on its own."

**Do**: Watch tool calls appear in real-time. THIS IS THE MONEY SHOT. Each tool call shows the name, status, and result preview. As they appear:

> "Claude just decided to pull case CR-2025-0089 for deeper investigation... now it's looking up the relevant Georgia statute... now it's searching CourtListener for case law precedent..."

**Do**: Point at each tool call as it streams in. Let at least 3-4 tool calls play out visually.

> "This is genuine autonomous investigation — Claude is using extended thinking to reason about what to look at next, then calling tools to get the information. Up to eight rounds of autonomous investigation."

**Do**: When the strategic brief appears, scroll slowly through it. Let key findings be readable for 3-4 seconds.

---

### MOMENT 3 — Adversarial Simulation (2:00 – 2:45)

This is your **chained reasoning / Keep Thinking Prize** showcase.

**Action**: Navigate to a specific case (click CR-2025-0012 in sidebar), then click "Adversarial Sim".

**Say**:

> "The adversarial simulation chains three separate Claude sessions. A prosecution AI builds the strongest possible case. A defense AI reads the prosecution's actual arguments and dismantles them. Then a judicial analyst synthesizes both sides."

**Do**: Watch the 3-phase progress bar. Point at prosecution thinking streaming on the left side.

> "Each phase uses its own extended thinking budget — over 80,000 tokens of chained reasoning. The defense AI actually reads the prosecution's full brief before responding."

**Do**: When defense phase starts, point at the split-panel view. Let the visual drama of both sides play out. Point at the judge panel when it appears.

> "The attorney sees the case from three adversarial perspectives — prosecution, defense, and judicial — each with visible reasoning chains they can supervise and challenge."

---

### CLOSING (2:45 – 3:00)

**Screen**: Quick scroll back to dashboard showing alerts, connections, risk heatmap, token bar.

**Say**:

> "Case Nexus uses every major Opus 4.6 capability — the million-token context window, extended thinking with streaming, autonomous tool use, 128K output, multimodal vision, and sequential reasoning chains — all in service of one goal: making sure no public defender's client falls through the cracks because their lawyer was carrying too many cases."

**Do**: Hold on the dashboard for the final 3 seconds. Let the token bar be visible.

---

## Editing & Post-Production

### Recording Strategy

Record each section as a separate clip. You can stitch and time-shift in editing:

1. **Cold open + Sync** → one take (25 sec)
2. **Health Check** → let it run fully, longest wait (~60-90 sec real-time, trim to 50 sec in edit)
3. **Cascade Intelligence** → second longest (~60-90 sec real-time, trim to 45 sec in edit)
4. **Adversarial Simulation** → longest total (~2-3 min real-time, trim to 45 sec in edit showing key phases)
5. **Closing dashboard pan** → 15 sec

### Time-Shifting Rules

- **Speed up**: Waiting periods where nothing is happening on screen (between API calls, before results start appearing). Use 2-4x speed.
- **NEVER speed up**: Parts where results are appearing, thinking is streaming, or tool calls are showing. Judges need to read these.
- **Jump cut**: If a phase takes too long, cut to "Here's what Claude found" with the results already on screen. Add a brief caption like "~60 seconds of analysis" if helpful.
- **Total target**: 2:45-3:00 after editing. Under 2:30 feels rushed. Over 3:00 may violate the submission requirement.

### Voiceover Tips

- **Speak slowly and clearly.** Judges may be at 1.5x speed. Your narration needs to survive that.
- **Use concrete numbers.** "275,000 tokens", "500 cases", "9 tools", "80,000 tokens of reasoning" — specificity sells.
- **Frame everything as human impact.** "The attorney can see...", "A client would have fallen through the cracks...", "This pattern was invisible before..."
- **Fill wait time with technical explanation.** "Claude is using 60,000 tokens of internal reasoning right now" fills loading time and impresses judges simultaneously.
- **Don't apologize for anything.** If something takes a moment, narrate what's happening.

### What NOT to Do

- Don't show errors. If something fails, restart that clip.
- Don't scroll fast through AI output. Let it be readable.
- Don't explain the code. Judges care about the product.
- Don't show terminal/console. Keep focus on the UI.
- Don't try to show more than 3 features. Resist the temptation.
- Don't speed-run. Deliberate mouse movements look professional.

---

## Backup Plans

| Problem | Solution |
|---------|----------|
| Health Check takes >90 sec | Time-shift in editing. Caption: "~60 seconds later" |
| Cascade tool calls are slow | Keep narrating what each tool does. Cut between calls. |
| Adversarial takes >3 min | Show prosecution starting, jump cut to defense results, show judge |
| API call fails mid-recording | Stop recording, restart server, re-record that clip only |
| Results don't show Officer Rodriguez | Re-run. The pattern is planted in the data. If AI misses it twice, show health check results where it did find it. |

---

## Feature Checklist — What MUST Appear in 3 Minutes

- [x] Caseload sync (500 cases loading)
- [x] Token visualization bar filling up
- [x] Health check with 275K+ tokens loaded
- [x] Alerts panel with AI-discovered findings
- [x] Cross-case connections (Officer Rodriguez pattern)
- [x] Risk heatmap visualization
- [x] Cascade Intelligence with visible tool calls
- [x] At least 3 different tools shown calling in real-time
- [x] Adversarial simulation 3-phase progress bar
- [x] Prosecution → Defense → Judge phase transitions
- [x] Extended thinking streaming visually on screen

### Nice-to-Have (only if you have 10-15 spare seconds)
- [ ] Quick flash of evidence analysis (multimodal)
- [ ] Quick flash of chat ("Which cases have hearings this week?")
- [ ] Motion generation with citation verification

---

## The Night-Before Checklist

- [ ] Video is recorded and edited to ≤3:00
- [ ] Video is uploaded to YouTube/Loom (unlisted is fine)
- [ ] WRITEUP.md summary section (100-200 words) is ready
- [ ] Repo is public on GitHub
- [ ] LICENSE file is committed
- [ ] .env.example exists (no real keys)
- [ ] README has clear setup instructions
- [ ] No console.log spam or debug output visible
- [ ] requirements.txt is complete
- [ ] Submission form is filled out before 3:00 PM EST Monday
