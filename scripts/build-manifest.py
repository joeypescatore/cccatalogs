#!/usr/bin/env python3
"""Scan film pics, extract dates from EXIF (fallback: file mtime), sort newest→oldest."""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path

from PIL import Image
from PIL.ExifTags import TAGS

SOURCE = Path("/Users/joeypescatore/Desktop/Film Pics 2")
ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "public" / "images"
MANIFEST_PATH = ROOT / "data" / "manifest.json"

EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".webp"}


def extract_date(path: Path) -> datetime:
    try:
        with Image.open(path) as img:
            exif = img._getexif()
            if exif:
                for key, val in exif.items():
                    tag = TAGS.get(key, key)
                    if tag in ("DateTimeOriginal", "DateTime", "DateTimeDigitized") and val:
                        return datetime.strptime(str(val), "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    stat = path.stat()
    return datetime.fromtimestamp(stat.st_mtime)


def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Clear old symlinks/files in images dir
    for item in IMAGES_DIR.iterdir():
        if item.is_symlink() or item.is_file():
            item.unlink()

    entries = []
    for path in sorted(SOURCE.iterdir()):
        if path.suffix.lower() not in EXTENSIONS:
            continue
        dt = extract_date(path)
        dest = IMAGES_DIR / path.name
        if not dest.exists():
            dest.symlink_to(path.resolve())
        entries.append(
            {
                "file": path.name,
                "timestamp": dt.timestamp(),
                "month": dt.strftime("%B"),
                "year": dt.strftime("%Y"),
                "label": dt.strftime("%B %Y"),
            }
        )

    entries.sort(key=lambda e: e["timestamp"], reverse=True)

    manifest = {"count": len(entries), "photos": entries}
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {len(entries)} photos to {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
