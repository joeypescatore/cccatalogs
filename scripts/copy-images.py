#!/usr/bin/env python3
"""Copy images from Desktop into public/images for deployment."""

import shutil
from pathlib import Path

SOURCE = Path("/Users/joeypescatore/Desktop/Film Pics 2")
DEST = Path(__file__).resolve().parent.parent / "public" / "images"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".webp"}


def main():
    DEST.mkdir(parents=True, exist_ok=True)

    source_files = {
        p.name for p in SOURCE.iterdir() if p.suffix.lower() in EXTENSIONS
    }

    for item in DEST.iterdir():
        if item.name not in source_files and (item.is_file() or item.is_symlink()):
            item.unlink()

    count = 0
    for path in SOURCE.iterdir():
        if path.suffix.lower() not in EXTENSIONS:
            continue
        target = DEST / path.name
        if target.is_symlink():
            target.unlink()
        if not target.exists() or target.stat().st_size != path.stat().st_size:
            shutil.copy2(path, target)
            count += 1

    print(f"Synced {count} images to {DEST} ({len(source_files)} total)")


if __name__ == "__main__":
    main()
