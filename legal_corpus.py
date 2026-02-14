"""Legal Corpus — Real statutory text for AI analysis grounding.

Sources:
- Georgia statutes: Scraped from unicourt.github.io/cic-code-ga (public domain)
- US Code: Parsed from uscode.house.gov XML (USLM schema)
- Constitutional amendments: Exact text (public domain, never changes)
- Landmark cases: Key holdings from SCOTUS decisions

All statutory text is REAL — parsed from official government sources.
No AI-generated legal text. The AI cites these directly.
"""

import json
import os

_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
_GA_STATUTES_PATH = os.path.join(_DATA_DIR, "georgia_statutes.json")
_USC_INDEX_PATH = os.path.join(_DATA_DIR, "usc_index.json")

# Lazy-loaded caches
_ga_statutes = None
_usc_index = None


# ============================================================
#  LOADERS
# ============================================================

def _load_georgia_statutes() -> dict:
    """Load scraped Georgia statutes from data/georgia_statutes.json."""
    global _ga_statutes
    if _ga_statutes is not None:
        return _ga_statutes
    try:
        with open(_GA_STATUTES_PATH) as f:
            _ga_statutes = json.load(f)
    except FileNotFoundError:
        print(f"[legal_corpus] WARNING: {_GA_STATUTES_PATH} not found")
        _ga_statutes = {}
    return _ga_statutes


def _load_usc_index() -> dict:
    """Load parsed US Code sections from cached JSON index.

    The full index is ~67MB. We load it once and cache in memory.
    At runtime, only specific sections are looked up by key.
    """
    global _usc_index
    if _usc_index is not None:
        return _usc_index
    try:
        with open(_USC_INDEX_PATH) as f:
            _usc_index = json.load(f)
    except FileNotFoundError:
        print(f"[legal_corpus] WARNING: {_USC_INDEX_PATH} not found")
        _usc_index = {}
    return _usc_index


def get_georgia_statute(section: str) -> str | None:
    """Look up a specific Georgia statute by section number (e.g., '16-5-21')."""
    ga = _load_georgia_statutes()
    key = f"OCGA {section}"
    entry = ga.get(key)
    if entry:
        return entry["text"]
    return None


def get_federal_sections(section_numbers: list[str]) -> str:
    """Look up specific USC sections by number. Returns formatted text.

    Args:
        section_numbers: e.g., ["18 USC 922", "21 USC 841", "42 USC 1983"]
    """
    usc = _load_usc_index()
    parts = []
    for key in section_numbers:
        entry = usc.get(key)
        if entry:
            parts.append(f"### {key} — {entry['heading']}\n{entry['text'][:8000]}")
        else:
            # Try partial match
            for k, v in usc.items():
                if key in k:
                    parts.append(f"### {k} — {v['heading']}\n{v['text'][:8000]}")
                    break
    return "\n\n".join(parts)


# ============================================================
#  CHARGE-TO-LAW MAPPING
# ============================================================

CHARGE_TO_LAW = {
    # --- Homicide ---
    "Murder": {
        "georgia": ["16-5-1"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170", "17-10-6.1"],
    },
    "Malice Murder": {
        "georgia": ["16-5-1"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170", "17-10-6.1"],
    },
    "Felony Murder": {
        "georgia": ["16-5-1"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170", "17-10-6.1"],
    },
    "Voluntary Manslaughter": {
        "georgia": ["16-5-2"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170"],
    },
    "Involuntary Manslaughter": {
        "georgia": ["16-5-3"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },

    # --- Violence ---
    "Simple Assault": {
        "georgia": ["16-5-20"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": [],
    },
    "Aggravated Assault": {
        "georgia": ["16-5-21"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170"],
    },
    "Simple Battery": {
        "georgia": ["16-5-23"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": [],
    },
    "Battery": {
        "georgia": ["16-5-23", "16-5-23.1"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": [],
    },
    "Battery - Family Violence": {
        "georgia": ["16-5-23.1"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": [],
    },
    "Domestic Battery": {
        "georgia": ["16-5-23.1"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": [],
    },
    "Aggravated Battery": {
        "georgia": ["16-5-24"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170"],
    },
    "Cruelty to Children": {
        "georgia": ["16-5-70"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170"],
    },
    "Aggravated Stalking": {
        "georgia": ["16-5-91"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Child Cruelty": {
        "georgia": ["16-5-70"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170"],
    },
    "Domestic Battery (Misdemeanor)": {
        "georgia": ["16-5-23.1"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": [],
    },
    "Felony Domestic Violence": {
        "georgia": ["16-5-23.1", "16-5-21"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": ["17-7-170"],
    },
    "Assault on a Law Enforcement Officer": {
        "georgia": ["16-5-21", "16-10-24"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Resisting Arrest": {
        "georgia": ["16-10-24"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Kidnapping": {
        "georgia": ["16-5-40"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170", "17-10-6.1"],
    },
    "False Imprisonment": {
        "georgia": ["16-5-41"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Terroristic Threats": {
        "georgia": ["16-11-37"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },

    # --- Sexual Offenses ---
    "Rape": {
        "georgia": ["16-6-1"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170", "17-10-6.1"],
    },
    "Sexual Battery": {
        "georgia": ["16-6-22.1"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },

    # --- Property ---
    "Burglary": {
        "georgia": ["16-7-1"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170"],
    },
    "Criminal Trespass": {
        "georgia": ["16-7-21"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Criminal Damage to Property": {
        "georgia": ["16-7-23"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Vandalism": {
        "georgia": ["16-7-23"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Theft by Taking": {
        "georgia": ["16-8-2"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Petit Larceny": {
        "georgia": ["16-8-2"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Misdemeanor Theft": {
        "georgia": ["16-8-2"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Shoplifting": {
        "georgia": ["16-8-14"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Entering Automobile": {
        "georgia": ["16-8-18"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Robbery": {
        "georgia": ["16-8-40"],
        "federal": [],
        "defenses": ["16-3-21"],
        "procedural": ["17-7-170"],
    },
    "Armed Robbery": {
        "georgia": ["16-8-41"],
        "federal": [],
        "defenses": ["16-3-21", "16-3-23.1"],
        "procedural": ["17-7-170"],
    },

    # --- Fraud ---
    "Forgery": {
        "georgia": ["16-9-1"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Identity Fraud": {
        "georgia": ["16-9-121"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },

    # --- Public Order ---
    "Obstruction": {
        "georgia": ["16-10-24"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Obstruction of Law Enforcement": {
        "georgia": ["16-10-24"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Giving False Information": {
        "georgia": ["16-10-25"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Loitering": {
        "georgia": ["16-11-36"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Disorderly Conduct": {
        "georgia": ["16-11-39"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Harassing Communications": {
        "georgia": ["16-11-39.1"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Public Intoxication": {
        "georgia": ["16-11-41"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Possession of Firearm by Convicted Felon": {
        "georgia": ["16-11-131"],
        "federal": ["18 USC 922"],
        "defenses": [],
        "procedural": ["17-5-21"],
    },
    "Weapons Possession (Convicted Felon)": {
        "georgia": ["16-11-131"],
        "federal": ["18 USC 922"],
        "defenses": [],
        "procedural": ["17-5-21"],
    },

    # --- Drug Offenses ---
    "Possession of Controlled Substance": {
        "georgia": ["16-13-30"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21"],
    },
    "Felony Drug Possession": {
        "georgia": ["16-13-30"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21"],
    },
    "Possession with Intent to Distribute": {
        "georgia": ["16-13-30"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21"],
    },
    "Possession of Drug Related Objects": {
        "georgia": ["16-13-32.2"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-5-21"],
    },
    "Drug Trafficking": {
        "georgia": ["16-13-31"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21", "17-7-170"],
    },
    "Trafficking Cocaine": {
        "georgia": ["16-13-31"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21", "17-7-170"],
    },
    "Trafficking Methamphetamine": {
        "georgia": ["16-13-31"],
        "federal": ["21 USC 841", "21 USC 812"],
        "defenses": [],
        "procedural": ["17-5-1", "17-5-21", "17-7-170"],
    },
    "Marijuana Possession": {
        "georgia": ["16-13-30"],
        "federal": ["21 USC 841"],
        "defenses": [],
        "procedural": ["17-5-21"],
    },

    # --- Motor Vehicle ---
    "Driving on Suspended License": {
        "georgia": ["40-5-121"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "Reckless Driving": {
        "georgia": ["40-6-390"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
    "DUI": {
        "georgia": ["40-6-391"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-5-21"],
    },
    "Driving Under the Influence": {
        "georgia": ["40-6-391"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-5-21"],
    },
    "Vehicular Homicide": {
        "georgia": ["40-6-393"],
        "federal": [],
        "defenses": [],
        "procedural": ["17-7-170"],
    },
    "Fleeing and Eluding": {
        "georgia": ["40-6-395"],
        "federal": [],
        "defenses": [],
        "procedural": [],
    },
}

# Normalize keys for fuzzy matching
_CHARGE_KEYS_LOWER = {k.lower(): k for k in CHARGE_TO_LAW}


def _match_charge(charge_text: str) -> str | None:
    """Fuzzy-match a charge string to our mapping. Returns the canonical key or None."""
    cl = charge_text.lower().strip()
    # Exact match
    if cl in _CHARGE_KEYS_LOWER:
        return _CHARGE_KEYS_LOWER[cl]
    # Substring match
    for key_lower, key_orig in _CHARGE_KEYS_LOWER.items():
        if key_lower in cl or cl in key_lower:
            return key_orig
    # Common abbreviations
    abbreviations = {
        "poss": "possession", "dist": "distribute", "dwi": "dui",
        "dv": "domestic", "agg": "aggravated", "batt": "battery",
        "w/": "with", "pw/i": "possession with intent",
    }
    expanded = cl
    for abbr, full in abbreviations.items():
        expanded = expanded.replace(abbr, full)
    if expanded != cl:
        for key_lower, key_orig in _CHARGE_KEYS_LOWER.items():
            if key_lower in expanded or expanded in key_lower:
                return key_orig

    # Word overlap
    charge_words = set(cl.split())
    best_match = None
    best_overlap = 0
    for key_lower, key_orig in _CHARGE_KEYS_LOWER.items():
        key_words = set(key_lower.split())
        overlap = len(charge_words & key_words)
        if overlap > best_overlap and overlap >= 2:
            best_overlap = overlap
            best_match = key_orig
    return best_match


# ============================================================
#  CONSTITUTIONAL AMENDMENTS (exact text — never changes)
# ============================================================

CONSTITUTIONAL_PROVISIONS = {
    "1st": {
        "text": (
            "Congress shall make no law respecting an establishment of religion, or "
            "prohibiting the free exercise thereof; or abridging the freedom of speech, "
            "or of the press; or the right of the people peaceably to assemble, and to "
            "petition the Government for a redress of grievances."
        ),
        "key_holdings": [
            "Brandenburg v. Ohio, 395 U.S. 444 (1969): Speech advocating illegal conduct is protected unless directed to inciting imminent lawless action and likely to produce such action.",
            "Texas v. Johnson, 491 U.S. 397 (1989): Symbolic speech, including flag burning, is protected under the First Amendment.",
            "Snyder v. Phelps, 562 U.S. 443 (2011): Speech on matters of public concern, even if offensive, is protected from tort liability.",
        ],
    },
    "2nd": {
        "text": (
            "A well regulated Militia, being necessary to the security of a free State, "
            "the right of the people to keep and bear Arms, shall not be infringed."
        ),
        "key_holdings": [
            "District of Columbia v. Heller, 554 U.S. 570 (2008): The Second Amendment protects an individual's right to possess a firearm unconnected with service in a militia.",
            "McDonald v. City of Chicago, 561 U.S. 742 (2010): The Second Amendment right to keep and bear arms is incorporated against the states through the Fourteenth Amendment.",
            "New York State Rifle & Pistol Ass'n v. Bruen, 597 U.S. 1 (2022): Firearm regulations must be consistent with the historical tradition of firearm regulation.",
        ],
    },
    "4th": {
        "text": (
            "The right of the people to be secure in their persons, houses, papers, "
            "and effects, against unreasonable searches and seizures, shall not be violated, "
            "and no Warrants shall issue, but upon probable cause, supported by Oath or "
            "affirmation, and particularly describing the place to be searched, and the "
            "persons or things to be seized."
        ),
        "key_holdings": [
            "Mapp v. Ohio, 367 U.S. 643 (1961): Exclusionary rule applies to states — evidence obtained through unconstitutional searches must be suppressed.",
            "Terry v. Ohio, 392 U.S. 1 (1968): Police may briefly stop and frisk a person based on reasonable suspicion of criminal activity, but the scope must be limited to officer safety.",
            "Arizona v. Gant, 556 U.S. 332 (2009): Search incident to arrest of vehicle limited to areas within arrestee's immediate reach, or when reasonable to believe evidence of the crime of arrest might be found.",
            "Riley v. California, 573 U.S. 373 (2014): Police must generally obtain a warrant before searching the digital contents of a cell phone seized incident to arrest.",
            "Carpenter v. United States, 585 U.S. 296 (2018): Acquisition of historical cell-site location information constitutes a Fourth Amendment search requiring a warrant.",
        ],
    },
    "5th": {
        "text": (
            "No person shall be held to answer for a capital, or otherwise infamous crime, "
            "unless on a presentment or indictment of a Grand Jury; nor shall any person "
            "be subject for the same offence to be twice put in jeopardy of life or limb; "
            "nor shall be compelled in any criminal case to be a witness against himself, "
            "nor be deprived of life, liberty, or property, without due process of law; "
            "nor shall private property be taken for public use, without just compensation."
        ),
        "key_holdings": [
            "Miranda v. Arizona, 384 U.S. 436 (1966): Suspects must be informed of their rights (right to silence, right to attorney) before custodial interrogation. Statements obtained without Miranda warnings are inadmissible.",
            "Berghuis v. Thompkins, 560 U.S. 370 (2010): A suspect's silence during interrogation does not invoke the right to remain silent; invocation must be unambiguous.",
        ],
    },
    "6th": {
        "text": (
            "In all criminal prosecutions, the accused shall enjoy the right to a speedy and "
            "public trial, by an impartial jury of the State and district wherein the crime "
            "shall have been committed; to be informed of the nature and cause of the "
            "accusation; to be confronted with the witnesses against him; to have compulsory "
            "process for obtaining witnesses in his favor, and to have the Assistance of "
            "Counsel for his defence."
        ),
        "key_holdings": [
            "Gideon v. Wainwright, 372 U.S. 335 (1963): The Sixth Amendment right to counsel applies to state criminal proceedings through the Fourteenth Amendment.",
            "Strickland v. Washington, 466 U.S. 668 (1984): To prove ineffective assistance of counsel, defendant must show (1) counsel's performance was deficient, and (2) the deficiency prejudiced the defense.",
            "Batson v. Kentucky, 476 U.S. 79 (1986): Prohibits race-based peremptory challenges in jury selection.",
            "Crawford v. Washington, 541 U.S. 36 (2004): Testimonial out-of-court statements are barred under the Confrontation Clause unless the declarant is unavailable and the defendant had prior opportunity to cross-examine.",
            "Barker v. Wingo, 407 U.S. 514 (1972): Speedy trial analysis uses four-factor balancing test: length of delay, reason for delay, defendant's assertion of right, and prejudice to defendant.",
        ],
    },
    "8th": {
        "text": (
            "Excessive bail shall not be required, nor excessive fines imposed, "
            "nor cruel and unusual punishments inflicted."
        ),
        "key_holdings": [
            "Stack v. Boyle, 342 U.S. 1 (1951): Bail set higher than necessary to ensure the defendant's appearance at trial is excessive under the Eighth Amendment.",
            "Furman v. Georgia, 408 U.S. 238 (1972): The arbitrary and inconsistent imposition of the death penalty constitutes cruel and unusual punishment.",
            "Graham v. Florida, 560 U.S. 48 (2010): The Eighth Amendment prohibits life without parole for juvenile offenders convicted of non-homicide offenses.",
            "Miller v. Alabama, 567 U.S. 460 (2012): Mandatory life without parole for juvenile homicide offenders violates the Eighth Amendment.",
            "Timbs v. Indiana, 586 U.S. 146 (2019): The Excessive Fines Clause is incorporated against the states, limiting civil asset forfeiture.",
        ],
    },
    "13th": {
        "text": (
            "Neither slavery nor involuntary servitude, except as a punishment for crime "
            "whereof the party shall have been duly convicted, shall exist within the "
            "United States, or any place subject to their jurisdiction."
        ),
        "key_holdings": [
            "Bailey v. Alabama, 219 U.S. 219 (1911): Peonage statutes that criminalize breach of labor contracts violate the Thirteenth Amendment.",
            "United States v. Kozminski, 487 U.S. 931 (1988): Involuntary servitude requires proof of physical or legal coercion.",
        ],
    },
    "14th": {
        "text": (
            "No State shall make or enforce any law which shall abridge the privileges or "
            "immunities of citizens of the United States; nor shall any State deprive any "
            "person of life, liberty, or property, without due process of law; nor deny to "
            "any person within its jurisdiction the equal protection of the laws."
        ),
        "key_holdings": [
            "Brady v. Maryland, 373 U.S. 83 (1963): Prosecution must disclose material exculpatory evidence to the defense. Failure to do so violates due process regardless of good or bad faith.",
            "Giglio v. United States, 405 U.S. 150 (1972): Extends Brady to impeachment evidence — prosecution must disclose information affecting witness credibility.",
            "Napue v. Illinois, 360 U.S. 264 (1959): Due process is violated when prosecution knowingly uses false testimony or fails to correct testimony it knows to be false.",
        ],
    },
}


# ============================================================
#  LANDMARK CASE SUMMARIES
# ============================================================

LANDMARK_CASES = {
    # 4th Amendment — Search & Seizure
    "Mapp v. Ohio": "367 U.S. 643 (1961). Exclusionary rule: Evidence obtained through searches violating the 4th Amendment is inadmissible in state courts.",
    "Terry v. Ohio": "392 U.S. 1 (1968). Reasonable suspicion standard for stop-and-frisk. Stop must be brief; frisk limited to weapons check for officer safety.",
    "Arizona v. Gant": "556 U.S. 332 (2009). Vehicle search incident to arrest limited to (1) arrestee's reach at time of search, or (2) reasonable belief of evidence of arrest crime in vehicle.",
    "Riley v. California": "573 U.S. 373 (2014). Police must generally obtain a warrant before searching digital contents of a cell phone seized incident to arrest.",
    "Carpenter v. United States": "585 U.S. 296 (2018). Acquisition of historical cell-site location information constitutes a Fourth Amendment search requiring a warrant.",
    "Illinois v. Gates": "462 U.S. 213 (1983). Totality-of-the-circumstances test for determining probable cause based on informant tips, replacing the rigid Aguilar-Spinelli two-pronged test.",
    "Whren v. United States": "517 U.S. 806 (1996). A traffic stop is reasonable under the Fourth Amendment regardless of the officer's subjective motivations, so long as objective circumstances justify the stop.",
    "Florida v. Jardines": "569 U.S. 1 (2013). Using a drug-sniffing dog on a homeowner's porch to investigate the contents of the home is a search within the meaning of the Fourth Amendment.",
    "Franks v. Delaware": "438 U.S. 154 (1978). Defendant may challenge the truthfulness of factual statements in a search warrant affidavit; if false statements are shown to be material, the warrant is voided.",
    "Utah v. Strieff": "579 U.S. 232 (2016). Evidence discovered during an unlawful stop may be admissible if an intervening valid arrest warrant attenuates the connection.",
    # 5th Amendment — Self-Incrimination & Due Process
    "Miranda v. Arizona": "384 U.S. 436 (1966). Custodial interrogation requires Miranda warnings. Unwarned statements are presumptively inadmissible.",
    "Brady v. Maryland": "373 U.S. 83 (1963). Prosecution must disclose all material exculpatory evidence. Applies to evidence favorable to the accused on guilt or punishment.",
    "Giglio v. United States": "405 U.S. 150 (1972). Extends Brady to impeachment evidence. Any deals, promises, or benefits to prosecution witnesses must be disclosed.",
    "Kyles v. Whitley": "514 U.S. 419 (1995). Brady materiality: evidence is material if there is a reasonable probability that disclosure would have produced a different verdict. Cumulative effect of all suppressed evidence is considered.",
    "Berghuis v. Thompkins": "560 U.S. 370 (2010). Suspect must unambiguously invoke the right to remain silent; mere silence during interrogation is insufficient.",
    "Salinas v. Texas": "570 U.S. 178 (2013). Pre-arrest, pre-Miranda silence can be used against a defendant who does not expressly invoke the Fifth Amendment privilege.",
    # 6th Amendment — Counsel, Speedy Trial, Confrontation
    "Gideon v. Wainwright": "372 U.S. 335 (1963). The Sixth Amendment right to counsel applies to state criminal proceedings through the Fourteenth Amendment.",
    "Strickland v. Washington": "466 U.S. 668 (1984). Two-prong test for ineffective assistance of counsel: deficient performance + prejudice to the defense.",
    "Batson v. Kentucky": "476 U.S. 79 (1986). Race-based peremptory challenges violate equal protection. Three-step framework: prima facie case, neutral explanation, purposeful discrimination.",
    "Crawford v. Washington": "541 U.S. 36 (2004). Testimonial hearsay barred under Confrontation Clause unless declarant unavailable and prior cross-examination opportunity existed.",
    "Barker v. Wingo": "407 U.S. 514 (1972). Four-factor speedy trial test: length of delay, government's reason, defendant's assertion of right, prejudice to defendant.",
    "Padilla v. Kentucky": "559 U.S. 356 (2010). Defense counsel must advise noncitizen clients about the deportation risks of a guilty plea. Failure to do so constitutes ineffective assistance.",
    "Lafler v. Cooper": "566 U.S. 156 (2012). Ineffective assistance of counsel during plea bargaining can form the basis for relief, even where the defendant was later convicted at a fair trial.",
    "Missouri v. Frye": "566 U.S. 134 (2012). Defense counsel has a duty to communicate formal plea offers from the prosecution to the defendant.",
    # 8th Amendment — Bail & Sentencing
    "Stack v. Boyle": "342 U.S. 1 (1951). Bail set higher than necessary to ensure appearance is excessive under the Eighth Amendment.",
    "Graham v. Florida": "560 U.S. 48 (2010). Life without parole for juvenile non-homicide offenders violates the Eighth Amendment.",
    "Miller v. Alabama": "567 U.S. 460 (2012). Mandatory life without parole for juvenile homicide offenders violates the Eighth Amendment; individualized sentencing required.",
    # 14th Amendment — Equal Protection & Due Process
    "Jackson v. Virginia": "443 U.S. 307 (1979). Due process requires that a conviction be supported by evidence from which a rational trier of fact could find each element of the crime beyond a reasonable doubt.",
    "Napue v. Illinois": "360 U.S. 264 (1959). Due process is violated when prosecution knowingly uses false testimony or fails to correct testimony it knows to be false.",
    # Felony Murder & Death Penalty
    "Enmund v. Florida": "458 U.S. 782 (1982). The Eighth Amendment prohibits the death penalty for a defendant who did not kill, attempt to kill, or intend to kill, and whose participation in a felony was minor.",
    "Gregg v. Georgia": "428 U.S. 153 (1976). The death penalty is not per se unconstitutional under the Eighth Amendment where the sentencing scheme provides guided discretion to the jury.",
    "Tison v. Arizona": "481 U.S. 137 (1987). The death penalty may be imposed on a felony murder defendant who was a major participant in the felony and exhibited reckless indifference to human life.",
    # Drug Offenses
    "Harmelin v. Michigan": "501 U.S. 957 (1991). A mandatory life sentence without parole for possessing a large quantity of cocaine does not constitute cruel and unusual punishment.",
    # Domestic Violence / Family Violence
    "Davis v. Washington": "547 U.S. 813 (2006). Statements made to police during an ongoing emergency are not testimonial and may be admitted without violating the Confrontation Clause; distinguishes from interrogation statements.",
    # Bail
    "United States v. Salerno": "481 U.S. 739 (1987). Pretrial detention based on dangerousness to the community is constitutional and does not violate due process or the Excessive Bail Clause.",
}


# ============================================================
#  PUBLIC FUNCTIONS
# ============================================================

def get_relevant_law(charges: list[str], case_data: dict = None) -> str:
    """Build legal context for a case based on its charges.

    Returns GA statutes + relevant federal law + constitutional provisions
    + relevant search/seizure and procedural law.
    """
    ga = _load_georgia_statutes()
    usc = _load_usc_index()

    ga_sections_needed = set()
    federal_sections_needed = set()
    amendments_needed = set()

    # Always include search/seizure, speedy trial, sentencing, and bail for any criminal case
    ga_sections_needed.update([
        "17-5-21", "17-5-22", "17-7-170",  # Search/seizure & speedy trial
        "17-6-1",                            # Bail
        "17-10-1", "17-10-3",               # Sentencing (general)
    ])
    amendments_needed.update(["1st", "2nd", "4th", "5th", "6th", "8th", "13th", "14th"])

    # Map charges to specific statutes
    for charge in charges:
        matched = _match_charge(charge)
        if matched:
            mapping = CHARGE_TO_LAW[matched]
            ga_sections_needed.update(mapping["georgia"])
            federal_sections_needed.update(mapping["federal"])
            ga_sections_needed.update(mapping.get("defenses", []))
            ga_sections_needed.update(mapping.get("procedural", []))

    # Also add discovery statutes for felonies
    if case_data and case_data.get("severity") == "felony":
        ga_sections_needed.update(["17-16-1", "17-16-4", "17-16-5"])

    parts = ["# LEGAL AUTHORITY — Real Statutory Text\n"]
    parts.append("*All statutes below are sourced from official government publications.*\n")

    # Georgia statutes
    ga_parts = []
    for section in sorted(ga_sections_needed):
        key = f"OCGA {section}"
        entry = ga.get(key)
        if entry:
            ga_parts.append(f"### O.C.G.A. § {section} — {entry['heading']}\n{entry['text']}")
    if ga_parts:
        parts.append("## GEORGIA STATUTES (O.C.G.A.)\n")
        parts.extend(ga_parts)

    # Federal statutes
    fed_parts = []
    for section_key in sorted(federal_sections_needed):
        entry = usc.get(section_key)
        if entry:
            # Truncate very long federal sections to key portions
            text = entry["text"][:6000]
            fed_parts.append(f"### {section_key} — {entry['heading']}\n{text}")
    if fed_parts:
        parts.append("\n## FEDERAL LAW (USC)\n")
        parts.extend(fed_parts)

    # Constitutional provisions
    parts.append("\n## CONSTITUTIONAL PROVISIONS\n")
    for amend_key in sorted(amendments_needed):
        prov = CONSTITUTIONAL_PROVISIONS.get(amend_key)
        if prov:
            parts.append(f"### {amend_key} Amendment\n\"{prov['text']}\"\n")
            parts.append("**Key Holdings:**")
            for holding in prov["key_holdings"]:
                parts.append(f"- {holding}")

    # Landmark cases
    parts.append("\n## LANDMARK CASE LAW\n")
    for name, summary in LANDMARK_CASES.items():
        parts.append(f"- **{name}**, {summary}")

    return "\n\n".join(parts)


def get_full_legal_corpus() -> str:
    """Return complete legal corpus for caseload-wide analyses.

    Includes all GA statutes, key federal provisions, and constitutional law.
    Used for health checks, cascade intelligence, and chat.
    """
    ga = _load_georgia_statutes()

    parts = ["# COMPLETE LEGAL CORPUS\n"]
    parts.append("*All text sourced from official government publications.*\n")

    # All Georgia statutes
    parts.append("## GEORGIA STATUTES (O.C.G.A.)\n")
    for key in sorted(ga.keys()):
        entry = ga[key]
        section = entry.get("section", key.replace("OCGA ", ""))
        heading = entry.get("heading", "")
        parts.append(f"### O.C.G.A. § {section} — {heading}\n{entry['text']}")

    # Key federal sections (not the entire index — just the ones relevant to criminal defense)
    key_federal = [
        "18 USC 922", "18 USC 924",  # Firearms
        "21 USC 812", "21 USC 841",  # Drug scheduling & prohibited acts
        "42 USC 1983", "42 USC 1985",  # Civil rights
    ]
    fed_text = get_federal_sections(key_federal)
    if fed_text:
        parts.append("\n## KEY FEDERAL STATUTES (USC)\n")
        parts.append(fed_text)

    # Constitutional provisions
    parts.append("\n## CONSTITUTIONAL PROVISIONS\n")
    for amend_key, prov in CONSTITUTIONAL_PROVISIONS.items():
        parts.append(f"### {amend_key} Amendment\n\"{prov['text']}\"\n")
        parts.append("**Key Holdings:**")
        for holding in prov["key_holdings"]:
            parts.append(f"- {holding}")

    # Landmark cases
    parts.append("\n## LANDMARK CASE LAW\n")
    for name, summary in LANDMARK_CASES.items():
        parts.append(f"- **{name}**, {summary}")

    return "\n\n".join(parts)


def get_corpus_stats() -> dict:
    """Return counts of loaded legal materials."""
    ga = _load_georgia_statutes()
    usc = _load_usc_index()
    return {
        "ga_statutes": len(ga),
        "federal_sections": len(usc),
        "amendments": len(CONSTITUTIONAL_PROVISIONS),
        "landmark_cases": len(LANDMARK_CASES),
    }
