#!/usr/bin/env python3
"""Batch evidence image generator using Gemini API.

Generates unique, detailed evidence images for all evidence items
in the Case Nexus database. Images contain rich visual detail
so the AI evidence analyzer has substance to report about.

Usage: python3 generate_evidence_images.py [--start-id N] [--limit N] [--dry-run]
"""

import argparse
import base64
import json
import os
import re
import sqlite3
import time
import random
import requests

API_KEY = "AIzaSyCA6I84iwWz35vIBhE4Wv7MLMjUZA9R1ww"
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent"
EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "static", "evidence")
DB_PATH = os.path.join(os.path.dirname(__file__), "case_nexus.db")

# Rate limit: paid tier allows ~10 RPM for image gen
DELAY_BETWEEN_REQUESTS = 7  # seconds


# ---------------------------------------------------------------------------
# Prompt templates — rich visual detail for AI analysis substance
# ---------------------------------------------------------------------------

def build_prompt(item: dict) -> str:
    """Build a detailed, unique image generation prompt based on evidence item."""
    etype = item["type"]
    title = item["title"]
    desc = item["desc"]
    charges = json.loads(item.get("charges", "[]"))
    charge = charges[0] if charges else "criminal offense"
    case_num = item["case_number"]

    # Use case number as seed for consistent randomization
    seed = int(re.sub(r"\D", "", case_num)) + item["id"]
    rng = random.Random(seed)

    # --- DOCUMENT evidence ---
    if etype == "document":
        doc_variants = [
            f"Photograph of a police incident report form on a desk, partially filled out with handwritten notes. "
            f"Case number {case_num} visible at top. Charge listed: {charge}. "
            f"Report shows officer's narrative section with several paragraphs of handwriting. "
            f"A coffee ring stain partially obscures one corner. Yellow highlighting on key passages. "
            f"Date stamp and precinct number visible. Grainy office lighting, overhead fluorescent.",

            f"Close-up photograph of a typed witness statement document, two pages visible. "
            f"Official letterhead from Fulton County District Attorney's office. "
            f"Several lines are redacted with black marker. A sticky note with handwritten remarks is attached. "
            f"Case reference {case_num} printed in header. Document appears to describe events related to {charge}. "
            f"Paper has fold creases from being in an envelope.",

            f"Evidence photograph of an arrest report printout next to a booking form. "
            f"Defendant information partially visible with booking number. "
            f"Charge listed as {charge}. Fingerprint card visible in corner. "
            f"Multiple stamps and signatures from processing officers. "
            f"Taken on a metal desk under harsh fluorescent lighting. Badge number visible on one form.",

            f"Photograph of court documents spread on a table: a motion filing, a subpoena, "
            f"and a lab results report. {charge} referenced in the motion header. "
            f"One document has a yellow evidence tag attached. Case {case_num} stamped on each page. "
            f"A pen and reading glasses rest on the documents. Warm desk lamp lighting.",

            f"Crime lab report document photographed on a clipboard. "
            f"Header reads 'Georgia Bureau of Investigation — Forensic Sciences Division'. "
            f"Multiple test results with checkboxes, some marked positive. "
            f"Chain of custody section visible at bottom with three signatures. "
            f"Bar graph showing chemical analysis results. Case {case_num} reference number.",
        ]
        return rng.choice(doc_variants)

    # --- BODY CAM evidence ---
    elif etype == "body_cam":
        times = ["8:47 PM", "11:23 PM", "2:15 AM", "9:38 PM", "1:04 AM", "10:52 PM", "3:17 AM"]
        locations = [
            "residential street with parked cars", "apartment complex parking lot",
            "convenience store entrance", "dimly lit alley behind buildings",
            "gas station forecourt", "busy intersection at night",
            "suburban driveway", "motel parking lot", "park entrance at night",
        ]
        subjects = {
            "DUI": "suspect standing outside a vehicle performing a field sobriety test, one leg raised, officer's hand visible holding a flashlight",
            "Possession with Intent to Distribute": "suspect sitting on a curb with hands behind back in handcuffs, small evidence bags visible on the car hood nearby",
            "Aggravated Assault": "two people being separated, one has visible injuries on their face, another officer holding back a second individual",
            "Battery": "suspect being placed in handcuffs while leaning against a patrol car, victim standing nearby with a torn shirt",
            "Domestic Violence": "officer at a front door speaking with a distressed person, broken items visible through the doorway",
            "Theft": "suspect being detained near a store exit, security guard pointing at merchandise on the ground",
            "Burglary": "suspect prone on the ground near a building with a broken window, officer kneeling beside them, flashlight beam illuminating tools on the ground",
            "Robbery": "victim describing events to officer, gesturing toward a direction, visible scratch marks on their arm",
            "Weapons Offense": "officer examining a firearm placed on the hood of a patrol car with an evidence marker, suspect in background against a wall",
            "Trespass": "suspect being escorted from a property, no trespassing sign visible, property owner standing at gate",
            "Shoplifting": "store loss prevention officer showing recovered merchandise to police officer, suspect seated on a bench nearby",
        }
        # Match charge to subject variant
        subject = subjects.get(charge,
            "suspect interacting with officer, visible tension in the scene, nearby bystanders watching")

        return (
            f"Police body camera footage still frame, fisheye wide-angle lens distortion, "
            f"REC indicator and timestamp {rng.choice(times)} visible in corner. "
            f"Location: {rng.choice(locations)}. "
            f"Scene shows: {subject}. "
            f"Blue and red emergency lights casting colored reflections. "
            f"Slightly grainy night-time quality typical of body-worn cameras. "
            f"Radio and uniform edge visible at bottom of frame."
        )

    # --- SURVEILLANCE evidence ---
    elif etype == "surveillance":
        cam_ids = ["CAM-01", "CAM-02", "CAM-03", "CAM-04", "CAM-07", "CAM-12", "CAM-15"]
        locations = [
            "convenience store interior showing aisles and register",
            "bar or restaurant entrance with bouncer stand",
            "parking garage level 2 with concrete pillars",
            "apartment building lobby with mailboxes",
            "gas station with fuel pumps visible",
            "retail store entrance with security gates",
            "bank ATM vestibule with glass doors",
            "warehouse loading dock with pallets",
            "hotel hallway with room doors numbered",
            "laundromat interior with washing machines",
        ]
        actions = {
            "DUI": "person stumbling near a vehicle, leaning on car door for support",
            "Possession with Intent to Distribute": "two individuals engaged in a brief hand-to-hand exchange near a counter",
            "Aggravated Assault": "physical altercation between two people, one being pushed against a wall",
            "Battery": "aggressive confrontation, one person shoving another, bystanders stepping back",
            "Theft": "individual concealing an item under their jacket while looking around nervously",
            "Robbery": "person approaching another aggressively, victim with hands raised",
            "Burglary": "figure attempting to open a locked door with tools, looking over their shoulder",
            "Shoplifting": "person placing items into a bag while pretending to browse shelves",
        }
        action = actions.get(charge,
            "suspicious activity, individual loitering and looking around nervously before moving quickly")

        return (
            f"Black and white CCTV surveillance camera footage, overhead angle, "
            f"timestamp overlay showing date and {rng.choice(cam_ids)} in corner. "
            f"Location: {rng.choice(locations)}. "
            f"Scene shows: {action}. "
            f"Typical low-resolution security camera quality with slight motion blur. "
            f"Fixed wide-angle lens with barrel distortion at edges. "
            f"Some compression artifacts visible."
        )

    # --- DASHCAM evidence ---
    elif etype == "dashcam":
        scenarios = {
            "DUI": "vehicle ahead swerving across lane markings, brake lights erratic, officer's speed readout showing pursuit, night scene with streetlights",
            "Possession with Intent to Distribute": "vehicle pulled over on shoulder, officer approaching driver side with flashlight, suspect's hands visible on steering wheel through window",
            "Aggravated Assault": "aftermath scene from patrol car showing ambulance and crime scene tape on a street, officer directing traffic",
            "Weapons Offense": "traffic stop with suspect ordered out at gunpoint, suspect's hands raised visible through rear window, backup unit arriving",
            "Theft": "suspect's vehicle fleeing through a parking lot, license plate partially visible, shopping cart knocked over",
        }
        scenario = scenarios.get(charge,
            "routine traffic stop at night, vehicle ahead with taillights visible, officer's dashboard instruments partially visible at bottom of frame")

        return (
            f"Police dashcam footage still frame from inside patrol car. "
            f"Dashboard instruments and MDT terminal edge visible at bottom. "
            f"Windshield-mounted camera perspective, slight green tint from night vision. "
            f"Scene shows: {scenario}. "
            f"Speed readout, GPS coordinates, unit number overlay visible. "
            f"Date stamp in corner. Typical dashcam wide-angle with slight fisheye."
        )

    # --- MEDICAL evidence ---
    elif etype == "medical":
        medical_variants = [
            f"Medical documentation photograph: hospital emergency room chart on a clipboard. "
            f"Patient vitals written on whiteboard in background. IV stand visible. "
            f"Injury assessment form with body diagram showing marked areas of trauma. "
            f"Doctor's notes indicate findings consistent with {charge} case injuries. "
            f"Medical record number and date visible. Blue hospital lighting.",

            f"Clinical photograph of bruising and contusions on a patient's forearm and wrist area, "
            f"taken against a white medical backdrop with measurement ruler for scale. "
            f"Purple and yellow discoloration indicating 48-72 hour old injuries. "
            f"Medical chart number written on a small whiteboard next to the injury. "
            f"Professional medical photography lighting.",

            f"Photograph of a hospital treatment room with evidence of patient care: "
            f"bandages, antiseptic bottles, and a medical chart on the bed. "
            f"X-ray film clipped to a light board on the wall showing a bone with a hairline fracture. "
            f"Discharge paperwork on the side table. Medical bracelet visible.",

            f"Toxicology report printout next to blood draw vials with evidence labels. "
            f"Results show BAC level and substance screening panel with several highlighted values. "
            f"Chain of custody form attached. Hospital lab stamp visible. "
            f"Lab technician's initials and date on each vial label.",

            f"Medical examiner's photographic documentation of defensive wounds on hands and forearms. "
            f"Cuts and abrasions with measurement scale visible. Sterile blue background. "
            f"Evidence tag with case reference number. Close-up macro photography showing wound depth and pattern.",
        ]
        return rng.choice(medical_variants)

    # --- PHYSICAL evidence ---
    elif etype == "physical":
        physical_variants = {
            "DUI": "Evidence photograph on a gray backdrop: breathalyzer device showing digital readout, "
                   "car keys with a distinctive keychain, and an opened container in a brown paper bag. "
                   "Yellow evidence markers numbered 1, 2, 3 next to each item. Ruler for scale. "
                   "Evidence tag with case number and officer's initials.",

            "Possession with Intent to Distribute": "Evidence table photograph showing seized contraband: "
                   "multiple small baggies with white substance, a digital scale showing residue, "
                   "cash in various denominations spread out, and a cell phone. "
                   "Yellow numbered evidence markers. Black backdrop with measurement ruler. "
                   "Latex gloves visible at edge of frame. Evidence tags on each item.",

            "Aggravated Assault": "Evidence photograph of a weapon recovered from the scene: "
                   "a knife with a 4-inch blade on a white evidence sheet, blood traces visible on the handle. "
                   "Evidence marker #7 beside it. Measurement ruler showing blade length. "
                   "Evidence collection bag partially visible. Forensic swab nearby.",

            "Weapons Offense": "Evidence photograph of a seized firearm on a gray forensic backdrop: "
                   "semi-automatic pistol with magazine removed, serial number visible. "
                   "Ammunition arranged nearby with evidence markers. "
                   "Latex gloves and evidence tag in frame. Ruler for scale reference.",

            "Burglary": "Evidence photograph of recovered burglary tools: pry bar, screwdriver, "
                   "and gloves laid out on evidence paper with numbered markers. "
                   "Damaged lock and door strike plate in a separate evidence bag. "
                   "All items tagged with case number labels.",

            "Theft": "Evidence photograph of recovered stolen merchandise arranged on a table: "
                   "electronics and clothing items with store security tags still attached. "
                   "Receipt and price tags visible. Evidence markers numbered. "
                   "Store surveillance still photo printed and placed alongside for identification.",
        }
        prompt = physical_variants.get(charge,
            f"Forensic evidence photograph on a gray backdrop: various collected items with "
            f"yellow numbered evidence markers (1-5). Items include personal effects, "
            f"a cell phone, and items relevant to a {charge} case. "
            f"Measurement ruler for scale. Evidence tags with case number. "
            f"Latex gloves and collection bags partially visible at frame edge.")
        return prompt

    # --- CRIME SCENE evidence ---
    elif etype == "crime_scene":
        return (
            f"Crime scene photograph taken by forensic unit: wide-angle view of a "
            f"scene related to a {charge} case. Yellow numbered evidence markers (1 through 8) "
            f"placed on the ground near key items. Crime scene tape visible at perimeter. "
            f"Forensic photographer's flash creating sharp shadows. "
            f"Evidence collection kit visible at edge of frame. Night scene with portable lights."
        )

    # Fallback
    return (
        f"Evidence photograph for a criminal case involving {charge}. "
        f"Detailed forensic-quality image with evidence markers, measurement scale, "
        f"and proper documentation visible. Professional law enforcement photography."
    )


def generate_image(prompt: str, output_path: str, retries: int = 3) -> bool:
    """Call Gemini API to generate an image and save it."""
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        }
    }

    for attempt in range(retries):
        try:
            resp = requests.post(
                f"{API_URL}?key={API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60,
            )

            if resp.status_code == 429:
                wait = min(60, (attempt + 1) * 15)
                print(f"    Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue

            if resp.status_code != 200:
                print(f"    HTTP {resp.status_code}: {resp.text[:200]}")
                if attempt < retries - 1:
                    time.sleep(5)
                continue

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                print(f"    No candidates in response")
                continue

            parts = candidates[0].get("content", {}).get("parts", [])
            for part in parts:
                if "inlineData" in part:
                    img_data = base64.b64decode(part["inlineData"]["data"])
                    mime = part["inlineData"].get("mimeType", "image/png")
                    ext = ".png" if "png" in mime else ".jpg"

                    # Ensure output path has correct extension
                    final_path = os.path.splitext(output_path)[0] + ext
                    with open(final_path, "wb") as f:
                        f.write(img_data)
                    return True

            print(f"    No image data in response parts")

        except Exception as e:
            print(f"    Error: {e}")
            if attempt < retries - 1:
                time.sleep(5)

    return False


def main():
    parser = argparse.ArgumentParser(description="Generate evidence images with Gemini")
    parser.add_argument("--start-id", type=int, default=0, help="Start from evidence ID")
    parser.add_argument("--limit", type=int, default=9999, help="Max images to generate")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without generating")
    parser.add_argument("--type", type=str, default="", help="Only generate for this evidence type")
    args = parser.parse_args()

    # Load evidence manifest
    with open(os.path.join(os.path.dirname(__file__), "evidence_manifest.json")) as f:
        items = json.load(f)

    # Filter to items needing generation
    to_generate = [i for i in items if not i["file_path"] or i["file_path"] == ""]
    if args.start_id:
        to_generate = [i for i in to_generate if i["id"] >= args.start_id]
    if args.type:
        to_generate = [i for i in to_generate if i["type"] == args.type]
    to_generate = to_generate[:args.limit]

    print(f"Generating {len(to_generate)} evidence images")
    print(f"Output directory: {EVIDENCE_DIR}")
    print(f"Estimated cost: ${len(to_generate) * 0.039:.2f}")
    print()

    os.makedirs(EVIDENCE_DIR, exist_ok=True)

    success = 0
    fail = 0
    db_updates = []

    for idx, item in enumerate(to_generate):
        filename = f"{item['case_number']}_{item['type']}_{item['id']}"
        output_path = os.path.join(EVIDENCE_DIR, filename + ".png")

        # Skip if already generated
        if os.path.exists(output_path) or os.path.exists(output_path.replace(".png", ".jpg")):
            print(f"[{idx+1}/{len(to_generate)}] SKIP {filename} (already exists)")
            success += 1
            continue

        prompt = build_prompt(item)

        if args.dry_run:
            print(f"[{idx+1}/{len(to_generate)}] {filename}")
            print(f"  Prompt: {prompt[:120]}...")
            print()
            continue

        print(f"[{idx+1}/{len(to_generate)}] Generating {filename}...", end=" ", flush=True)

        if generate_image(prompt, output_path):
            # Find actual file (might be .jpg)
            actual = output_path if os.path.exists(output_path) else output_path.replace(".png", ".jpg")
            ext = os.path.splitext(actual)[1]
            size_kb = os.path.getsize(actual) / 1024
            print(f"OK ({size_kb:.0f}KB)")

            file_url = f"/static/evidence/{os.path.basename(actual)}"
            db_updates.append((file_url, item["id"]))
            success += 1
        else:
            print("FAILED")
            fail += 1

        # Rate limiting
        if not args.dry_run and idx < len(to_generate) - 1:
            time.sleep(DELAY_BETWEEN_REQUESTS)

    # Update database with file paths
    if db_updates:
        print(f"\nUpdating database with {len(db_updates)} file paths...")
        conn = sqlite3.connect(DB_PATH)
        for file_url, eid in db_updates:
            conn.execute("UPDATE evidence SET file_path = ? WHERE id = ?", (file_url, eid))
        conn.commit()
        conn.close()
        print("Database updated.")

    print(f"\nDone: {success} succeeded, {fail} failed")
    if to_generate and not args.dry_run:
        print(f"Estimated cost: ${success * 0.039:.2f}")


if __name__ == "__main__":
    main()
