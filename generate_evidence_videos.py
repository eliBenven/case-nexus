#!/usr/bin/env python3
"""Convert evidence still images to video clips using ffmpeg.

Takes body_cam, surveillance, and dashcam evidence images and creates
short .mp4 video clips with type-appropriate motion effects.

Usage: python3 generate_evidence_videos.py [--type TYPE] [--limit N]
"""

import argparse
import os
import random
import re
import sqlite3
import subprocess

EVIDENCE_DIR = os.path.join(os.path.dirname(__file__), "static", "evidence")
DB_PATH = os.path.join(os.path.dirname(__file__), "case_nexus.db")

VIDEO_TYPES = {"body_cam", "surveillance", "dashcam"}


def make_video(image_path: str, output_path: str, etype: str, seed: int) -> bool:
    """Create a short video clip from a still image using ffmpeg effects."""
    rng = random.Random(seed)
    duration = rng.randint(5, 8)
    fps = 15 if etype == "surveillance" else 24

    if etype == "surveillance":
        # Surveillance: slow pan + noise + low framerate
        x_start = rng.randint(0, 80)
        y_start = rng.randint(0, 40)
        x_end = rng.randint(0, 80)
        y_end = rng.randint(0, 40)
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", image_path,
            "-vf", (
                f"scale=1280:960,crop=960:720:{x_start}+({x_end}-{x_start})*t/{duration}:{y_start}+({y_end}-{y_start})*t/{duration},"
                f"noise=alls=25:allf=t,"
                f"eq=contrast=0.9:brightness=-0.05:saturation=0.3,"
                f"fps={fps}"
            ),
            "-t", str(duration), "-c:v", "libx264", "-preset", "fast",
            "-pix_fmt", "yuv420p", "-crf", "30", "-an", output_path
        ]
    elif etype == "body_cam":
        # Body cam: handheld shake + slight zoom drift
        shake_x = rng.randint(3, 8)
        shake_y = rng.randint(2, 5)
        shake_freq = rng.uniform(1.5, 3.0)
        zoom_start = rng.uniform(1.0, 1.02)
        zoom_end = rng.uniform(1.03, 1.08)
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", image_path,
            "-vf", (
                f"scale=1280:960,"
                f"zoompan=z='min({zoom_start}+({zoom_end}-{zoom_start})*on/({duration}*{fps}),1.5)'"
                f":x='iw/2-(iw/zoom/2)+{shake_x}*sin({shake_freq}*PI*on/{fps})'"
                f":y='ih/2-(ih/zoom/2)+{shake_y}*cos({shake_freq*1.3}*PI*on/{fps})'"
                f":d={duration*fps}:s=960x720:fps={fps},"
                f"noise=alls=8:allf=t,"
                f"eq=brightness=-0.02"
            ),
            "-t", str(duration), "-c:v", "libx264", "-preset", "fast",
            "-pix_fmt", "yuv420p", "-crf", "30", "-an", output_path
        ]
    elif etype == "dashcam":
        # Dashcam: smooth slow zoom forward
        zoom_start = 1.0
        zoom_end = rng.uniform(1.05, 1.12)
        x_drift = rng.randint(-5, 5)
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", image_path,
            "-vf", (
                f"scale=1280:960,"
                f"zoompan=z='min({zoom_start}+({zoom_end}-{zoom_start})*on/({duration}*{fps}),1.5)'"
                f":x='iw/2-(iw/zoom/2)+{x_drift}*sin(0.3*PI*on/{fps})'"
                f":y='ih/2-(ih/zoom/2)-2*on/({duration}*{fps})'"
                f":d={duration*fps}:s=960x720:fps={fps},"
                f"noise=alls=5:allf=t"
            ),
            "-t", str(duration), "-c:v", "libx264", "-preset", "fast",
            "-pix_fmt", "yuv420p", "-crf", "30", "-an", output_path
        ]
    else:
        return False

    try:
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        return result.returncode == 0
    except Exception as e:
        print(f"    ffmpeg error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", type=str, default="", help="Only process this evidence type")
    parser.add_argument("--limit", type=int, default=9999)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    conn = sqlite3.connect(DB_PATH)
    query = """
        SELECT e.id, e.case_number, e.evidence_type, e.file_path
        FROM evidence e
        WHERE e.evidence_type IN ('body_cam', 'surveillance', 'dashcam')
        AND e.file_path != '' AND e.file_path IS NOT NULL
        AND e.file_path NOT LIKE '%.mp4'
        ORDER BY e.id
    """
    rows = conn.execute(query).fetchall()

    if args.type:
        rows = [r for r in rows if r[2] == args.type]
    rows = rows[:args.limit]

    print(f"Converting {len(rows)} evidence images to video clips")

    success = 0
    fail = 0
    db_updates = []

    for idx, (eid, case_num, etype, file_path) in enumerate(rows):
        # Source image path
        img_filename = os.path.basename(file_path)
        img_path = os.path.join(EVIDENCE_DIR, img_filename)

        if not os.path.exists(img_path):
            print(f"[{idx+1}/{len(rows)}] SKIP {img_filename} (image not found)")
            fail += 1
            continue

        # Output video path
        vid_filename = os.path.splitext(img_filename)[0] + ".mp4"
        vid_path = os.path.join(EVIDENCE_DIR, vid_filename)

        if os.path.exists(vid_path):
            print(f"[{idx+1}/{len(rows)}] SKIP {vid_filename} (already exists)")
            success += 1
            continue

        if args.dry_run:
            print(f"[{idx+1}/{len(rows)}] Would convert {img_filename} -> {vid_filename}")
            continue

        print(f"[{idx+1}/{len(rows)}] {img_filename} -> {vid_filename}...", end=" ", flush=True)

        seed = int(re.sub(r"\D", "", case_num)) + eid
        if make_video(img_path, vid_path, etype, seed):
            size_kb = os.path.getsize(vid_path) / 1024
            print(f"OK ({size_kb:.0f}KB)")

            vid_url = f"/static/evidence/{vid_filename}"
            poster_url = file_path  # original image becomes poster
            db_updates.append((vid_url, poster_url, eid))
            success += 1
        else:
            print("FAILED")
            fail += 1

    # Update database: set file_path to .mp4, poster_path to original image
    if db_updates:
        print(f"\nUpdating database with {len(db_updates)} video paths...")
        for vid_url, poster_url, eid in db_updates:
            conn.execute(
                "UPDATE evidence SET file_path = ?, poster_path = ? WHERE id = ?",
                (vid_url, poster_url, eid)
            )
        conn.commit()
        print("Database updated.")

    conn.close()
    print(f"\nDone: {success} succeeded, {fail} failed")


if __name__ == "__main__":
    main()
