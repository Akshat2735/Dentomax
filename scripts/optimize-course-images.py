"""Generate responsive WebP versions of the course photos.

For every public/course-images/<slug>.jpg|png this writes:
    <slug>-640.webp    (cards, mobile)
    <slug>-1300.webp   (course page hero, high-density screens)
The original file stays in place as the fallback for the <picture> element and is
what the catalogue data files point at, so re-running the catalogue sync scripts
never breaks anything. Re-run this script after adding or replacing a course image.

    python -m pip install pillow
    python scripts/optimize-course-images.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "public" / "course-images"
WIDTHS = (640, 1300)
QUALITY = 80
ORIGINAL_SUFFIXES = {".jpg", ".jpeg", ".png"}

total_before = total_after = 0
for source in sorted(IMAGES.iterdir()):
    if source.suffix.lower() not in ORIGINAL_SUFFIXES:
        continue
    with Image.open(source) as opened:
        image = opened.convert("RGB")
    total_before += source.stat().st_size
    for width in WIDTHS:
        target = IMAGES / f"{source.stem}-{width}.webp"
        resized = image if image.width <= width else image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        resized.save(target, "WEBP", quality=QUALITY, method=6)
        print(f"{target.name:70} {resized.width}x{resized.height} {target.stat().st_size // 1024:>4} KB")
    total_after += (IMAGES / f"{source.stem}-640.webp").stat().st_size

print(f"\noriginals: {total_before // 1024} KB total; the 640px WebP set a card loads: {total_after // 1024} KB total")
