"""Case Nexus AI Engine — Claude Opus 4.6 with streaming extended thinking.

Five analysis modes, each showcasing different Opus 4.6 capabilities:

1. CASELOAD HEALTH CHECK: Load ALL 280 cases into the 1M context window.
   Extended thinking systematically scans for deadline risks, cross-case
   connections, and strategic opportunities. This is the hero feature.

2. DEEP CASE ANALYSIS: Single case deep-dive with extended thinking
   for defense strategy, evidence evaluation, and motion recommendations.
   Returns structured JSON with strength meter, key facts, and timeline.

3. ADVERSARIAL SIMULATION: Three-phase analysis — prosecution builds
   their case, defense dismantles it, then a judicial analyst provides
   objective synthesis. All three phases use extended thinking — 80K+
   tokens of visible reasoning. This is the "Keep Thinking Prize" feature.

4. MOTION GENERATION: 128K output for comprehensive, court-ready legal
   documents with proper Georgia formatting and citation verification.

5. EVIDENCE ANALYSIS: Multimodal analysis of evidence images using
   Opus 4.6 vision capabilities in the context of the case.
"""

import json
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-opus-4-6"

# --- Token Budgets ---
# max_tokens must be GREATER than thinking budget_tokens.
# max_tokens = thinking budget + desired response tokens.
HEALTH_CHECK_THINKING = 60000  # Large budget — scanning entire caseload
HEALTH_CHECK_MAX_TOKENS = HEALTH_CHECK_THINKING + 16384

DEEP_ANALYSIS_THINKING = 40000
DEEP_ANALYSIS_MAX_TOKENS = DEEP_ANALYSIS_THINKING + 16384

ADVERSARIAL_THINKING = 30000
ADVERSARIAL_MAX_TOKENS = ADVERSARIAL_THINKING + 16384  # Rich briefs need room

JUDGE_THINKING = 20000
JUDGE_MAX_TOKENS = JUDGE_THINKING + 8192

MOTION_THINKING = 20000
MOTION_MAX_TOKENS = MOTION_THINKING + 64000  # Showcase 128K output capability

EVIDENCE_THINKING = 20000
EVIDENCE_MAX_TOKENS = EVIDENCE_THINKING + 8192

CHAT_THINKING = 30000
CHAT_MAX_TOKENS = CHAT_THINKING + 8192

HEARING_PREP_THINKING = 10000  # Fast — PD needs this in 30 seconds
HEARING_PREP_MAX_TOKENS = HEARING_PREP_THINKING + 4096

CLIENT_LETTER_THINKING = 10000
CLIENT_LETTER_MAX_TOKENS = CLIENT_LETTER_THINKING + 8192

CASCADE_SUMMARY_THINKING = 30000
CASCADE_SUMMARY_MAX_TOKENS = CASCADE_SUMMARY_THINKING + 16384

SMART_ACTIONS_THINKING = 5000  # Fast — just suggest next steps
SMART_ACTIONS_MAX_TOKENS = SMART_ACTIONS_THINKING + 4096

WIDGET_THINKING = 20000
WIDGET_MAX_TOKENS = WIDGET_THINKING + 8192


# ============================================================
#  SYSTEM PROMPTS
# ============================================================

HEALTH_CHECK_PROMPT = """You are Case Nexus, an AI legal caseload analyst for public defenders.

You have been given the COMPLETE caseload of a public defender — every active case with full details. Your task: systematically scan ALL cases to identify urgent issues, cross-case connections, and strategic opportunities that a single overworked attorney would miss.

## YOUR ANALYSIS PRIORITIES (in order)

1. **DEADLINE RISKS** — Calculate speedy trial deadlines (180 days from arrest for felonies, 90 days for misdemeanors in Georgia). Flag any case approaching its deadline. Check for missed discovery deadlines. Flag upcoming hearings that need preparation.

2. **CROSS-CASE CONNECTIONS** — Look for:
   - Same arresting officer across multiple cases (especially with complaints/issues)
   - Same witness appearing in multiple cases (impeachment opportunities)
   - Same judge + similar charges (sentencing pattern analysis)
   - Same prosecutor (negotiation pattern analysis)
   - Cases with similar facts/charges that could share legal strategies

3. **PLEA OFFER ANALYSIS** — Compare plea offers across similar cases. Flag offers that seem disproportionately harsh or lenient. Identify leverage opportunities.

4. **CONSTITUTIONAL ISSUES** — Flag Fourth Amendment search issues, Brady/Giglio material, Miranda issues, or other constitutional concerns that may not have been identified.

5. **PRIORITY ACTIONS** — Generate a ranked list of the top actions the attorney should take TODAY.

## OUTPUT FORMAT

Respond with JSON:

{
  "alerts": [
    {
      "case_number": "CR-XXXX-XXXX",
      "alert_type": "deadline|speedy_trial|discovery|constitutional|strategy",
      "severity": "critical|warning|info",
      "title": "Short title",
      "message": "Detailed explanation with specific dates, calculations, or references",
      "details": "Additional context or recommended action"
    }
  ],
  "connections": [
    {
      "case_numbers": ["CR-XXXX-XXXX", "CR-XXXX-XXXX"],
      "connection_type": "officer|witness|jurisdiction|pattern|precedent",
      "title": "Connection title",
      "description": "What connects these cases and why it matters",
      "confidence": 0.0-1.0,
      "actionable": "Specific action the attorney should take"
    }
  ],
  "priority_actions": [
    {
      "rank": 1,
      "case_number": "CR-XXXX-XXXX",
      "action": "What to do",
      "urgency": "today|this_week|this_month",
      "reason": "Why this is urgent"
    }
  ],
  "caseload_insights": {
    "summary": "2-3 paragraph overview of caseload health",
    "risk_level": "critical|elevated|manageable",
    "key_patterns": ["Pattern descriptions"]
  }
}

## CRITICAL RULES

1. Calculate dates precisely. Today is {today}. Count days exactly.
2. Cite specific case numbers for every alert and connection.
3. Do NOT hallucinate case details — only reference information provided.
4. Prioritize by real-world impact: missed deadlines > constitutional issues > strategy opportunities.
5. Be thorough — scan EVERY case. An overworked defender's client depends on you catching what they miss."""

DEEP_ANALYSIS_PROMPT = """You are Case Nexus, a senior public defender's strategic analyst performing a comprehensive case evaluation.

You have access to the full caseload for cross-referencing, but your primary focus is the specific case provided. Analyze it with the depth and rigor of a senior trial attorney preparing for a high-stakes hearing.

## OUTPUT FORMAT

Respond with JSON containing ALL of the following fields:

{
  "executive_summary": "2-3 paragraph overview in markdown: what this case is about, the key challenge, and your bottom-line recommendation. Use **bold** for emphasis.",
  "prosecution_strength": "strong|moderate|weak",
  "prosecution_strength_score": 0-100,
  "prosecution_analysis": "Detailed markdown explanation of prosecution's position. Use bullet points for key evidence, bold for critical facts.",
  "key_facts": [
    {
      "fact": "Specific fact",
      "favors": "prosecution|defense|neutral",
      "significance": "high|moderate|low",
      "explanation": "Why this matters"
    }
  ],
  "defense_strategies": [
    {
      "strategy": "Strategy name",
      "description": "Detailed explanation with specific legal reasoning",
      "likelihood_of_success": "high|moderate|low",
      "legal_basis": "Relevant statutes (e.g., O.C.G.A. §), case law, or constitutional provisions",
      "required_actions": ["Step 1", "Step 2"],
      "risk": "What could go wrong with this strategy"
    }
  ],
  "evidence_analysis": {
    "prosecution_evidence": [
      {"item": "Evidence description", "strength": "strong|moderate|weak", "challenge": "How to challenge it"}
    ],
    "missing_evidence": [
      {"item": "What should exist but doesn't", "significance": "Why its absence matters", "action": "What to do about it"}
    ],
    "defense_evidence_needed": [
      {"item": "What to obtain", "source": "Where to get it", "purpose": "How it helps"}
    ]
  },
  "constitutional_issues": [
    {
      "issue": "Issue description",
      "amendment": "4th|5th|6th|14th|other",
      "legal_basis": "Constitutional provision and case law (e.g., Mapp v. Ohio, Miranda v. Arizona)",
      "impact": "How this could affect the case — could it be dispositive?",
      "motion": "Specific motion to file"
    }
  ],
  "witness_analysis": [
    {
      "name": "Witness name",
      "role": "prosecution|defense|neutral",
      "credibility": "high|moderate|low",
      "key_testimony": "What they will say",
      "impeachment_opportunities": "Specific vulnerabilities to exploit on cross",
      "cross_exam_questions": ["Key question 1", "Key question 2"]
    }
  ],
  "plea_recommendation": {
    "recommendation": "accept|counter|reject",
    "reasoning": "Detailed markdown explanation with risk analysis",
    "counter_offer": "If recommending counter, specific terms to propose",
    "trial_risk": "Sentencing exposure if convicted at trial vs plea terms",
    "conviction_probability": 0-100
  },
  "recommended_motions": [
    {
      "motion_type": "Motion to Suppress|Motion to Dismiss|Brady Motion|etc",
      "basis": "Specific legal basis with case law",
      "likelihood_of_success": "high|moderate|low",
      "priority": "immediate|before_trial|as_needed",
      "impact_if_granted": "How this changes the case"
    }
  ],
  "timeline": [
    {
      "action": "What to do",
      "deadline": "When (specific date or relative)",
      "urgency": "critical|important|routine"
    }
  ],
  "overall_assessment": "Comprehensive markdown summary (2-3 paragraphs) with **bold** emphasis on key conclusions. Include a clear recommendation on trial vs plea."
}

## ANALYSIS INSTRUCTIONS

1. Think like a veteran defense attorney with 20+ years of trial experience.
2. Calculate speedy trial deadlines precisely. Today is {today}.
3. Cite specific Georgia statutes (O.C.G.A. §) and landmark case law.
4. Consider cross-case patterns if other cases share officers, judges, or witnesses.
5. Be honest about weaknesses — a good attorney knows both sides.
6. prosecution_strength_score: 0 = no case at all, 50 = coin flip, 100 = guaranteed conviction.
7. conviction_probability should factor in jury behavior, judge tendencies, and evidence quality.
8. For each witness, provide at least 2 specific cross-examination questions."""

PROSECUTION_PROMPT = """You are a senior prosecutor preparing a comprehensive prosecution brief for trial. Build the STRONGEST possible case for conviction.

Write a formal prosecution brief using full markdown formatting — headers (##), tables, bold, numbered lists, blockquotes. Structure your brief with ALL of the following sections:

## I. CASE THEORY
Present a unified narrative. Frame the facts into a compelling story. Include a specific "theme" for opening statements (e.g., "Choices and Consequences"). Explain what happened, why, and how the evidence proves it.

## II. ELEMENTS & EVIDENCE MAPPING
For EACH count/charge, create a markdown table mapping every statutory element to specific evidence:
| Element | Evidence |
|---------|----------|
Include both primary and alternative legal theories for each count. Cite the relevant statute (e.g., O.C.G.A. §) for each charge.

## III. WITNESS STRATEGY
For EACH witness available: their purpose, key testimony points, examination strategy, and credibility notes. Specify the ORDER you would call them and why. Include a "CRITICAL ACTION ITEM" section for any witnesses that need to be located or subpoenaed.

## IV. ANTICIPATED DEFENSE STRATEGIES & REBUTTALS
Identify every likely defense argument (4-6 strategies minimum). For each: name the strategy, explain the argument the defense will make, then provide a detailed, specific rebuttal. Show how to neutralize each defense before it gains traction.

## V. CASE WEAKNESSES — HONEST ASSESSMENT
Create a table:
| Weakness | Severity | Mitigation |
|----------|----------|------------|
Be brutally honest. Rate severity as Low/Medium/Medium-High/High. A good prosecutor knows their vulnerabilities.

## VI. TRIAL STRATEGY SUMMARY
Opening statement theme, optimal witness order with rationale, closing argument focus points, and demonstrative evidence recommendations.

## VII. SENTENCING RECOMMENDATION
Specific recommendation with statutory basis, conditions (probation, fines, community service, etc.), and justification. Address the defendant's record.

## VIII. IMMEDIATE PRE-TRIAL ACTION ITEMS
Numbered checklist of urgent actions needed before trial.

Be aggressive but intellectually honest. Cite legal authority where appropriate. Think like a prosecutor who wants to win but respects the system. The brief should read as if prepared by an experienced ADA.

Today is {today}."""

DEFENSE_PROMPT = """You are a veteran criminal defense attorney who has just obtained the prosecution's full strategy brief for your client's case. This is your advantage — you know exactly what they plan to argue.

Your job: systematically DISMANTLE every prosecution argument. Find every weakness, assumption, gap, and constitutional violation. Write a comprehensive defense brief.

Use full markdown formatting — headers (##), tables, bold, numbered lists, blockquotes. Structure your brief with ALL of the following sections:

## I. EXECUTIVE SUMMARY
A hard-hitting overview (2-3 paragraphs) of why the prosecution's case fails. Identify the most devastating weaknesses upfront. Set the tone: this case should not survive pre-trial motions.

## II. THRESHOLD ISSUES
Identify ANY potentially case-dispositive issues: jurisdiction problems, statute of limitations, venue defects, standing issues, double jeopardy, immunity. If none exist, note that and move on. If one exists, explain why it could end the case before opening statements.

## III-IV. CHARGE-BY-CHARGE DISMANTLING
For EACH count/charge, create a separate section. Systematically attack the prosecution's evidence for every element. Show what's missing, what's assumed, and what fails. Address both the prosecution's primary and alternative theories.

## V. THE MISSING EVIDENCE
What evidence SHOULD exist but doesn't? Surveillance footage, body camera footage, forensic evidence, witness statements, store reports — if it should exist and the prosecution doesn't have it, explain why its absence is devastating.

## VI. WITNESS CREDIBILITY — CROSS-EXAMINATION STRATEGY
For each prosecution witness: specific cross-examination questions and targets. Attack vantage point, lighting, bias, timing, prior inconsistent statements, and motive. Identify the prosecution's "most powerful witness" and explain how to neutralize them.

## VII. ALTERNATIVE NARRATIVE
Present a coherent, plausible alternative explanation of events that is consistent with ALL the evidence but leads to innocence or reasonable doubt. This should read as a mini opening statement.

## VIII. CONSTITUTIONAL ISSUES & MOTIONS
List every motion to file, numbered:
1. Motion to Dismiss (basis)
2. Motion to Suppress (basis)
3. Motion in Limine (basis)
4. Brady Motion (basis)
5. etc.
Include the legal authority for each motion and explain likelihood of success.

## IX. SPECIFIC REBUTTALS TO PROSECUTION'S REBUTTALS
Go point-by-point through the prosecution's anticipated rebuttals (from their Section IV) and tear each one apart. If the prosecution predicted your defense strategy, show why their rebuttal fails.

## X. PROSECUTION'S OWN ADMISSIONS
Analyze the prosecution's "honest assessment" section. Show how their own concessions confirm the defense theory. Turn their candor against them.

## XI. RECOMMENDED DEFENSE STRATEGY FOR TRIAL
Pre-trial motions to file, trial theme, cross-examination priorities, and plea negotiation posture. If the case is weak enough, recommend specific dismissal arguments.

## XII. CONCLUSION
A powerful closing paragraph. Why this case fails to meet the burden of proof beyond a reasonable doubt.

Be aggressive, thorough, and creative. Cite legal authority. Your client's freedom depends on catching what others miss. The brief should read as if written by a senior defense attorney with decades of trial experience.

Today is {today}."""

JUDGE_PROMPT = """You are a senior judicial analyst and former appellate judge providing an objective assessment of a criminal case after reviewing both the prosecution's and defense's full briefs.

Your analysis serves public defenders by cutting through adversarial advocacy to identify what actually matters. Write in markdown with the following sections:

## I. CASE OVERVIEW
Brief factual summary (3-4 sentences). Identify the charges and their statutory basis.

## II. ARGUMENT STRENGTH SCORECARD
Create a detailed table evaluating each contested issue:

| Issue | Prosecution | Defense | Edge | Notes |
|-------|------------|---------|------|-------|

Rate each side as **Strong**, **Moderate**, or **Weak** on each issue. "Edge" indicates which side has the stronger position. Be specific in notes.

## III. CRITICAL FINDINGS

### Strongest Prosecution Argument
Identify it and explain why it's strong.

### Strongest Defense Argument
Identify it and explain why it's strong.

### Most Vulnerable Prosecution Argument
Where the prosecution is weakest and most likely to lose.

### Most Vulnerable Defense Argument
Where the defense overreaches or has the least support.

## IV. EVIDENTIARY GAPS
What evidence would be dispositive? What key questions remain unanswered? What investigation should the defense prioritize?

## V. OUTCOME PREDICTION
Provide percentage probability estimates for each count:

| Count | Conviction % | Acquittal % | Key Factor |
|-------|-------------|-------------|------------|

Explain your reasoning. Factor in typical jury behavior, the judge's likely rulings on motions, and the strength of the evidence.

## VI. STRATEGIC RECOMMENDATIONS FOR THE DEFENSE
Specific, prioritized, actionable guidance:
1. **Motions to File** — ranked by priority and likelihood of success
2. **Investigation Steps** — what to pursue before trial
3. **Plea Negotiation Strategy** — whether to negotiate and from what position
4. **Trial Preparation** — if going to trial, what to focus on
5. **Key Decision Point** — the single most important strategic choice facing the defense

Be objective, analytical, and precise. Reference specific arguments from both briefs. Your role is to help the public defender make the best possible decisions for their client.

Today is {today}."""

MOTION_PROMPT = """You are a senior criminal defense attorney and legal writing specialist drafting a formal pre-trial motion for filing in a Georgia state court.

Write a comprehensive, court-ready motion document using proper legal formatting and markdown. This document must be thorough enough that a supervising attorney could review, sign, and file it with minimal edits.

## REQUIRED STRUCTURE

### 1. CAPTION
Full court caption in proper Georgia format:
- Court name (e.g., "IN THE SUPERIOR COURT OF FULTON COUNTY, STATE OF GEORGIA")
- Case number
- STATE OF GEORGIA v. [Defendant Name]
- Title of Motion

### 2. PRELIMINARY STATEMENT
Brief overview of what relief is being sought and why.

### 3. STATEMENT OF FACTS
Detailed chronological narrative. Include:
- Dates, times, locations
- Actions of law enforcement
- Actions of the defendant
- Procedural history
- Any relevant prior proceedings

### 4. LEGAL ARGUMENT
This is the core of the motion. Structure with clear headings (## A., ## B., etc.):
- State the legal standard for the relief sought
- Apply the standard to the facts of this case
- Cite Georgia statutes (O.C.G.A. §) and case law
- Cite relevant U.S. Supreme Court decisions
- Address likely prosecution counterarguments
- Include block quotations from key authorities

### 5. CONCLUSION AND PRAYER FOR RELIEF
Specific relief requested, in numbered format if multiple items.

### 6. CERTIFICATE OF SERVICE
Standard Georgia certificate of service format.

### 7. SIGNATURE BLOCK
Attorney signature block with placeholder.

## CITATION RULES
- Use well-known Georgia appellate decisions and U.S. Supreme Court precedents
- Proper Bluebook citation format
- Include pinpoint citations where possible
- Do NOT fabricate case citations — only cite cases you are confident exist

## WRITING STYLE
- Professional, persuasive legal prose
- Short paragraphs for readability
- Use **bold** for key phrases and legal standards
- Use > blockquotes for important case quotations
- Tables for comparing facts/elements where helpful

Today is {today}."""

CHAT_PROMPT = """You are Case Nexus, an AI legal caseload assistant for a public defender.

You have the COMPLETE caseload loaded — every active case with full details. The attorney can ask you ANYTHING about their cases, and you should answer by cross-referencing the actual case data.

## HOW TO RESPOND

1. **Be specific** — Always cite case numbers, defendant names, dates, and charges. Never give vague answers when you have the data.
2. **Be practical** — Give actionable advice, not academic analysis. This attorney is busy.
3. **Cross-reference** — When answering about one case, check if other cases have relevant connections (same officer, judge, witness, charge type, etc.).
4. **Format clearly** — Use markdown: headers, bullet points, bold for case numbers and names, tables for comparisons.
5. **Think like a defense attorney** — Every answer should be oriented toward helping the defense.
6. **Be concise but complete** — Answer the question fully, but don't pad. A PD has 200 cases and no time for fluff.

## WHAT YOU CAN ANSWER

- Questions about specific cases ("What's happening with CR-2025-0051?")
- Cross-case analysis ("Which cases involve Officer Freeman?")
- Deadline tracking ("What cases have hearings this week?")
- Comparative analysis ("Compare plea offers across my DUI cases")
- Strategy questions ("Which cases should I prioritize today?")
- Pattern finding ("Do any of my cases share witnesses?")
- Quick legal research ("What's the speedy trial deadline for CR-2025-0089?")

Today is {today}. Calculate all deadlines precisely from this date."""

HEARING_PREP_PROMPT = """You are Case Nexus, preparing a rapid hearing brief for a public defender who is walking into court in 10 minutes.

This must be FAST and ACTIONABLE. No fluff. The attorney will read this on their phone while walking to the courtroom.

Generate a hearing prep brief in markdown with EXACTLY these sections:

## CASE AT A GLANCE
- One-line case summary (defendant, charges, severity)
- Today's hearing type and what it's for
- Judge name + any notes from their other cases

## KEY FACTS (5 bullets max)
The 5 most important facts, in order of importance.

## YOUR ARGUMENTS TODAY
Numbered list of what to say/ask for in this hearing, with the legal basis for each.

## WHAT THE PROSECUTION WILL SAY
Their likely arguments and your one-line response to each.

## JUDGE TENDENCIES
Based on the other cases with this judge in the caseload, note any patterns (lenient on bond? tough on DUI? granted suppression motions before?).

## ONE THING TO REMEMBER
The single most important thing the attorney must not forget.

Keep the ENTIRE brief under 500 words. Speed over completeness. Today is {today}."""

CLIENT_LETTER_PROMPT = """You are Case Nexus, drafting a letter from a public defender to their client.

Write a clear, empathetic, professional letter that a non-lawyer can understand. The client may have limited education, may be anxious, and may not speak English as a first language — use simple, direct language.

## LETTER FORMAT

Use markdown formatting:

**[Attorney Name]**
**Public Defender's Office**
**[County], Georgia**

**Date:** {today}

**Dear [Client Name],**

Then write the letter covering:

### 1. Current Status
What is happening with their case right now? Where does it stand? What was the last thing that happened?

### 2. What Comes Next
What is the next hearing/event? When? Where should they be and at what time?

### 3. The Plea Offer (if applicable)
If there's a plea offer, explain in PLAIN ENGLISH:
- What the prosecution is offering
- What it means practically (jail time, probation, fines, criminal record impact)
- Whether you recommend accepting, rejecting, or negotiating
- What happens if they reject it (trial, potential sentencing exposure)

### 4. Your Options
List the client's options clearly, numbered:
1. Accept the plea offer (explain consequences)
2. Counter-offer (explain what you'd propose)
3. Go to trial (explain risks and timeline)

### 5. What You Need From Them
Any actions the client needs to take (show up to court, bring documents, contact witnesses, etc.)

### 6. How to Reach Me
Standard contact information block.

## RULES
- NO legal jargon without explanation (if you must use a legal term, explain it in parentheses)
- Short paragraphs (2-3 sentences max)
- Active voice ("You need to come to court" not "Your presence is required")
- Warm but professional tone
- Be honest about risks — don't sugarcoat, but don't terrorize either

Today is {today}."""

EVIDENCE_ANALYSIS_PROMPT = """You are Case Nexus, a forensic evidence analyst for a public defender's office. You are examining a piece of evidence using your visual analysis capabilities.

Analyze this evidence image in the context of the criminal case. Provide a thorough, defense-oriented analysis using markdown:

## Visual Observations
Describe exactly what you see in the image. Be precise about details, lighting, quality, and any limitations.

## Evidentiary Significance
How does this evidence relate to the charges? What does it prove or fail to prove? What are its strengths and weaknesses from a legal standpoint?

## Defense Opportunities
What aspects of this evidence could benefit the defense? Look for:
- Quality issues (poor lighting, low resolution, obstructions)
- Chain of custody concerns
- Alternative interpretations of what's shown
- Missing context that could change the interpretation
- Procedural issues with how the evidence was collected

## Recommended Actions
Specific steps the defense attorney should take regarding this evidence (e.g., motions to suppress, expert consultations, additional investigation).

## Admissibility Assessment
Could this evidence face challenges to admissibility? On what grounds?

Be thorough, precise, and think like a defense attorney examining evidence for any weakness the prosecution's case might have. Reference specific details you observe in the image.

Today is {today}."""


CASCADE_SUMMARY_PROMPT = """You are Case Nexus, a senior strategic analyst for a public defender's office. You have just completed a multi-phase intelligence cascade:

1. A full caseload health check that scanned ALL cases
2. Deep-dive analyses on the most critical cases identified by the health check

Your job: synthesize everything into a UNIFIED DEFENSE STRATEGY that connects the dots across cases.

Write a strategic brief in markdown with these sections:

## Executive Strategic Summary
2-3 paragraphs connecting the most important findings across all analyses.

## Cross-Case Patterns Discovered
Patterns that ONLY become visible when you analyze multiple cases together. This is the intelligence that a human couldn't see carrying 280 cases.

## Recommended Strategic Priorities
Numbered list of the 5 most impactful actions, ordered by urgency. For each:
- What to do
- Which cases it affects
- Why it matters NOW

## Risk Matrix
A markdown table: | Case | Risk Level | Key Issue | Deadline | Recommended Action |

## What Changed
What does the attorney now know that they didn't know before this cascade? Be specific.

Today is {today}."""

SMART_ACTIONS_PROMPT = """You are Case Nexus. Based on the analysis just completed, suggest 3-5 specific next actions the attorney should take.

Return ONLY valid JSON — an array of action objects:
```json
[
  {{
    "label": "Short button label (max 6 words)",
    "action_type": "deep_analysis|adversarial|motion|hearing_prep|client_letter|investigate",
    "case_number": "CR-2025-XXXX or null",
    "motion_type": "Motion to Suppress Evidence (only if action_type is motion)",
    "reason": "One sentence explaining why this action matters now",
    "urgency": "critical|high|medium"
  }}
]
```

Rules:
- Actions must be SPECIFIC to the analysis findings, not generic
- Include the case_number when the action targets a specific case
- Order by urgency (critical first)
- At least one action should reference a cross-case pattern if one was found
- motion_type must be one of: Motion to Suppress Evidence, Motion to Dismiss, Brady Motion, Motion to Compel Discovery, Motion for Speedy Trial, Motion to Reduce Bond"""

WIDGET_PROMPT = """You are Case Nexus, an AI analyst for a public defender's office. The attorney has requested a custom dashboard widget. Using the full caseload data provided, generate the requested analysis.

Format your response in clear markdown. If the request involves data that can be tabulated, USE TABLES. If it involves comparisons, use structured sections. Be comprehensive but focused on what was asked.

Important:
- Reference specific case numbers (CR-2025-XXXX)
- Include concrete data points, not vague summaries
- If you identify something concerning, flag it clearly
- Optimize for at-a-glance readability — the attorney is busy

Today is {today}."""


# ============================================================
#  ANALYSIS FUNCTIONS
# ============================================================

def run_health_check(caseload_context: str, emit_callback=None) -> dict:
    """Scan the entire caseload for risks, connections, and opportunities.

    This is the hero feature — loads ALL cases into the 1M context window
    and uses 60K tokens of extended thinking to systematically analyze.
    """
    from datetime import date
    today = date.today().isoformat()

    if emit_callback:
        emit_callback("health_check_started", {
            "status": "Loading entire caseload into context...",
            "context_size": len(caseload_context),
        })

    return _run_streaming_analysis(
        system_prompt=HEALTH_CHECK_PROMPT.replace("{today}", today),
        user_content=caseload_context + "\n\nPerform a complete caseload health check. Scan EVERY case. Today is " + today + ".",
        max_tokens=HEALTH_CHECK_MAX_TOKENS,
        thinking_budget=HEALTH_CHECK_THINKING,
        emit_callback=emit_callback,
        event_prefix="health_check",
    )


def run_deep_analysis(case_context: str, caseload_context: str = "",
                      emit_callback=None) -> dict:
    """Deep-dive analysis of a single case with optional caseload context."""
    from datetime import date
    today = date.today().isoformat()

    full_context = case_context
    if caseload_context:
        full_context += "\n\n---\n\n# RELATED CASELOAD CONTEXT\n" + caseload_context

    if emit_callback:
        emit_callback("deep_analysis_started", {
            "status": "Analyzing case in depth..."
        })

    return _run_streaming_analysis(
        system_prompt=DEEP_ANALYSIS_PROMPT.replace("{today}", today),
        user_content=full_context + "\n\nProvide a comprehensive defense strategy analysis. Today is " + today + ".",
        max_tokens=DEEP_ANALYSIS_MAX_TOKENS,
        thinking_budget=DEEP_ANALYSIS_THINKING,
        emit_callback=emit_callback,
        event_prefix="deep_analysis",
    )


def run_adversarial_simulation(case_context: str, emit_callback=None) -> dict:
    """Three-phase adversarial analysis: prosecution, defense, then judicial analysis.

    All three phases use extended thinking — 80K+ tokens of visible reasoning.
    This is the "Keep Thinking Prize" feature: three distinct reasoning chains
    that build on each other to give public defenders a complete strategic picture.
    """
    from datetime import date
    today = date.today().isoformat()

    # Phase 1: Prosecution builds their case
    if emit_callback:
        emit_callback("adversarial_phase", {
            "phase": "prosecution",
            "phase_number": 1,
            "status": "Prosecution building their case..."
        })

    prosecution = _run_streaming_analysis(
        system_prompt=PROSECUTION_PROMPT.replace("{today}", today),
        user_content=case_context + "\n\nBuild the strongest prosecution case. Write a comprehensive, court-ready prosecution brief.",
        max_tokens=ADVERSARIAL_MAX_TOKENS,
        thinking_budget=ADVERSARIAL_THINKING,
        emit_callback=emit_callback,
        event_prefix="prosecution",
    )

    if not prosecution.get("success"):
        return prosecution

    # Phase 2: Defense responds to prosecution's analysis
    if emit_callback:
        emit_callback("adversarial_phase", {
            "phase": "defense",
            "phase_number": 2,
            "status": "Defense dismantling prosecution arguments..."
        })

    defense_context = (
        case_context +
        "\n\n---\n\n# PROSECUTION'S FULL BRIEF (your opponent's complete strategy — use this to your advantage)\n\n" +
        prosecution.get("response", "") +
        "\n\n---\n\nSystematically dismantle every prosecution argument. You have their entire playbook — exploit every weakness, challenge every assumption, and build an airtight defense."
    )

    defense = _run_streaming_analysis(
        system_prompt=DEFENSE_PROMPT.replace("{today}", today),
        user_content=defense_context,
        max_tokens=ADVERSARIAL_MAX_TOKENS,
        thinking_budget=ADVERSARIAL_THINKING,
        emit_callback=emit_callback,
        event_prefix="defense",
    )

    if not defense.get("success"):
        return {
            "success": True,
            "prosecution": prosecution,
            "defense": defense,
        }

    # Phase 3: Judicial analysis — objective synthesis of both sides
    if emit_callback:
        emit_callback("adversarial_phase", {
            "phase": "judge",
            "phase_number": 3,
            "status": "Judicial analysis synthesizing both arguments..."
        })

    judge_context = (
        case_context +
        "\n\n---\n\n# PROSECUTION'S BRIEF\n\n" +
        prosecution.get("response", "") +
        "\n\n---\n\n# DEFENSE'S BRIEF\n\n" +
        defense.get("response", "") +
        "\n\n---\n\nProvide your objective judicial analysis. Evaluate both sides, score the arguments, predict the outcome, and provide strategic recommendations for the defense."
    )

    judge = _run_streaming_analysis(
        system_prompt=JUDGE_PROMPT.replace("{today}", today),
        user_content=judge_context,
        max_tokens=JUDGE_MAX_TOKENS,
        thinking_budget=JUDGE_THINKING,
        emit_callback=emit_callback,
        event_prefix="judge",
    )

    return {
        "success": True,
        "prosecution": prosecution,
        "defense": defense,
        "judge": judge,
    }


def generate_motion(case_context: str, motion_type: str,
                    analysis_context: str = "", emit_callback=None) -> dict:
    """Generate a comprehensive legal motion using 128K output.

    This showcases Opus 4.6's ability to produce extremely long,
    coherent, well-structured legal writing.
    """
    from datetime import date
    today = date.today().isoformat()

    content_parts = [case_context]
    if analysis_context:
        content_parts.append(f"\n\n---\n\n# PRIOR ANALYSIS\n\n{analysis_context}")
    content_parts.append(
        f"\n\nDraft a {motion_type} for this case. Make it comprehensive, "
        f"well-cited, and ready for attorney review. Use standard Georgia "
        f"criminal procedure format. Today is {today}."
    )

    if emit_callback:
        emit_callback("motion_started", {
            "motion_type": motion_type,
            "status": f"Drafting {motion_type}..."
        })

    return _run_streaming_analysis(
        system_prompt=MOTION_PROMPT.replace("{today}", today),
        user_content="\n".join(content_parts),
        max_tokens=MOTION_MAX_TOKENS,
        thinking_budget=MOTION_THINKING,
        emit_callback=emit_callback,
        event_prefix="motion",
    )


def run_chat(caseload_context: str, message: str, chat_history: list = None,
             emit_callback=None) -> dict:
    """Conversational AI over the entire caseload.

    Loads ALL cases into the 1M context window so the attorney can
    ask any question and get answers that cross-reference all cases.
    Chat history is maintained for follow-up questions.
    """
    from datetime import date
    today = date.today().isoformat()

    # Build messages array with history
    messages = []
    if chat_history:
        for msg in chat_history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Current message includes caseload context on first message only
    if not chat_history:
        user_content = caseload_context + "\n\n---\n\nThe attorney asks: " + message
    else:
        user_content = message

    messages.append({"role": "user", "content": user_content})

    if emit_callback:
        emit_callback("chat_started", {"status": "Searching across caseload..."})

    return _run_streaming_analysis(
        system_prompt=CHAT_PROMPT.replace("{today}", today),
        user_content=user_content if not chat_history else None,
        max_tokens=CHAT_MAX_TOKENS,
        thinking_budget=CHAT_THINKING,
        emit_callback=emit_callback,
        event_prefix="chat",
        messages_override=messages if chat_history else None,
    )


def run_hearing_prep(case_context: str, caseload_context: str = "",
                     emit_callback=None) -> dict:
    """Generate a rapid hearing prep brief for a PD walking into court."""
    from datetime import date
    today = date.today().isoformat()

    full_context = case_context
    if caseload_context:
        full_context += "\n\n---\n\n# OTHER CASES WITH THIS JUDGE (for tendency analysis)\n" + caseload_context

    if emit_callback:
        emit_callback("hearing_prep_started", {"status": "Generating hearing brief..."})

    return _run_streaming_analysis(
        system_prompt=HEARING_PREP_PROMPT.replace("{today}", today),
        user_content=full_context + "\n\nGenerate a rapid hearing prep brief. Keep it under 500 words. Today is " + today + ".",
        max_tokens=HEARING_PREP_MAX_TOKENS,
        thinking_budget=HEARING_PREP_THINKING,
        emit_callback=emit_callback,
        event_prefix="hearing_prep",
    )


def run_client_letter(case_context: str, emit_callback=None) -> dict:
    """Generate a plain-language letter to the client."""
    from datetime import date
    today = date.today().isoformat()

    if emit_callback:
        emit_callback("client_letter_started", {"status": "Drafting client letter..."})

    return _run_streaming_analysis(
        system_prompt=CLIENT_LETTER_PROMPT.replace("{today}", today),
        user_content=case_context + "\n\nWrite a clear, empathetic letter to this client explaining their case status, options, and next steps. Today is " + today + ".",
        max_tokens=CLIENT_LETTER_MAX_TOKENS,
        thinking_budget=CLIENT_LETTER_THINKING,
        emit_callback=emit_callback,
        event_prefix="client_letter",
    )


def run_cascade_summary(caseload_context: str, health_check_result: dict,
                        deep_dive_results: list, memory_context: str = "",
                        emit_callback=None) -> dict:
    """Synthesize health check + deep dives into unified strategy.

    This is the final step of the agentic cascade: the AI has already
    scanned all cases and deep-dived the critical ones. Now it connects
    the dots into actionable intelligence.
    """
    from datetime import date
    today = date.today().isoformat()

    # Build the cascade context
    parts = [caseload_context]

    if memory_context:
        parts.append(memory_context)

    # Health check findings
    hc = health_check_result
    if hc:
        parts.append("\n# HEALTH CHECK FINDINGS\n")
        if isinstance(hc, dict):
            for alert in hc.get("alerts", [])[:10]:
                parts.append(f"- [{alert.get('severity', 'info').upper()}] {alert.get('title', '')}: {alert.get('message', '')}")
            for conn in hc.get("connections", [])[:5]:
                parts.append(f"- CONNECTION: {conn.get('title', '')} — {conn.get('description', '')}")

    # Deep dive results
    for i, dd in enumerate(deep_dive_results):
        case_num = dd.get("case_number", f"Case {i+1}")
        analysis = dd.get("analysis", "")
        parts.append(f"\n# DEEP DIVE: {case_num}\n")
        if isinstance(analysis, dict):
            if analysis.get("executive_summary"):
                parts.append(str(analysis["executive_summary"])[:500])
            if analysis.get("prosecution_strength_score"):
                parts.append(f"Prosecution strength: {analysis['prosecution_strength_score']}/100")
        elif isinstance(analysis, str):
            parts.append(analysis[:500])

    full_context = "\n\n".join(parts)

    if emit_callback:
        emit_callback("cascade_summary_started", {"status": "Synthesizing strategic brief..."})

    return _run_streaming_analysis(
        system_prompt=CASCADE_SUMMARY_PROMPT.replace("{today}", today),
        user_content=full_context + "\n\nSynthesize all findings into a unified defense strategy. Connect the dots. What does the attorney need to know RIGHT NOW?",
        max_tokens=CASCADE_SUMMARY_MAX_TOKENS,
        thinking_budget=CASCADE_SUMMARY_THINKING,
        emit_callback=emit_callback,
        event_prefix="cascade_summary",
    )


def run_smart_actions(analysis_context: str, analysis_type: str,
                      emit_callback=None) -> dict:
    """Suggest context-aware next actions based on analysis findings.

    Returns structured JSON array of suggested actions with labels,
    types, case numbers, and urgency levels.
    """
    prompt = (
        f"The following {analysis_type} analysis was just completed:\n\n"
        f"{analysis_context[:3000]}\n\n"
        "Based on these findings, suggest 3-5 specific next actions."
    )

    return _run_streaming_analysis(
        system_prompt=SMART_ACTIONS_PROMPT,
        user_content=prompt,
        max_tokens=SMART_ACTIONS_MAX_TOKENS,
        thinking_budget=SMART_ACTIONS_THINKING,
        emit_callback=emit_callback,
        event_prefix="smart_actions",
    )


def run_custom_widget(caseload_context: str, request: str,
                      memory_context: str = "", emit_callback=None) -> dict:
    """Generate a custom dashboard widget from natural language request.

    The attorney describes what they want to see, and the AI builds it
    from the full caseload data.
    """
    from datetime import date
    today = date.today().isoformat()

    full_context = caseload_context
    if memory_context:
        full_context += "\n\n" + memory_context

    if emit_callback:
        emit_callback("widget_started", {"status": "Building custom widget..."})

    return _run_streaming_analysis(
        system_prompt=WIDGET_PROMPT.replace("{today}", today),
        user_content=full_context + f"\n\n---\n\nThe attorney requests: {request}",
        max_tokens=WIDGET_MAX_TOKENS,
        thinking_budget=WIDGET_THINKING,
        emit_callback=emit_callback,
        event_prefix="widget",
    )


def analyze_evidence(case_context: str, evidence_item: dict,
                     emit_callback=None) -> dict:
    """Analyze an evidence image using Opus 4.6 vision.

    This showcases Opus 4.6's multimodal capability — analyzing
    surveillance footage, injury photos, documents, and other
    evidence images in the context of the criminal case.
    """
    import base64
    from datetime import date
    today = date.today().isoformat()

    # Read the image file and convert to base64
    file_path = evidence_item.get("file_path", "")
    if file_path.startswith("/static/"):
        # Convert URL path to filesystem path
        import os
        file_path = os.path.join(os.path.dirname(__file__), file_path.lstrip("/"))

    try:
        with open(file_path, "rb") as f:
            image_data = base64.standard_b64encode(f.read()).decode("utf-8")
    except FileNotFoundError:
        return {"success": False, "error": f"Evidence file not found: {file_path}"}

    # Determine media type
    if file_path.endswith(".png"):
        media_type = "image/png"
    elif file_path.endswith((".jpg", ".jpeg")):
        media_type = "image/jpeg"
    else:
        media_type = "image/png"

    # Build the user message with both text and image
    evidence_context = (
        f"# EVIDENCE ITEM\n"
        f"- Type: {evidence_item.get('evidence_type', 'unknown')}\n"
        f"- Title: {evidence_item.get('title', 'Untitled')}\n"
        f"- Description: {evidence_item.get('description', '')}\n"
        f"- Source: {evidence_item.get('source', 'Unknown')}\n"
        f"- Date Collected: {evidence_item.get('date_collected', 'Unknown')}\n"
    )

    user_content = [
        {"type": "text", "text": case_context + "\n\n---\n\n" + evidence_context +
         "\n\nAnalyze the following evidence image in the context of this case. "
         "Provide a thorough defense-oriented forensic analysis."},
        {"type": "image", "source": {
            "type": "base64",
            "media_type": media_type,
            "data": image_data,
        }},
    ]

    if emit_callback:
        emit_callback("evidence_analysis_started", {
            "evidence_type": evidence_item.get("evidence_type", ""),
            "title": evidence_item.get("title", ""),
            "status": f"Analyzing {evidence_item.get('title', 'evidence')}..."
        })

    # Use the streaming engine but with multimodal content
    thinking_text = ""
    response_text = ""

    try:
        with client.messages.stream(
            model=MODEL,
            max_tokens=EVIDENCE_MAX_TOKENS,
            thinking={
                "type": "enabled",
                "budget_tokens": EVIDENCE_THINKING,
            },
            system=EVIDENCE_ANALYSIS_PROMPT.replace("{today}", today),
            messages=[{"role": "user", "content": user_content}],
        ) as stream:
            current_block_type = None

            for event in stream:
                if not hasattr(event, "type"):
                    continue

                if event.type == "content_block_start":
                    block = getattr(event, "content_block", None)
                    if block:
                        current_block_type = block.type
                        if block.type == "thinking" and emit_callback:
                            emit_callback("evidence_thinking_started", {})
                        elif block.type == "text" and emit_callback:
                            emit_callback("evidence_response_started", {})

                elif event.type == "content_block_delta":
                    delta = getattr(event, "delta", None)
                    if delta and delta.type == "thinking_delta":
                        chunk = delta.thinking
                        thinking_text += chunk
                        if emit_callback:
                            emit_callback("evidence_thinking_delta", {"text": chunk})
                    elif delta and delta.type == "text_delta":
                        chunk = delta.text
                        response_text += chunk
                        if emit_callback:
                            emit_callback("evidence_response_delta", {"text": chunk})

                elif event.type == "content_block_stop":
                    if current_block_type == "thinking" and emit_callback:
                        emit_callback("evidence_thinking_complete", {
                            "total_length": len(thinking_text)
                        })
                    current_block_type = None

        if emit_callback:
            emit_callback("evidence_analysis_complete", {
                "thinking_length": len(thinking_text),
                "response_length": len(response_text),
                "success": True,
            })

        return {
            "thinking": thinking_text,
            "response": response_text,
            "success": True,
        }

    except anthropic.APIError as e:
        msg = f"Claude API error: {e}"
        if emit_callback:
            emit_callback("evidence_analysis_error", {"error": msg})
        return {"success": False, "error": msg}
    except Exception as e:
        msg = f"Evidence analysis error: {e}"
        if emit_callback:
            emit_callback("evidence_analysis_error", {"error": msg})
        return {"success": False, "error": msg}


# ============================================================
#  CORE STREAMING ENGINE
# ============================================================

def _run_streaming_analysis(system_prompt: str, user_content: str,
                            max_tokens: int, thinking_budget: int,
                            emit_callback=None, event_prefix: str = "analysis",
                            messages_override: list = None) -> dict:
    """Core streaming function that pipes extended thinking to the UI.

    Every thinking token streams to the frontend via SocketIO so users
    can watch Claude reason in real-time. This is the core UX of Case Nexus.
    """
    thinking_text = ""
    response_text = ""

    # Use messages_override for chat history, otherwise single user message
    messages = messages_override or [{"role": "user", "content": user_content}]

    try:
        with client.messages.stream(
            model=MODEL,
            max_tokens=max_tokens,
            thinking={
                "type": "enabled",
                "budget_tokens": thinking_budget,
            },
            system=system_prompt,
            messages=messages,
        ) as stream:
            current_block_type = None

            for event in stream:
                if not hasattr(event, "type"):
                    continue

                if event.type == "content_block_start":
                    block = getattr(event, "content_block", None)
                    if block:
                        current_block_type = block.type
                        if block.type == "thinking" and emit_callback:
                            emit_callback(f"{event_prefix}_thinking_started", {})
                        elif block.type == "text" and emit_callback:
                            emit_callback(f"{event_prefix}_response_started", {})

                elif event.type == "content_block_delta":
                    delta = getattr(event, "delta", None)
                    if delta and delta.type == "thinking_delta":
                        chunk = delta.thinking
                        thinking_text += chunk
                        if emit_callback:
                            emit_callback(f"{event_prefix}_thinking_delta", {
                                "text": chunk
                            })
                    elif delta and delta.type == "text_delta":
                        chunk = delta.text
                        response_text += chunk
                        if emit_callback:
                            emit_callback(f"{event_prefix}_response_delta", {
                                "text": chunk
                            })

                elif event.type == "content_block_stop":
                    if current_block_type == "thinking" and emit_callback:
                        emit_callback(f"{event_prefix}_thinking_complete", {
                            "total_length": len(thinking_text)
                        })
                    current_block_type = None

        # Grab usage from the final streamed message
        final_message = stream.get_final_message()
        usage = {}
        if final_message and hasattr(final_message, "usage"):
            u = final_message.usage
            usage = {
                "input_tokens": getattr(u, "input_tokens", 0),
                "output_tokens": getattr(u, "output_tokens", 0),
            }

        parsed = _parse_json_response(response_text)

        if emit_callback:
            emit_callback(f"{event_prefix}_complete", {
                "thinking_length": len(thinking_text),
                "response_length": len(response_text),
                "success": True,
                "usage": usage,
            })

        return {
            "thinking": thinking_text,
            "response": response_text,
            "parsed": parsed,
            "success": True,
            "usage": usage,
        }

    except anthropic.APIError as e:
        msg = f"Claude API error: {e}"
        if emit_callback:
            emit_callback(f"{event_prefix}_error", {"error": msg})
        return {"success": False, "error": msg}
    except Exception as e:
        msg = f"Analysis error: {e}"
        if emit_callback:
            emit_callback(f"{event_prefix}_error", {"error": msg})
        return {"success": False, "error": msg}


def _parse_json_response(raw: str) -> dict | None:
    """Parse Claude's JSON response, handling markdown fences and mixed content."""
    if not raw:
        return None

    text = raw.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl > 0:
            text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    return None
