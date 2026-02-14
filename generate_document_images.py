#!/usr/bin/env python3
"""Generate text-rendered document evidence images.

Creates realistic police reports, witness statements, lab results, etc.
as rendered text images using Pillow. The text is legible so Claude's
vision API can actually read and analyze the content.

Usage: python3 generate_document_images.py [--limit N] [--start-id N]
"""

import argparse
import json
import os
import random
import re
import sqlite3
import textwrap
from datetime import datetime, timedelta

from PIL import Image, ImageDraw, ImageFont

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "static", "evidence")
DB_PATH = os.path.join(os.path.dirname(__file__), "case_nexus.db")

# Fonts
FONT_MONO = "/System/Library/Fonts/Courier.ttc"
FONT_SANS = "/System/Library/Fonts/Helvetica.ttc"

# Page dimensions (letter-ish at 150 DPI)
PAGE_W, PAGE_H = 1050, 1400
MARGIN = 60
TEXT_W = PAGE_W - 2 * MARGIN


def get_font(path, size, index=0):
    try:
        return ImageFont.truetype(path, size, index=index)
    except Exception:
        return ImageFont.load_default()


# Fonts at different sizes
FONT_TITLE = get_font(FONT_SANS, 22, index=1)  # bold
FONT_HEADER = get_font(FONT_SANS, 16, index=1)
FONT_BODY = get_font(FONT_MONO, 13)
FONT_SMALL = get_font(FONT_MONO, 11)
FONT_LABEL = get_font(FONT_SANS, 12, index=1)
FONT_FIELD = get_font(FONT_MONO, 13)


# ---------------------------------------------------------------------------
# Document text generators
# ---------------------------------------------------------------------------

def _rand_time(rng):
    return f"{rng.randint(1,12)}:{rng.randint(0,59):02d} {'AM' if rng.random() < 0.4 else 'PM'}"


def _rand_badge(rng):
    return f"#{rng.randint(1000,9999)}"


def _rand_incident_num(rng):
    return f"INC-{rng.randint(2025000,2025999)}"


PRECINCTS = ["Zone 1 - Buckhead", "Zone 2 - NE Atlanta", "Zone 3 - SE Atlanta",
             "Zone 4 - SW Atlanta", "Zone 5 - West Atlanta", "Zone 6 - Midtown"]

HOSPITALS = ["Grady Memorial Hospital", "Emory University Hospital", "Piedmont Atlanta",
             "Atlanta Medical Center", "Wellstar Kennestone", "Northside Hospital"]


def gen_police_report(case, evidence, rng) -> list[str]:
    """Generate a police incident report."""
    charges = json.loads(case["charges"]) if isinstance(case["charges"], str) else case["charges"]
    charge = charges[0] if charges else "Criminal Offense"
    filing = case.get("filing_date", "2025-06-01")
    incident_date = filing  # approximate

    lines = [
        "ATLANTA POLICE DEPARTMENT",
        "INCIDENT / OFFENSE REPORT",
        "",
        f"{'Incident #:':<20} {_rand_incident_num(rng)}",
        f"{'Case #:':<20} {case['case_number']}",
        f"{'Date of Report:':<20} {incident_date}",
        f"{'Time of Report:':<20} {_rand_time(rng)}",
        f"{'Reporting Officer:':<20} {case.get('arresting_officer', 'Officer J. Smith')}",
        f"{'Badge #:':<20} {_rand_badge(rng)}",
        f"{'Precinct:':<20} {rng.choice(PRECINCTS)}",
        "",
        "─" * 55,
        "SUBJECT INFORMATION",
        "─" * 55,
        f"{'Name:':<20} {case['defendant_name']}",
        f"{'DOB:':<20} {rng.randint(1970,2002)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}",
        f"{'Race/Sex:':<20} {'M' if rng.random() < 0.7 else 'F'}",
        f"{'Address:':<20} {rng.randint(100,9999)} {rng.choice(['Peachtree St','MLK Jr Dr','Moreland Ave','Ponce de Leon Ave','Memorial Dr','Northside Dr'])} NW",
        f"{'City/State:':<20} Atlanta, GA {rng.choice(['30303','30308','30312','30314','30318','30324'])}",
        "",
        "─" * 55,
        "OFFENSE INFORMATION",
        "─" * 55,
        f"{'Offense:':<20} {charge}",
        f"{'Severity:':<20} {case.get('severity','').upper()}",
        f"{'Location:':<20} {rng.randint(100,9999)} {rng.choice(['Edgewood Ave','Marietta St','Piedmont Ave','Spring St','Ralph McGill Blvd'])}",
        f"{'Date/Time:':<20} {incident_date} at {_rand_time(rng)}",
        "",
        "─" * 55,
        "NARRATIVE",
        "─" * 55,
    ]

    # Generate narrative based on charge type
    narratives = {
        "DUI": (
            f"On the above date and time, I observed a {rng.choice(['silver sedan','black SUV','white pickup','blue compact'])} "
            f"traveling {rng.choice(['northbound','southbound','eastbound','westbound'])} on {rng.choice(['Peachtree St','I-85','I-75/85','Buford Hwy'])} "
            f"weaving between lanes and failing to maintain lane. I activated my emergency lights and initiated a traffic stop. "
            f"Upon contact with the driver, identified as {case['defendant_name']}, I observed {rng.choice(['a strong odor of alcohol','slurred speech','bloodshot/watery eyes','an open container in the cupholder'])}. "
            f"I asked the subject to step out of the vehicle to perform standardized field sobriety tests. "
            f"Subject {rng.choice(['failed the HGN test showing 6 of 6 clues','was unable to maintain balance during walk-and-turn','showed 4 of 4 clues on one-leg stand','refused field sobriety tests'])}. "
            f"Subject was placed under arrest for DUI and transported to {rng.choice(PRECINCTS)} for processing. "
            f"Intoxilyzer results showed BAC of 0.{rng.randint(8,19):02d}."
        ),
        "Possession": (
            f"While on routine patrol, I observed {case['defendant_name']} in the area of "
            f"{rng.randint(100,999)} {rng.choice(['Memorial Dr','MLK Jr Dr','Bankhead Hwy','Jonesboro Rd'])}. "
            f"Subject was observed {rng.choice(['making a hand-to-hand transaction','in a known drug area acting suspiciously','sitting in a parked vehicle with the engine running','exiting an abandoned building'])}. "
            f"Upon approach, I detected {rng.choice(['the odor of marijuana','a white powdery substance on the dashboard','the subject attempting to conceal items','drug paraphernalia in plain view'])}. "
            f"A search incident to arrest revealed {rng.choice(['3.2 grams of suspected cocaine in a clear baggie','a plastic bag containing 12 individually wrapped rocks of suspected crack cocaine','approximately 7 grams of marijuana and a digital scale','multiple prescription pills not in a prescription container'])}. "
            f"Subject was advised of Miranda rights and declined to make a statement. Evidence was collected and submitted to GBI Crime Lab."
        ),
        "Assault": (
            f"Responded to a {rng.choice(['911 call','dispatch call','report of a disturbance','report of an altercation'])} "
            f"at {rng.randint(100,9999)} {rng.choice(['Edgewood Ave','Moreland Ave','Ponce de Leon Ave','North Ave'])}. "
            f"Upon arrival, I made contact with the victim, who stated that {case['defendant_name']} "
            f"{rng.choice(['struck them in the face with a closed fist','pushed them to the ground','struck them with a bottle','threatened them with a weapon and then struck them'])}. "
            f"Victim had visible injuries including {rng.choice(['swelling to the left eye and cheek','a laceration above the right eyebrow','bruising on both arms','redness and swelling to the jaw area'])}. "
            f"EMS was called and victim was transported to {rng.choice(HOSPITALS)} for treatment. "
            f"Witness {rng.choice(['corroborated','partially corroborated','could not confirm'])} the victim's account. "
            f"Subject was located at the scene and placed under arrest."
        ),
        "Theft": (
            f"Responded to a reported theft at {rng.choice(['Walmart','Target','Kroger','Home Depot','CVS Pharmacy'])} "
            f"located at {rng.randint(100,9999)} {rng.choice(['Peachtree St','Piedmont Rd','Buford Hwy','Memorial Dr'])}. "
            f"Loss prevention officer stated they observed {case['defendant_name']} "
            f"{rng.choice(['conceal merchandise in a bag','remove security tags from items','pass all points of sale without paying','leave the store with unpaid merchandise'])}. "
            f"Stolen items valued at approximately ${rng.randint(25,800)}.{rng.randint(0,99):02d}. "
            f"Subject was detained by store security until officers arrived. "
            f"Merchandise was recovered and photographed as evidence."
        ),
    }

    # Match charge to narrative
    narrative = None
    charge_lower = charge.lower()
    for key, text in narratives.items():
        if key.lower() in charge_lower:
            narrative = text
            break
    if not narrative:
        narrative = (
            f"On the above date and time, I responded to a call regarding {charge.lower()} "
            f"at the listed location. Upon arrival, I made contact with the involved parties. "
            f"After investigation, {case['defendant_name']} was identified as the suspect. "
            f"Based on witness statements and physical evidence at the scene, "
            f"probable cause was established and subject was placed under arrest. "
            f"Subject was transported to {rng.choice(PRECINCTS)} for processing."
        )

    # Wrap narrative to fit page
    wrapped = textwrap.wrap(narrative, width=62)
    lines.extend(wrapped)
    lines.append("")
    lines.append(f"{'Report Status:':<20} {'FINAL' if rng.random() < 0.7 else 'SUPPLEMENTAL'}")
    lines.append(f"{'Reviewed By:':<20} Sgt. {rng.choice(['Williams','Johnson','Brown','Davis','Thompson'])}")
    lines.append("")
    lines.append(f"Officer Signature: ____{case.get('arresting_officer','J. Smith')}____")
    lines.append(f"Date: {incident_date}")

    return lines


def gen_witness_statement(case, evidence, rng) -> list[str]:
    """Generate a witness statement document."""
    charges = json.loads(case["charges"]) if isinstance(case["charges"], str) else case["charges"]
    charge = charges[0] if charges else "incident"
    filing = case.get("filing_date", "2025-06-01")

    witness_first = rng.choice(["James","Sarah","Michael","Lisa","David","Maria","Robert","Jennifer","Kevin","Patricia"])
    witness_last = rng.choice(["Williams","Johnson","Brown","Davis","Martinez","Anderson","Taylor","Thomas","Moore","White"])

    lines = [
        "FULTON COUNTY DISTRICT ATTORNEY'S OFFICE",
        "WITNESS STATEMENT FORM",
        "",
        f"{'Case #:':<22} {case['case_number']}",
        f"{'Defendant:':<22} {case['defendant_name']}",
        f"{'Charge(s):':<22} {charge}",
        f"{'Date of Statement:':<22} {filing}",
        f"{'Witness Name:':<22} {witness_first} {witness_last}",
        f"{'Witness DOB:':<22} {rng.randint(1965,2000)}-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}",
        f"{'Contact Phone:':<22} (404) {rng.randint(200,999)}-{rng.randint(1000,9999)}",
        f"{'Relation to Parties:':<22} {rng.choice(['None - bystander','Neighbor','Coworker','Friend of victim','Store employee','Passerby'])}",
        "",
        "─" * 55,
        "STATEMENT (in witness's own words):",
        "─" * 55,
        "",
    ]

    # Generate statement text
    time_str = _rand_time(rng)
    location = f"{rng.randint(100,9999)} {rng.choice(['Peachtree St','Edgewood Ave','Moreland Ave','Piedmont Ave','Ponce de Leon Ave'])}"

    statement_intros = [
        f"I was at {location} on the evening of {filing} at approximately {time_str}.",
        f"On {filing}, around {time_str}, I was in the area of {location}.",
        f"I am writing this statement about what I saw on {filing} at about {time_str} near {location}.",
    ]

    statement_middles = {
        "Assault": [
            f"I heard raised voices and turned to see two individuals arguing. "
            f"The person I now know as {case['defendant_name']} appeared agitated. "
            f"I saw {rng.choice(['the defendant push the other person','the defendant swing at the other person','the two individuals grab each other','the defendant strike the victim'])}. "
            f"{rng.choice(['The victim fell to the ground','The victim stumbled backward','The other person tried to defend themselves','There was a brief scuffle'])}. "
            f"I called 911 immediately. Police arrived within {rng.randint(3,15)} minutes.",
        ],
        "Theft": [
            f"I was {rng.choice(['working my shift at the register','shopping in the store','in the parking lot'])} when I noticed "
            f"{case['defendant_name']} {rng.choice(['acting suspiciously near the merchandise','putting items in a bag','walking quickly toward the exit','removing security tags'])}. "
            f"I {rng.choice(['alerted the manager','told the security guard','watched to make sure','followed at a distance'])}. "
            f"The subject left the store {rng.choice(['through the main entrance','through a side exit','quickly through the parking lot'])} without paying.",
        ],
    }

    lines.append(rng.choice(statement_intros))
    lines.append("")

    charge_lower = charge.lower()
    mid = None
    for key, texts in statement_middles.items():
        if key.lower() in charge_lower:
            mid = rng.choice(texts)
            break
    if not mid:
        mid = (
            f"I observed {case['defendant_name']} in the area. "
            f"I noticed {rng.choice(['something unusual happening','a commotion','raised voices','someone running'])}. "
            f"I saw {rng.choice(['the defendant near the scene','what appeared to be an altercation','the police arrive shortly after','someone call for help'])}. "
            f"I provided my contact information to the responding officer."
        )

    for para in textwrap.wrap(mid, width=62):
        lines.append(para)

    lines.extend([
        "",
        f"I am willing to testify to the above in court.",
        "",
        "─" * 55,
        "",
        f"Witness Signature: ____{witness_first} {witness_last}____",
        f"Date: {filing}",
        "",
        f"Statement taken by: {case.get('arresting_officer','Det. J. Smith')}",
        f"Badge #: {_rand_badge(rng)}",
        "",
        "NOTICE: This statement was given voluntarily and",
        "may be used in court proceedings.",
    ])

    return lines


def gen_lab_report(case, evidence, rng) -> list[str]:
    """Generate a crime lab analysis report."""
    charges = json.loads(case["charges"]) if isinstance(case["charges"], str) else case["charges"]
    charge = charges[0] if charges else "offense"
    filing = case.get("filing_date", "2025-06-01")

    lines = [
        "GEORGIA BUREAU OF INVESTIGATION",
        "DIVISION OF FORENSIC SCIENCES",
        "CRIME LABORATORY REPORT",
        "",
        f"{'Lab Case #:':<22} GBI-{rng.randint(20250000,20259999)}",
        f"{'Agency Case #:':<22} {case['case_number']}",
        f"{'Agency:':<22} Atlanta Police Department",
        f"{'Requesting Officer:':<22} {case.get('arresting_officer','Det. J. Smith')}",
        f"{'Subject:':<22} {case['defendant_name']}",
        f"{'Date Received:':<22} {filing}",
        f"{'Date Completed:':<22} {filing}",  # simplified
        f"{'Analyst:':<22} {rng.choice(['Dr. A. Patel','M. Rodriguez, MS','K. Chen, PhD','J. Thompson, MS'])}",
        "",
        "─" * 55,
        "EVIDENCE RECEIVED",
        "─" * 55,
    ]

    if "dui" in charge.lower():
        lines.extend([
            f"Item 1: One (1) blood sample vial, sealed",
            f"Item 2: One (1) Intoxilyzer 9000 printout",
            "",
            "─" * 55,
            "ANALYSIS AND RESULTS",
            "─" * 55,
            "",
            f"Blood Alcohol Concentration (BAC):",
            f"  Result: 0.{rng.randint(8,22):02d} g/dL",
            f"  Method: Gas Chromatography (GC-FID)",
            f"  Georgia Legal Limit: 0.08 g/dL",
            f"  Status: {'ABOVE' if rng.randint(8,22) >= 8 else 'BELOW'} LEGAL LIMIT",
            "",
            f"Additional Substances Detected:",
            f"  THC: {'POSITIVE' if rng.random() < 0.3 else 'NEGATIVE'}",
            f"  Benzodiazepines: {'POSITIVE' if rng.random() < 0.15 else 'NEGATIVE'}",
            f"  Opiates: NEGATIVE",
            f"  Amphetamines: NEGATIVE",
        ])
    elif "possess" in charge.lower() or "drug" in charge.lower():
        substance = rng.choice(["cocaine hydrochloride","crack cocaine","methamphetamine","marijuana","MDMA","heroin","fentanyl"])
        weight = f"{rng.uniform(0.5, 28.0):.1f}"
        lines.extend([
            f"Item 1: One (1) plastic bag, clear, sealed",
            f"  Contents: {rng.choice(['White powder','Off-white rock','Green plant material','Crystalline substance','Brown powder'])}",
            f"Item 2: One (1) digital scale (residue present)",
            "",
            "─" * 55,
            "ANALYSIS AND RESULTS",
            "─" * 55,
            "",
            f"Substance Identification:",
            f"  Method: GC-MS (Gas Chromatography-Mass Spec)",
            f"  Result: POSITIVE for {substance}",
            f"  Net Weight: {weight} grams",
            f"  Purity: {rng.randint(40,95)}%",
            "",
            f"Scale Analysis:",
            f"  Residue consistent with {substance}",
        ])
    else:
        lines.extend([
            f"Item 1: Evidence submitted for analysis",
            "",
            "─" * 55,
            "ANALYSIS AND RESULTS",
            "─" * 55,
            "",
            f"Analysis conducted per standard protocols.",
            f"Results documented in attached worksheets.",
            f"See supplemental report for full findings.",
        ])

    lines.extend([
        "",
        "─" * 55,
        "CHAIN OF CUSTODY",
        "─" * 55,
        f"Received from: {case.get('arresting_officer','Officer')} → APD Evidence",
        f"APD Evidence → GBI Crime Lab ({filing})",
        f"Analyzed by: Lab Tech on file",
        "",
        "This report contains the opinions and interpretations",
        "of the analyst. Original evidence returned to agency.",
        "",
        f"________________________",
        f"Forensic Analyst Signature",
    ])

    return lines


def gen_generic_document(case, evidence, rng) -> list[str]:
    """Generate a generic document based on title keywords."""
    charges = json.loads(case["charges"]) if isinstance(case["charges"], str) else case["charges"]
    charge = charges[0] if charges else "offense"
    filing = case.get("filing_date", "2025-06-01")
    title = evidence["title"]

    lines = [
        "FULTON COUNTY CRIMINAL JUSTICE SYSTEM",
        title.upper(),
        "",
        f"{'Case #:':<22} {case['case_number']}",
        f"{'Defendant:':<22} {case['defendant_name']}",
        f"{'Charge(s):':<22} {charge}",
        f"{'Date:':<22} {filing}",
        f"{'Prepared By:':<22} {case.get('arresting_officer','Officer on file')}",
        "",
        "─" * 55,
        "",
    ]

    desc = evidence.get("description", "")
    wrapped = textwrap.wrap(desc, width=62)
    lines.extend(wrapped)
    lines.append("")

    # Add some filler content based on title
    title_lower = title.lower()
    if "chain of custody" in title_lower:
        lines.extend([
            "CHAIN OF CUSTODY LOG:",
            f"{'Date':<14} {'From':<20} {'To':<20}",
            "─" * 55,
            f"{filing:<14} {'Scene/Officer':<20} {'Evidence Room':<20}",
            f"{filing:<14} {'Evidence Room':<20} {'GBI Crime Lab':<20}",
            f"{filing:<14} {'GBI Crime Lab':<20} {'Evidence Room':<20}",
            "",
            "All transfers verified. Seals intact at each stage.",
        ])
    elif "911" in title_lower or "call" in title_lower:
        lines.extend([
            f"CALL RECEIVED: {_rand_time(rng)}",
            f"DISPATCHER: Fulton County 911, what is your emergency?",
            f"CALLER: {rng.choice(['I need police, there is a fight','Someone just stole from the store','There is a man threatening people','I just witnessed an accident'])}",
            f"DISPATCHER: What is your location?",
            f"CALLER: {rng.randint(100,9999)} {rng.choice(['Peachtree','Moreland','Ponce de Leon','Edgewood'])}",
            f"DISPATCHER: Officers are being dispatched now.",
            f"CALLER: {rng.choice(['Please hurry','OK thank you','They are still here','The person ran away'])}",
            f"",
            f"CALL DURATION: {rng.randint(1,8)} minutes {rng.randint(10,59)} seconds",
            f"UNITS DISPATCHED: {rng.randint(1,3)}",
        ])
    elif "arrest" in title_lower or "booking" in title_lower:
        lines.extend([
            f"BOOKING INFORMATION:",
            f"{'Booking #:':<22} BK-{rng.randint(100000,999999)}",
            f"{'Date/Time:':<22} {filing} {_rand_time(rng)}",
            f"{'Arresting Officer:':<22} {case.get('arresting_officer','Officer on file')}",
            f"{'Charges at Booking:':<22} {charge}",
            f"{'Bond Amount:':<22} ${rng.choice([500,1000,2500,5000,10000,25000]):,}",
            f"{'Bond Status:':<22} {rng.choice(['Posted','Pending','Denied','ROR'])}",
            "",
            f"PERSONAL PROPERTY INVENTORY:",
            f"  - Wallet with ID and ${rng.randint(5,200)}",
            f"  - Cell phone ({rng.choice(['iPhone','Samsung','Android'])})",
            f"  - Keys ({rng.randint(2,6)} keys on ring)",
            f"  - {rng.choice(['Watch','Belt','Jewelry','None'])}",
        ])
    else:
        lines.extend([
            f"This document pertains to the above-referenced case.",
            f"All information herein is based on the investigation",
            f"conducted by the Atlanta Police Department.",
            "",
            f"Status: {rng.choice(['ACTIVE','PENDING REVIEW','FILED','SUPPLEMENTAL'])}",
            f"Distribution: DA Office, Defense Counsel, Court File",
        ])

    lines.extend([
        "",
        f"________________________",
        f"Authorized Signature",
        f"Date: {filing}",
    ])

    return lines


def render_document(lines: list[str], output_path: str, rng):
    """Render text lines to a document image."""
    # Slight paper color variation
    paper_r = rng.randint(248, 255)
    paper_g = rng.randint(246, 253)
    paper_b = rng.randint(240, 248)
    img = Image.new("RGB", (PAGE_W, PAGE_H), (paper_r, paper_g, paper_b))
    draw = ImageDraw.Draw(img)

    y = MARGIN
    for i, line in enumerate(lines):
        if y > PAGE_H - MARGIN - 20:
            break  # Stop before running off page

        # First 2 lines are title/header
        if i == 0:
            font = FONT_TITLE
            color = (20, 20, 80)
        elif i == 1 and not line.startswith(" "):
            font = FONT_HEADER
            color = (30, 30, 90)
        elif line.startswith("─"):
            # Draw a horizontal rule
            draw.line([(MARGIN, y + 6), (PAGE_W - MARGIN, y + 6)], fill=(150, 150, 170), width=1)
            y += 16
            continue
        elif ":" in line and len(line.split(":")[0]) < 25 and not line.startswith(" "):
            # Label: value formatting
            parts = line.split(":", 1)
            draw.text((MARGIN, y), parts[0] + ":", font=FONT_LABEL, fill=(60, 60, 80))
            draw.text((MARGIN + 170, y), parts[1].strip() if len(parts) > 1 else "", font=FONT_FIELD, fill=(10, 10, 10))
            y += 20
            continue
        else:
            font = FONT_BODY
            color = (20, 20, 20)

        if line == "":
            y += 10
            continue

        draw.text((MARGIN, y), line, font=font, fill=color)

        # Get line height
        try:
            bbox = font.getbbox(line)
            line_h = bbox[3] - bbox[1] + 6
        except Exception:
            line_h = 18

        y += line_h

    # Add subtle aging/scan effect
    if rng.random() < 0.3:
        # Coffee ring stain
        cx, cy = rng.randint(600, 900), rng.randint(200, 1200)
        for r in range(35, 42):
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(rng.randint(200,220), rng.randint(180,200), rng.randint(150,170)))

    img.save(output_path, "PNG", quality=95)


def classify_document(title: str) -> str:
    """Determine which generator to use based on title."""
    t = title.lower()
    if any(w in t for w in ["incident report", "police report", "arrest report"]):
        return "police_report"
    elif any(w in t for w in ["witness statement", "victim statement"]):
        return "witness_statement"
    elif any(w in t for w in ["lab", "bac", "analysis", "toxicology", "test result"]):
        return "lab_report"
    else:
        return "generic"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-id", type=int, default=0)
    parser.add_argument("--limit", type=int, default=9999)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT e.id, e.case_number, e.evidence_type, e.title, e.description, e.file_path,
               c.charges, c.defendant_name, c.filing_date, c.severity, c.status,
               c.arresting_officer, c.judge
        FROM evidence e
        JOIN cases c ON e.case_number = c.case_number
        WHERE e.evidence_type = 'document'
        ORDER BY e.id
    """).fetchall()

    cols = ["id", "case_number", "evidence_type", "title", "description", "file_path",
            "charges", "defendant_name", "filing_date", "severity", "status",
            "arresting_officer", "judge"]

    items = [dict(zip(cols, r)) for r in rows]
    if args.start_id:
        items = [i for i in items if i["id"] >= args.start_id]
    items = items[:args.limit]

    print(f"Generating {len(items)} document images")

    success = 0
    for idx, item in enumerate(items):
        eid = item["id"]
        case_num = item["case_number"]
        filename = f"{case_num}_document_{eid}.png"
        output_path = os.path.join(EVIDENCE_DIR, filename)

        if args.dry_run:
            doc_type = classify_document(item["title"])
            print(f"[{idx+1}/{len(items)}] {filename} ({doc_type}: {item['title']})")
            continue

        print(f"[{idx+1}/{len(items)}] {filename}...", end=" ", flush=True)

        seed = int(re.sub(r"\D", "", case_num)) + eid
        rng = random.Random(seed)

        doc_type = classify_document(item["title"])
        case_dict = item  # has both evidence and case fields

        if doc_type == "police_report":
            lines = gen_police_report(case_dict, item, rng)
        elif doc_type == "witness_statement":
            lines = gen_witness_statement(case_dict, item, rng)
        elif doc_type == "lab_report":
            lines = gen_lab_report(case_dict, item, rng)
        else:
            lines = gen_generic_document(case_dict, item, rng)

        render_document(lines, output_path, rng)
        size_kb = os.path.getsize(output_path) / 1024
        print(f"OK ({size_kb:.0f}KB)")
        success += 1

    conn.close()
    print(f"\nDone: {success} document images generated")


if __name__ == "__main__":
    main()
