# Case Nexus — Video Production Guide

Everything you need to produce the 3-minute demo video.

---

## Assets

| Asset | Path | Notes |
|-------|------|-------|
| Title card (16:9, 5504x3072) | `static/title_card.png` | Opening frame — "Public defenders carry 500 cases." |
| Base thumbnail (no text) | `static/evidence/image-1771034879440.jpeg` | If you want to re-composite |

---

## Software You Need

| Tool | Purpose | Get it |
|------|---------|--------|
| **OBS Studio** | Screen recording (1080p60, separate audio track) | [obsproject.com](https://obsproject.com) |
| **DaVinci Resolve** (free) | Video editing, text overlays, speed ramping | [blackmagicdesign.com](https://www.blackmagicdesign.com/products/davinciresolve) |
| **Voice Memos** (macOS built-in) | Voiceover recording | Already on your Mac |
| Alt: **CapCut** (free) | Faster editor if you know it, good text tools | [capcut.com](https://www.capcut.com) |

### OBS Settings
- Canvas Resolution: 1920x1080
- Output: Recording → CRF 18, Encoder x264, High profile
- Audio: Disable desktop audio capture (you'll record voice separately)
- Source: Window Capture → Chrome window (or Display Capture with everything else hidden)

### Browser Setup
- Chrome, 100% zoom, window sized to exactly 1920x1080
- **Hide bookmarks bar**: Cmd+Shift+B
- **Close all other tabs**
- **Disable notifications**: System Settings → Focus → Do Not Disturb ON

---

## Pre-Recording Checklist

```bash
# 30 minutes before recording
rm -f case_nexus.db && python app.py

# Do ONE throwaway Health Check to warm the API connection
# Then restart fresh:
rm -f case_nexus.db && python app.py
```

- [ ] `.env` has valid `ANTHROPIC_API_KEY` with ~$15-20 credits
- [ ] Chrome open, bookmarks hidden, 1920x1080
- [ ] OBS recording, correct window selected
- [ ] Phone on silent, Slack/Discord/Mail quit
- [ ] Do Not Disturb ON

---

## Recording Plan — 5 Separate Takes

Record each section as its own clip. Pick the best take of each. Never try one continuous recording.

| Take | What to capture | Real-time | Target after edit |
|------|----------------|-----------|-------------------|
| **Take 1** | Landing page → click Sync Caseload → cases loading | ~15s | 12s |
| **Take 2** | Click a case → click Health Check → wait → results appear | 60-90s | 50s |
| **Take 3** | Click Cascade Intelligence → tool calls stream → brief appears | 60-90s | 45s |
| **Take 4** | Navigate to CR-2025-0012 → click Adversarial Sim → all 3 phases | 120-180s | 45s |
| **Take 5** | Click an evidence image → analysis starts → cut to dashboard | ~15s | 15s |

**Record each take 2-3 times.** Pick the cleanest one.

---

## The Edit — Shot by Shot

### TITLE CARD (0:00–0:03)

**Visual:** `static/title_card.png` — fade in over 0.5s, hold 2s, fade to app.

**Audio:** Silence. Let the image speak.

---

### SYNC + PROBLEM (0:03–0:15)

| Time | Screen | Voiceover | Text Overlay |
|------|--------|-----------|--------------|
| 0:03 | App landing page appears | *"They walk into court with minutes to prepare."* | `Fulton County, Georgia` bottom-left |
| 0:07 | Click "Sync Caseload" | *"Case Nexus loads every case into Claude's million-token context window."* | — |
| 0:10 | Cases populating (speed to 2x) | *"No RAG, no chunking. The AI sees everything at once."* | `500 cases • 275,000+ tokens` bottom bar |

---

### MOMENT 1 — Health Check (0:15–1:05)

| Time | Screen | Voiceover | Text Overlay |
|------|--------|-----------|--------------|
| 0:15 | Click case CR-2025-0012, detail card shows | *(silence — let judges read the card for 2s)* | — |
| 0:18 | Click "Health Check" | *"Health Check. All 500 cases in a single Opus 4.6 prompt."* | `275K tokens loaded` near token bar |
| 0:22 | Token bar filling, thinking starts | Speed to 3x during dead air, 1x when text streams | — |
| 0:28 | Thinking text streaming | *"Claude uses 60,000 tokens of extended thinking — all streamed live."* | — |
| 0:35 | Results appear — **1x speed from here** | *"The AI found Officer Rodriguez in four separate traffic stops — all with contested vehicle searches."* | — |
| 0:45 | Mouse slowly over alerts panel | *"A Fourth Amendment pattern invisible across 500 files."* | — |
| 0:50 | Pan to cross-case connections | *"Speedy trial deadlines, plea disparities, shared witnesses — the full risk profile."* | `Amplify Human Judgment` bottom-right |
| 1:00 | Pan to risk heatmap, hold 5s | *(silence — let judges read)* | — |

**Editing tip:** Subtle 105% zoom-in (Ken Burns) on the alerts panel when the Rodriguez finding appears.

---

### MOMENT 2 — Cascade Intelligence (1:05–1:50)

| Time | Screen | Voiceover | Text Overlay |
|------|--------|-----------|--------------|
| 1:05 | Click Cascade Intelligence (gold button) | *"Cascade Intelligence. Nine tools. Claude investigates autonomously."* | `9 tools • 8 rounds • autonomous` |
| 1:12 | First tool call appears — **1x speed** | *"Claude pulls case CR-2025-0089 for deeper investigation..."* | — |
| 1:18 | Second tool call | *"Now looking up the Georgia statute..."* | — |
| 1:24 | Third tool call | *"Searching for case law precedent..."* | — |
| 1:30 | Gap between calls → speed to 2x | — | — |
| 1:35 | Strategic brief rendering — **1x speed** | *"A genuine agentic loop — Claude decides what matters, gets the information, builds strategy."* | — |
| 1:42 | Slow scroll through brief | *(silence — let judges read key findings)* | — |

**Editing tip:** Add a subtle click/ping sound effect when each tool call badge appears. Gives rhythm. Free at pixabay.com/sound-effects.

---

### MOMENT 3 — Adversarial Simulation (1:50–2:35)

| Time | Screen | Voiceover | Text Overlay |
|------|--------|-----------|--------------|
| 1:50 | Click CR-2025-0012 → click Adversarial Sim | *"Three AI sessions chained. Prosecution. Defense. Judge."* | — |
| 1:55 | Prosecution phase streaming | Speed to 2x during wait, 1x when content appears | `Phase 1/3: Prosecution` top-left |
| 2:05 | **JUMP CUT** → defense phase starts | *"The defense reads the prosecution's actual arguments and dismantles them."* | `Phase 2/3: Defense` top-left |
| 2:12 | Split panel visible for 5s | *(silence — let judges read both sides)* | — |
| 2:17 | **JUMP CUT** → judge panel appears | *"80,000 tokens of chained reasoning across three perspectives."* | `Phase 3/3: Judicial Synthesis` |
| 2:25 | Judge output readable for 5s | *"Prosecution, defense, judicial — each with visible reasoning the attorney can challenge."* | — |

**On jump cuts:** Quick 0.3s fade-to-black between phases. Add a small text card: `~45 seconds of analysis` to legitimize the time skip.

---

### EVIDENCE FLASH + CLOSE (2:35–2:55)

| Time | Screen | Voiceover | Text Overlay |
|------|--------|-----------|--------------|
| 2:35 | Click an evidence item (dashcam image) | *"Claude also analyzes evidence using vision — dashcam footage, injuries, crime scenes."* | — |
| 2:40 | Analysis thinking starts streaming → cut away after 3s | — | — |
| 2:43 | Dashboard view — slow pan across alerts, connections, heatmap | *"Every Opus 4.6 capability — million-token context, extended thinking, autonomous tool use, 128K output, vision, chained reasoning — amplifying one attorney's judgment across 500 cases."* | — |
| 2:52 | Hold on dashboard, token bar visible | — | `Case Nexus` centered, then `Built with Claude Opus 4.6` below |
| 2:55 | Fade to black | — | — |

---

## All Text Overlays — Quick Reference

Add these in your editor. Use **DM Sans** or **Avenir Next** (matches the app).

| Time | Text | Position | Style |
|------|------|----------|-------|
| 0:03 | `Fulton County, Georgia` | Bottom-left | Small, subtle, white |
| 0:10 | `500 cases • 275,000+ tokens` | Bottom center bar | Semi-transparent bg |
| 0:18 | `275K tokens loaded` | Near the token viz bar | Small chip |
| 0:50 | `Amplify Human Judgment` | Bottom-right | Subtle, smaller |
| 1:05 | `9 tools • 8 rounds • autonomous` | Bottom center bar | Semi-transparent bg |
| 1:55 | `Phase 1/3: Prosecution` | Top-left | Label with bg |
| 2:05 | `Phase 2/3: Defense` | Top-left | Label with bg |
| 2:17 | `Phase 3/3: Judicial Synthesis` | Top-left | Label with bg |
| 2:52 | `Case Nexus — Built with Claude Opus 4.6` | Center | Fade in, larger |

---

## Voiceover Script — Complete

Record this AFTER editing the screen capture. Watch your edit on loop, then speak to match the timing.

> They walk into court with minutes to prepare.
>
> Case Nexus loads every case into Claude's million-token context window. No RAG, no chunking. The AI sees everything at once.
>
> Health Check. All 500 cases in a single Opus 4.6 prompt.
>
> Claude uses 60,000 tokens of extended thinking — all streamed live.
>
> The AI found Officer Rodriguez in four separate traffic stops — all with contested vehicle searches. A Fourth Amendment pattern invisible across 500 files.
>
> Speedy trial deadlines, plea disparities, shared witnesses — the full risk profile.
>
> *(pause 5s)*
>
> Cascade Intelligence. Nine tools. Claude investigates autonomously.
>
> Claude pulls case CR-2025-0089 for deeper investigation... now looking up the Georgia statute... searching for case law precedent...
>
> A genuine agentic loop — Claude decides what matters, gets the information, builds strategy.
>
> *(pause 5s)*
>
> Three AI sessions chained. Prosecution. Defense. Judge.
>
> The defense reads the prosecution's actual arguments and dismantles them.
>
> 80,000 tokens of chained reasoning across three perspectives.
>
> Prosecution, defense, judicial — each with visible reasoning the attorney can challenge.
>
> Claude also analyzes evidence using vision — dashcam footage, injuries, crime scenes.
>
> Every Opus 4.6 capability — million-token context, extended thinking, autonomous tool use, 128K output, vision, chained reasoning — amplifying one attorney's judgment across 500 cases.

### Voiceover Tips

- **Speak at 0.8x your natural pace.** Judges watch at 1.5x.
- **Leave 1-second gaps between sentences.** Feels slow recording. Perfect in playback.
- **Record in a closet or under a blanket fort.** Clothes absorb echo. Phone Voice Memos is fine if the room is quiet.
- **No background music.** Silence is better than bad music.
- **Don't apologize for loading time.** Narrate what's happening instead.
- **Use concrete numbers.** "275,000 tokens", "500 cases", "9 tools", "80,000 tokens" — specificity sells.

---

## Speed Ramping Rules

| Situation | Speed | Why |
|-----------|-------|-----|
| Cases loading in sidebar | 2x | Visual is clear at speed |
| Waiting for API response (blank screen) | 3-4x | Dead air kills |
| Token bar filling (before text appears) | 2-3x | Bar animation is clear at speed |
| Thinking text streaming | **1x** | Judges need to read this |
| Results appearing | **1x** | This is the payload — don't rush |
| Tool calls appearing one by one | **1x** | Money shot — let each land |
| Scrolling through AI output | **1x** | Let judges read key lines |
| Gap between adversarial phases | Jump cut | Use 0.3s fade-to-black |

---

## Backup Plans

| Problem | Solution |
|---------|----------|
| Health Check takes >90s | Speed-ramp the wait. Caption: `~60 seconds of analysis` |
| Cascade tool calls are slow | Narrate what each tool does. Jump cut between calls |
| Adversarial Sim takes >3 min | Show prosecution start → jump to defense results → show judge |
| API call fails mid-recording | Stop, restart server, re-record just that take |
| Rodriguez pattern not found | Re-run. It's planted in the data. If missed twice, use the take where it worked |
| Audio echo/noise | Re-record voice only. Separate tracks means screen capture is safe |

---

## Export Settings

- **Resolution:** 1920x1080 (1080p)
- **Codec:** H.264
- **Frame rate:** 30fps minimum (60fps if your screen capture is 60fps)
- **Bitrate:** 10-15 Mbps (YouTube-quality)
- **Format:** MP4
- **Total runtime:** 2:45–2:55 (5-second buffer under 3:00 limit)

---

## Final Checklist

- [ ] Title card `static/title_card.png` used as opening frame
- [ ] 5 takes recorded, best of each selected
- [ ] Speed ramping applied (dead air fast, content 1x)
- [ ] All 9 text overlays added
- [ ] Jump cuts between adversarial phases with fade-to-black
- [ ] Voiceover recorded separately and synced
- [ ] Evidence analysis flash included (7 seconds)
- [ ] Token bar visible during Health Check and Cascade
- [ ] No console, no terminal, no errors visible
- [ ] Mouse movements are deliberate (not jittery)
- [ ] Total runtime ≤ 3:00
- [ ] Exported at 1080p H.264
- [ ] Uploaded to YouTube/Loom (unlisted OK)
