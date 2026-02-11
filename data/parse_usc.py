#!/usr/bin/env python3
"""Parse USC XML files (USLM schema) from uscode.house.gov into a JSON index.

Reads official XML files downloaded from:
  https://uscode.house.gov/download/download.shtml

Outputs data/usc_index.json with structure:
  {"18 USC 922": {"heading": "Unlawful acts", "text": "..."}, ...}

Run once: python3 data/parse_usc.py
"""

import json
import os
import re
import sys
import xml.etree.ElementTree as ET

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USC_DIR = os.path.join(SCRIPT_DIR, "usc")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "usc_index.json")

NAMESPACE = {"uslm": "http://xml.house.gov/schemas/uslm/1.0"}

# Map of XML filenames to title numbers
TITLE_FILES = {
    "usc18.xml": "18",
    "usc18a.xml": "18a",
    "usc21.xml": "21",
    "usc42.xml": "42",
}


def extract_text(element):
    """Extract all text from an element, stripping XML tags but preserving structure."""
    raw = "".join(element.itertext())
    # Collapse excessive whitespace but keep paragraph breaks
    lines = raw.split("\n")
    cleaned = []
    for line in lines:
        stripped = " ".join(line.split())  # collapse internal whitespace
        if stripped:
            cleaned.append(stripped)
    return "\n".join(cleaned)


def parse_usc_xml(filepath, title_num):
    """Parse a single USC XML file and return dict of sections."""
    print(f"  Parsing {os.path.basename(filepath)} (Title {title_num})...")

    tree = ET.parse(filepath)
    root = tree.getroot()

    sections = {}
    for section_el in root.findall(".//uslm:section", NAMESPACE):
        identifier = section_el.get("identifier", "")

        # Extract section number from <num> element
        num_el = section_el.find("uslm:num", NAMESPACE)
        if num_el is None:
            continue
        section_num = num_el.get("value", "").strip()
        if not section_num:
            continue

        # Extract heading
        heading_el = section_el.find("uslm:heading", NAMESPACE)
        heading = ""
        if heading_el is not None:
            heading = " ".join(heading_el.itertext()).strip()

        # Skip repealed/transferred sections with no substantive text
        if heading.startswith("Repealed") or heading.startswith("Transferred"):
            continue

        # Extract full text content
        text = extract_text(section_el)
        if not text or len(text) < 20:
            continue

        # Build key: "18 USC 922" or "21 USC 841"
        key = f"{title_num} USC {section_num}"

        sections[key] = {
            "heading": heading,
            "text": text,
            "identifier": identifier,
            "text_length": len(text),
        }

    return sections


def main():
    print("=" * 60)
    print("USC XML Parser — Building index from official government XML")
    print("=" * 60)

    if not os.path.isdir(USC_DIR):
        print(f"ERROR: {USC_DIR} not found. Download XML files first.")
        sys.exit(1)

    all_sections = {}
    total_chars = 0

    for filename, title_num in TITLE_FILES.items():
        filepath = os.path.join(USC_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  WARNING: {filename} not found, skipping.")
            continue

        sections = parse_usc_xml(filepath, title_num)
        all_sections.update(sections)

        title_chars = sum(s["text_length"] for s in sections.values())
        total_chars += title_chars
        print(f"    → {len(sections)} sections, {title_chars:,} chars of text")

    # Write index
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_sections, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"DONE: {len(all_sections)} total sections indexed")
    print(f"Total text: {total_chars:,} characters")
    print(f"Output: {OUTPUT_FILE} ({os.path.getsize(OUTPUT_FILE):,} bytes)")
    print(f"{'=' * 60}")

    # Print sample of key sections for verification
    key_sections = [
        "18 USC 922", "18 USC 924", "18 USC 1983",
        "21 USC 841", "21 USC 812",
        "42 USC 1983", "42 USC 1985",
    ]
    print("\nKey sections verification:")
    for key in key_sections:
        if key in all_sections:
            s = all_sections[key]
            print(f"  ✓ {key}: {s['heading'][:60]} ({s['text_length']:,} chars)")
        else:
            print(f"  ✗ {key}: NOT FOUND")


if __name__ == "__main__":
    main()
