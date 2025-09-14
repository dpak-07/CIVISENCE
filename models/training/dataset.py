#!/usr/bin/env python3
"""
gather_and_build_dataset.py

Full pipeline to gather many public image datasets (Kaggle + HTTP zip + local zips),
normalize images into a unified folder, create a CSV suitable for multimodal training,
and save a sources manifest.

Usage:
  python gather_and_build_dataset.py

Requirements:
  pip install requests tqdm pillow pandas numpy kaggle

Notes:
 - If you use Kaggle sources, configure your kaggle API token at ~/.kaggle/kaggle.json
 - Check dataset licenses before use.
"""
import os
import sys
import zipfile
import shutil
import uuid
import random
import json
import subprocess
from pathlib import Path
from urllib.parse import urlparse
from tqdm import tqdm
import requests
from PIL import Image
import numpy as np
import pandas as pd
import time

# ---------------- CONFIG ----------------
OUT_DIR = Path("unified_dataset")
IMAGES_DIR = OUT_DIR / "images"
RAW_DIR = Path("raw_data")
OUT_CSV = OUT_DIR / "unified_dataset.csv"
MANIFEST = OUT_DIR / "sources_manifest.json"

# ============================
# Curated sources to fetch
# ----------------------------
# Each tuple: (kind, identifier, notes)
# kind: "kaggle" => Kaggle slug (requires kaggle CLI + ~/.kaggle/kaggle.json)
#       "http_zip" => direct URL to a zip file
#       "local_zip" => local zip path under raw_data/
#
# You can add/remove slugs or replace with your own local zips.
# I included many relevant datasets for potholes, road damage, trash, and floods.
# Make sure you have permission to use each dataset for your purpose.
# ============================
DATA_SOURCES = [
    ("kaggle", "atulyakumar98/pothole-detection-dataset", "Pothole detection images"),
    ("kaggle", "sameerjha2000/potholes-dataset", "Indian potholes dataset"),
    ("kaggle", "rjain2007/garbage-classification", "Garbage classification dataset"),
    ("kaggle", "musfequa/india-road-damage", "India road damage images"),
    ("kaggle", "lorenzoarcioni/road-damage-dataset-potholes-cracks-and-manholes", "Road damage / manholes"),
    ("kaggle", "sachinpatel21/pothole-image-dataset", "Pothole Image Data-Set (Sachin Patel)"),
    ("kaggle", "mitangshu11/indian-roads-dataset", "Indian Roads Dataset"),
    ("kaggle", "alvarobasily/road-damage", "Smartphone road damage images"),
    # Add more Kaggle slugs you want to include...
    # Example HTTP zip placeholders (uncomment & replace with real URLs if available)
    # ("http_zip", "https://example.com/some_dataset.zip", "External dataset zip URL"),
    # Local zip example (put file into raw_data/)
    # ("local_zip", "raw_data/my_local_dataset.zip", "Local zip file"),
]

# Text templates for synthetic report_text (can be replaced by real text later)
TEXT_TEMPLATES = {
    "pothole": [
        "Large pothole on the road near {} causing problems for two-wheelers.",
        "Huge pothole in front of {}, needs urgent repair.",
        "There is a dangerous hole in the middle of the lane near {}."
    ],
    "garbage": [
        "Overflowing garbage bin near {} with bad smell.",
        "Trash piled up beside the road outside {}.",
        "Illegal dumping near {} creating unhygienic conditions."
    ],
    "streetlight": [
        "Streetlight not working in front of {} — area is dark at night.",
        "Broken streetlight near {}; dangerous for pedestrians.",
        "Flickering streetlight outside {}."
    ],
    "water_leak": [
        "Water pipe leaking near {}; road is slippery.",
        "Burst water main outside {} flooding the street.",
        "Continuous water leak near {} needs fixing."
    ],
    "flood": [
        "Road flooded near {} after heavy rain.",
        "Water logging in front of {} blocking vehicles.",
        "Flooded area near {} — needs immediate attention."
    ],
    "other": [
        "Public safety issue near {} needs attention.",
        "Please check the issue near {}."
    ]
}

POSSIBLE_TYPES = ["pothole", "garbage", "streetlight", "water_leak", "flood", "other"]
SEVERITY_TO_PRIORITY = {"low":0, "medium":1, "high":2, "critical":3}
POIS = ["City Mall", "MG Road", "Central Park", "Bus Stop A", "Town Hall", "Market Area", "River Bridge"]

# Max images per type to keep (None = keep all)
MAX_PER_TYPE = None

# Image validation/resize
MIN_SIZE = (64,64)
RESIZE_TO = (512,512)  # standardize sizes for storage; training pipeline can re-resize further

# ---------------- Helper functions ----------------
def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

def run_kaggle_download(slug: str, out_folder: Path, timeout=600):
    """Download a Kaggle dataset via the kaggle CLI into out_folder and unzip it.
       Returns True on success, False on failure.
    """
    ensure_dir(out_folder)
    cmd = f'kaggle datasets download -p "{out_folder}" --unzip "{slug}"'
    print(f"[kaggle] running: {cmd}")
    try:
        # Use shell=True for Windows compatibility; be careful with inputs (trusted)
        subprocess.check_call(cmd, shell=True, timeout=timeout)
        return True
    except Exception as e:
        print(f"[kaggle] failed to download {slug}: {e}")
        return False

def download_http_zip(url: str, dst: Path):
    try:
        ensure_dir(dst.parent)
        with requests.get(url, stream=True, timeout=60) as r:
            r.raise_for_status()
            total = int(r.headers.get("content-length", 0))
            with open(dst, "wb") as f:
                for chunk in tqdm(r.iter_content(chunk_size=8192), total=(total//8192)+1, desc=f"Downloading {dst.name}"):
                    if chunk:
                        f.write(chunk)
        return True
    except Exception as e:
        print(f"[http] download failed: {url} -> {e}")
        return False

def safe_extract_zip(zip_path: Path, extract_to: Path):
    try:
        ensure_dir(extract_to)
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_to)
        return True
    except Exception as e:
        print(f"[zip] failed to unzip {zip_path}: {e}")
        return False

def find_image_files(folder: Path):
    exts = {".jpg",".jpeg",".png",".bmp",".tiff",".webp"}
    files = []
    for root, dirs, filenames in os.walk(folder):
        for fn in filenames:
            if Path(fn).suffix.lower() in exts:
                files.append(Path(root) / fn)
    return files

def guess_type_from_name(name: str):
    s = name.lower()
    if "pothole" in s or "potholes" in s or "hole" in s:
        return "pothole"
    if "garbage" in s or "trash" in s or "waste" in s or "dump" in s:
        return "garbage"
    if "streetlight" in s or "street_light" in s or "lamp" in s:
        return "streetlight"
    if "flood" in s or "water" in s or "flooding" in s:
        return "flood"
    if "leak" in s or "pipe" in s:
        return "water_leak"
    return None

def validate_and_copy_image(src: Path, dest: Path):
    try:
        with Image.open(src) as im:
            im = im.convert("RGB")
            if im.size[0] < MIN_SIZE[0] or im.size[1] < MIN_SIZE[1]:
                return False
            # preserve aspect ratio; thumbnail modifies in place
            im.thumbnail(RESIZE_TO, Image.ANTIALIAS)
            ensure_dir(dest.parent)
            im.save(dest, format="JPEG", quality=85)
        return True
    except Exception:
        return False

def make_report_text(report_type):
    poi = random.choice(POIS)
    templates = TEXT_TEMPLATES.get(report_type, TEXT_TEMPLATES["other"])
    return random.choice(templates).format(poi)

# ---------------- Main pipeline ----------------
def gather_and_build(data_sources=DATA_SOURCES):
    random.seed(42)
    ensure_dir(OUT_DIR)
    ensure_dir(IMAGES_DIR)
    ensure_dir(RAW_DIR)

    manifest = []
    all_entries = []

    for kind, identifier, notes in data_sources:
        print(f"\n>>> Processing source kind={kind} id={identifier}")
        start = time.time()
        source_entry = {"kind": kind, "identifier": identifier, "notes": notes, "status": "skipped", "found_images": 0, "collected": 0}
        try:
            if kind == "kaggle":
                slug_name = identifier.replace("/", "_")
                target = RAW_DIR / slug_name
                if not target.exists() or not any(target.iterdir()):
                    ok = run_kaggle_download(identifier, target)
                    if not ok:
                        print(f"[warn] kaggle download failed for {identifier}, skipping.")
                        source_entry["status"] = "download_failed"
                        manifest.append(source_entry)
                        continue
                imgs = find_image_files(target)
                source_entry["found_images"] = len(imgs)
                for p in imgs:
                    rtype = guess_type_from_name(p.name) or guess_type_from_name(str(p.parent.name)) or "other"
                    if rtype not in POSSIBLE_TYPES:
                        rtype = "other"
                    dest_folder = IMAGES_DIR / rtype
                    ensure_dir(dest_folder)
                    new_name = f"{rtype}_{uuid.uuid4().hex}.jpg"
                    dest = dest_folder / new_name
                    ok = validate_and_copy_image(p, dest)
                    if not ok:
                        continue
                    severity = random.choices(["low","medium","high","critical"], weights=[0.6,0.25,0.1,0.05])[0]
                    entry = {
                        "report_id": uuid.uuid4().hex,
                        "report_text": make_report_text(rtype),
                        "report_type": rtype,
                        "image_path": str(dest.relative_to(OUT_DIR)),
                        "severity_label": severity,
                        "priority_label": SEVERITY_TO_PRIORITY[severity],
                        "lat": round(12.9 + random.uniform(-0.2,0.2), 6),
                        "lon": round(77.5 + random.uniform(-0.2,0.2), 6),
                        "dup_count": 0,
                        "time_since_first_hours": round(random.uniform(0,72),2),
                        "location_criticality": int(rtype in ["pothole","streetlight"]),
                        "reporter_id": "",
                        "status": "open",
                        "source": identifier
                    }
                    all_entries.append(entry)
                    source_entry["collected"] += 1
                source_entry["status"] = "collected"

            elif kind == "local_zip":
                zip_path = Path(identifier)
                if not zip_path.exists():
                    print(f"[warn] local zip {zip_path} not found. Skipping.")
                    source_entry["status"] = "not_found"
                    manifest.append(source_entry)
                    continue
                tmp = RAW_DIR / zip_path.stem
                if not tmp.exists() or not any(tmp.iterdir()):
                    safe_extract_zip(zip_path, tmp)
                imgs = find_image_files(tmp)
                source_entry["found_images"] = len(imgs)
                for p in imgs:
                    rtype = guess_type_from_name(p.name) or "other"
                    dest_folder = IMAGES_DIR / rtype
                    ensure_dir(dest_folder)
                    new_name = f"{rtype}_{uuid.uuid4().hex}.jpg"
                    dest = dest_folder / new_name
                    ok = validate_and_copy_image(p, dest)
                    if not ok:
                        continue
                    severity = random.choice(["low","medium","high"])
                    entry = {
                        "report_id": uuid.uuid4().hex,
                        "report_text": make_report_text(rtype),
                        "report_type": rtype,
                        "image_path": str(dest.relative_to(OUT_DIR)),
                        "severity_label": severity,
                        "priority_label": SEVERITY_TO_PRIORITY[severity],
                        "lat": round(12.9 + random.uniform(-0.2,0.2), 6),
                        "lon": round(77.5 + random.uniform(-0.2,0.2), 6),
                        "dup_count": 0,
                        "time_since_first_hours": round(random.uniform(0,72),2),
                        "location_criticality": 0,
                        "reporter_id":"",
                        "status":"open",
                        "source": str(zip_path)
                    }
                    all_entries.append(entry)
                    source_entry["collected"] += 1
                source_entry["status"] = "collected"

            elif kind == "http_zip":
                url = identifier
                parsed = urlparse(url)
                fname = Path(parsed.path).name or f"download_{uuid.uuid4().hex}.zip"
                dst = RAW_DIR / fname
                if not dst.exists():
                    ok = download_http_zip(url, dst)
                    if not ok:
                        source_entry["status"] = "download_failed"
                        manifest.append(source_entry)
                        continue
                tmp = RAW_DIR / (dst.stem + "_ex")
                if not tmp.exists() or not any(tmp.iterdir()):
                    safe_extract_zip(dst, tmp)
                imgs = find_image_files(tmp)
                source_entry["found_images"] = len(imgs)
                for p in imgs:
                    rtype = guess_type_from_name(p.name) or "other"
                    dest_folder = IMAGES_DIR / rtype
                    ensure_dir(dest_folder)
                    new_name = f"{rtype}_{uuid.uuid4().hex}.jpg"
                    dest = dest_folder / new_name
                    ok = validate_and_copy_image(p, dest)
                    if not ok:
                        continue
                    severity = random.choice(["low","medium","high"])
                    entry = {
                        "report_id": uuid.uuid4().hex,
                        "report_text": make_report_text(rtype),
                        "report_type": rtype,
                        "image_path": str(dest.relative_to(OUT_DIR)),
                        "severity_label": severity,
                        "priority_label": SEVERITY_TO_PRIORITY[severity],
                        "lat": round(12.9 + random.uniform(-0.2,0.2), 6),
                        "lon": round(77.5 + random.uniform(-0.2,0.2), 6),
                        "dup_count": 0,
                        "time_since_first_hours": round(random.uniform(0,72),2),
                        "location_criticality": 0,
                        "reporter_id":"",
                        "status":"open",
                        "source": url
                    }
                    all_entries.append(entry)
                    source_entry["collected"] += 1
                source_entry["status"] = "collected"

            else:
                print(f"[warn] Unknown source kind {kind}, skipping.")
                source_entry["status"] = "unsupported"

        except Exception as e:
            print(f"[error] processing {identifier}: {e}")
            source_entry["status"] = f"error:{str(e)}"

        source_entry["duration_seconds"] = round(time.time() - start, 2)
        manifest.append(source_entry)

    # Fallback: if nothing was collected, try to scan raw_data for images
    if not all_entries:
        print("[info] No entries collected from DATA_SOURCES. Scanning raw_data folder for images...")
        imgs = find_image_files(RAW_DIR)
        for p in imgs:
            rtype = guess_type_from_name(p.name) or "other"
            dest_folder = IMAGES_DIR / rtype
            ensure_dir(dest_folder)
            new_name = f"{rtype}_{uuid.uuid4().hex}.jpg"
            dest = dest_folder / new_name
            ok = validate_and_copy_image(p, dest)
            if not ok:
                continue
            severity = random.choice(["low","medium","high"])
            all_entries.append({
                "report_id": uuid.uuid4().hex,
                "report_text": make_report_text(rtype),
                "report_type": rtype,
                "image_path": str(dest.relative_to(OUT_DIR)),
                "severity_label": severity,
                "priority_label": SEVERITY_TO_PRIORITY[severity],
                "lat": round(12.9 + random.uniform(-0.2,0.2), 6),
                "lon": round(77.5 + random.uniform(-0.2,0.2), 6),
                "dup_count": 0,
                "time_since_first_hours": round(random.uniform(0,72),2),
                "location_criticality": 0,
                "reporter_id":"",
                "status":"open",
                "source":"raw_data_scan"
            })

    # Build dataframe and optionally cap per type
    df = pd.DataFrame(all_entries)
    if df.empty:
        print("[error] No images collected. Please add sources or put zips into raw_data/")
        # still save manifest
        ensure_dir(OUT_DIR)
        with open(MANIFEST, "w", encoding="utf8") as f:
            json.dump(manifest, f, indent=2)
        return

    df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)

    if MAX_PER_TYPE is not None:
        keep = []
        for t, g in df.groupby("report_type"):
            if len(g) > MAX_PER_TYPE:
                keep.append(g.sample(MAX_PER_TYPE, random_state=42))
            else:
                keep.append(g)
        df = pd.concat(keep).reset_index(drop=True)

    # Ensure output dir exists and save CSV + manifest
    ensure_dir(OUT_DIR)
    df.to_csv(OUT_CSV, index=False)
    with open(MANIFEST, "w", encoding="utf8") as f:
        json.dump(manifest, f, indent=2)

    # Print a short summary
    print("\n=== DONE ===")
    print("Unified CSV:", OUT_CSV.resolve())
    print("Images folder:", IMAGES_DIR.resolve())
    print("Total rows:", len(df))
    print("\nCounts by report_type:")
    print(df['report_type'].value_counts())
    print("\nSample rows:")
    print(df.head(10).to_string(index=False))
    print("\nSources manifest saved to:", MANIFEST.resolve())

if __name__ == "__main__":
    # you can optionally modify DATA_SOURCES here before calling gather_and_build
    gather_and_build(DATA_SOURCES)
