"""CourtListener API Client — Citation verification and case law search.

Integrates with Free Law Project's CourtListener API to:
1. Verify legal citations in AI-generated motions (anti-hallucination)
2. Search for relevant case law by jurisdiction and topic
3. Retrieve full opinion text for context grounding

API docs: https://www.courtlistener.com/help/api/
"""

import os
import re
import requests
from typing import Optional

COURTLISTENER_BASE = "https://www.courtlistener.com"
CITATION_LOOKUP_URL = f"{COURTLISTENER_BASE}/api/rest/v3/citation-lookup/"
SEARCH_URL = f"{COURTLISTENER_BASE}/api/rest/v4/search/"
OPINIONS_URL = f"{COURTLISTENER_BASE}/api/rest/v4/opinions/"

# Optional API token for higher rate limits
API_TOKEN = os.getenv("COURTLISTENER_API_TOKEN", "")


def _headers() -> dict:
    h = {"Content-Type": "application/x-www-form-urlencoded"}
    if API_TOKEN:
        h["Authorization"] = f"Token {API_TOKEN}"
    return h


def _auth_headers() -> dict:
    h = {}
    if API_TOKEN:
        h["Authorization"] = f"Token {API_TOKEN}"
    return h


# ============================================================
#  CITATION VERIFICATION
# ============================================================

def verify_citations(text: str) -> dict:
    """Submit text to CourtListener's citation-lookup endpoint.

    Extracts and verifies all legal citations found in the text.
    Returns verified, unverified, and ambiguous citations.

    Args:
        text: Legal text containing citations (up to ~64K chars)

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
    # Truncate to API limit (~64K chars)
    if len(text) > 64000:
        text = text[:64000]

    try:
        resp = requests.post(
            CITATION_LOOKUP_URL,
            data={"text": text},
            headers=_headers(),
            timeout=30,
        )

        if resp.status_code == 429:
            return {
                "verified": [], "not_found": [], "ambiguous": [],
                "total_found": 0, "verified_count": 0,
                "error": "Rate limited — try again in a moment",
            }

        if resp.status_code != 200:
            return {
                "verified": [], "not_found": [], "ambiguous": [],
                "total_found": 0, "verified_count": 0,
                "error": f"API returned status {resp.status_code}",
            }

        citations = resp.json()
        return _parse_citation_results(citations)

    except requests.Timeout:
        return {
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": 0, "verified_count": 0,
            "error": "Citation lookup timed out",
        }
    except Exception as e:
        return {
            "verified": [], "not_found": [], "ambiguous": [],
            "total_found": 0, "verified_count": 0,
            "error": str(e),
        }


def _parse_citation_results(citations: list) -> dict:
    """Parse the citation-lookup API response into verified/not_found/ambiguous."""
    verified = []
    not_found = []
    ambiguous = []

    for c in citations:
        citation_text = c.get("citation", "")
        normalized = c.get("normalized_citations", [])
        status = c.get("status", 0)
        clusters = c.get("clusters", [])

        entry = {
            "citation": citation_text,
            "normalized": normalized[0] if normalized else citation_text,
            "start_index": c.get("start_index", 0),
            "end_index": c.get("end_index", 0),
        }

        if status == 200 and clusters:
            cluster = clusters[0] if isinstance(clusters, list) else clusters
            cluster_url = ""
            case_name = ""
            if isinstance(cluster, dict):
                cluster_url = cluster.get("absolute_url", "")
                case_name = cluster.get("case_name", "")
            elif isinstance(cluster, str):
                cluster_url = cluster

            entry["url"] = f"{COURTLISTENER_BASE}{cluster_url}" if cluster_url and not cluster_url.startswith("http") else cluster_url
            entry["case_name"] = case_name
            entry["status"] = "verified"
            verified.append(entry)
        elif status == 404:
            entry["status"] = "not_found"
            not_found.append(entry)
        else:
            entry["status"] = "ambiguous"
            ambiguous.append(entry)

    return {
        "verified": verified,
        "not_found": not_found,
        "ambiguous": ambiguous,
        "total_found": len(citations),
        "verified_count": len(verified),
        "error": None,
    }


# ============================================================
#  CASE LAW SEARCH
# ============================================================

def search_opinions(query: str, court: str = "ga",
                    max_results: int = 5) -> list:
    """Search CourtListener for relevant case law opinions.

    Args:
        query: Natural language or citation search query
        court: Court abbreviation (default: Georgia)
        max_results: Number of results to return

    Returns:
        List of opinion summaries with URLs
    """
    params = {
        "q": query,
        "type": "o",  # opinions
        "court": court,
        "order_by": "score desc",
        "page_size": max_results,
    }

    try:
        resp = requests.get(
            SEARCH_URL,
            params=params,
            headers=_auth_headers(),
            timeout=15,
        )
        if resp.status_code != 200:
            return []

        data = resp.json()
        results = []
        for item in data.get("results", [])[:max_results]:
            results.append({
                "case_name": item.get("caseName", ""),
                "citation": item.get("citation", [""]),
                "court": item.get("court", ""),
                "date_filed": item.get("dateFiled", ""),
                "snippet": item.get("snippet", ""),
                "url": f"{COURTLISTENER_BASE}{item.get('absolute_url', '')}",
            })
        return results

    except Exception:
        return []


# ============================================================
#  EXTRACT CITATIONS FROM TEXT (local regex fallback)
# ============================================================

# Pattern matches common legal citation formats
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
    """Search CourtListener for relevant precedents based on charges.

    Results are cached per-session to avoid redundant API calls.
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

    return "## RELEVANT CASE LAW (from CourtListener API)\n\n" + "\n".join(parts)


def extract_citations_local(text: str) -> list[str]:
    """Extract legal citations from text using regex (no API call).

    Useful as a fast pre-check before hitting the API.
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
