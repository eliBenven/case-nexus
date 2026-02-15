"""Citation Verification & Case Law Search — Claude Opus 4.6 + Web Search.

Uses Claude's built-in web search tool to:
1. Verify legal citations in AI-generated motions (anti-hallucination)
2. Search for relevant case law by jurisdiction and topic
3. Find precedents for specific criminal charges

Replaces the previous CourtListener API integration with Claude + web search.
Claude reads the citations, searches the web to confirm they exist, and
returns structured verification results. No external API keys required.
"""

import json
import os
import re
import anthropic
from dotenv import load_dotenv

load_dotenv()

# Lazy client to avoid circular imports with ai_engine
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


MODEL = "claude-opus-4-6"

WEB_SEARCH_TOOL = {
    "type": "web_search_20250305",
    "name": "web_search",
}


def _extract_text(response) -> str:
    """Extract all text content blocks from a Claude response."""
    parts = []
    for block in response.content:
        if hasattr(block, "text"):
            parts.append(block.text)
    return "\n".join(parts)


def _extract_json_from_text(text: str):
    """Extract JSON object or array from Claude's response text."""
    # Try code blocks first
    json_match = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try the whole text
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try finding a JSON object or array
    for pattern in [r'\{[\s\S]*\}', r'\[[\s\S]*\]']:
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                continue

    return None


# ============================================================
#  CITATION VERIFICATION
# ============================================================

def verify_citations(text: str) -> dict:
    """Verify legal citations in text using Claude + web search.

    Extracts citations via regex, then asks Claude to search the web
    and confirm each one is real. Returns the same format as before:
    verified, not_found, and ambiguous citations.

    Args:
        text: Legal text containing citations

    Returns:
        {
            "verified": [{"citation": str, "normalized": str, "url": str, ...}],
            "not_found": [{"citation": str, ...}],
            "ambiguous": [{"citation": str, ...}],
            "total_found": int,
            "verified_count": int,
            "error": str or None,
        }
    """
    local_cites = extract_citations_local(text)

    if not local_cites:
        return {
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": 0, "verified_count": 0,
            "error": None,
        }

    try:
        client = _get_client()

        prompt = f"""You are a legal citation verification assistant. I have extracted the following legal citations from a legal document. For EACH citation, search the web to verify whether it is a real, valid legal citation.

Citations to verify:
{json.dumps(local_cites, indent=2)}

For each citation, determine:
- "verified": The citation refers to a real case/statute that you confirmed exists via web search
- "not_found": You searched but could not find evidence this citation exists (likely hallucinated)
- "ambiguous": You found partial matches but cannot confirm the exact citation

Return ONLY a JSON object in this exact format (no other text):
{{
  "verified": [
    {{"citation": "...", "normalized": "...", "case_name": "...", "url": "...", "status": "verified"}}
  ],
  "not_found": [
    {{"citation": "...", "normalized": "...", "status": "not_found"}}
  ],
  "ambiguous": [
    {{"citation": "...", "normalized": "...", "status": "ambiguous"}}
  ]
}}

Search Google Scholar, court databases, and legal sites. Only mark as "verified" if you find clear evidence the citation is real. Include a URL where the case can be found."""

        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            tools=[WEB_SEARCH_TOOL],
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = _extract_text(response)
        parsed = _extract_json_from_text(result_text)

        if parsed and isinstance(parsed, dict):
            verified = parsed.get("verified", [])
            not_found = parsed.get("not_found", [])
            ambiguous = parsed.get("ambiguous", [])
            return {
                "verified": verified,
                "not_found": not_found,
                "ambiguous": ambiguous,
                "total_found": len(verified) + len(not_found) + len(ambiguous),
                "verified_count": len(verified),
                "error": None,
            }

        return {
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": len(local_cites), "verified_count": 0,
            "error": "Could not parse verification results",
        }

    except Exception as e:
        return {
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": len(local_cites), "verified_count": 0,
            "error": str(e),
        }


# ============================================================
#  CASE LAW SEARCH
# ============================================================

COURT_NAMES = {
    "ga": "Georgia",
    "scotus": "U.S. Supreme Court",
    "ca11": "Eleventh Circuit",
    "ca5": "Fifth Circuit",
    "ca9": "Ninth Circuit",
}


def search_opinions(query: str, court: str = "ga",
                    max_results: int = 5) -> list:
    """Search for relevant case law using Claude + web search.

    Args:
        query: Natural language or citation search query
        court: Court abbreviation (default: Georgia)
        max_results: Number of results to return

    Returns:
        List of opinion summaries with URLs
    """
    court_name = COURT_NAMES.get(court, court)

    try:
        client = _get_client()

        prompt = f"""Search the web for relevant case law opinions about: {query}

Jurisdiction: {court_name}
Return up to {max_results} results.

For each result, provide:
- case_name: Full case name
- citation: The legal citation as an array (e.g., ["410 U.S. 113"])
- court: The court that decided the case
- date_filed: When the opinion was filed
- snippet: A brief summary or relevant excerpt (max 400 chars)
- url: A URL where the full opinion can be found

Return ONLY a JSON array (no other text):
[
  {{
    "case_name": "...",
    "citation": ["..."],
    "court": "...",
    "date_filed": "...",
    "snippet": "...",
    "url": "..."
  }}
]

Search Google Scholar, CourtListener, Casetext, Justia, and other legal databases. Only include cases you can confirm exist."""

        response = client.messages.create(
            model=MODEL,
            max_tokens=4096,
            tools=[WEB_SEARCH_TOOL],
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = _extract_text(response)
        parsed = _extract_json_from_text(result_text)

        if parsed and isinstance(parsed, list):
            return parsed[:max_results]

        return []

    except Exception:
        return []


# ============================================================
#  EXTRACT CITATIONS FROM TEXT (local regex — no API call)
# ============================================================

CITATION_PATTERN = re.compile(
    r'\b(\d{1,3})\s+'
    r'(U\.S\.|S\.\s*Ct\.|L\.\s*Ed\.|F\.\d[a-z]*|F\.\s*Supp\.\s*\d*'
    r'|Ga\.|Ga\.\s*App\.|S\.E\.\d*|S\.E\.2d|A\.\d*|N\.E\.\d*'
    r'|So\.\s*\d*|P\.\d*|Cal\.\s*\d*|N\.Y\.\s*\d*)'
    r'\s+(\d{1,5})'
    r'(?:\s*\((\d{4})\))?'
)


_case_law_cache = {}  # session cache: charge_key -> results


def search_relevant_precedents(charges: list[str], jurisdiction: str = "ga",
                                max_per_charge: int = 3) -> str:
    """Search for relevant precedents based on charges.

    Results are cached per-session to avoid redundant calls.
    Returns formatted text suitable for injection into AI context.
    """
    parts = []
    for charge in charges:
        cache_key = f"{charge}:{jurisdiction}"
        if cache_key in _case_law_cache:
            results = _case_law_cache[cache_key]
        else:
            results = search_opinions(charge, court=jurisdiction, max_results=max_per_charge)
            _case_law_cache[cache_key] = results

        if results:
            parts.append(f"### Precedents for: {charge}")
            for r in results:
                cite = r.get("citation", [""])[0] if isinstance(r.get("citation"), list) else r.get("citation", "")
                parts.append(
                    f"- **{r.get('case_name', 'Unknown')}** ({cite}, {r.get('date_filed', '')}): "
                    f"{r.get('snippet', 'No excerpt available.')}"
                )

    if not parts:
        return ""

    return "## RELEVANT CASE LAW (verified via web search)\n\n" + "\n".join(parts)


def extract_citations_local(text: str) -> list[str]:
    """Extract legal citations from text using regex (no API call).

    Useful as a fast pre-check before sending to Claude for verification.
    """
    matches = CITATION_PATTERN.findall(text)
    citations = []
    for m in matches:
        vol, reporter, page, year = m
        cite = f"{vol} {reporter} {page}"
        if year:
            cite += f" ({year})"
        citations.append(cite)
    return list(set(citations))
