"""Generate the site icons from the header's teal "D" badge.

Writes (Next.js picks these up automatically from the app/ folder):
    app/icon.svg        vector icon for modern browsers (written by hand below)
    app/favicon.ico     16/32/48 px for older browsers and bookmarks
    app/apple-icon.png  180 px home-screen icon (square; iOS rounds the corners itself)

This is a placeholder mark that matches the site header. To use the client's real logo,
replace those three files (keep the names) and delete this script.

    python -m pip install pillow
    python scripts/generate-favicons.py      # needs the Georgia font (Windows/macOS)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
TOP, BOTTOM = (46, 138, 139), (17, 61, 68)  # teal gradient, top-left to bottom-right
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\georgia.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
    "/Library/Fonts/Georgia.ttf",
]

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2e8a8b"/>
      <stop offset="1" stop-color="#113d44"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <text x="32" y="45" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#fff">D</text>
</svg>
"""


def find_font() -> str:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return path
    raise SystemExit("Georgia font not found; edit FONT_CANDIDATES in this script.")


def badge(size: int, rounded: bool) -> Image.Image:
    """Draw the badge at 4x and scale down so edges stay smooth."""
    big = size * 4
    gradient = Image.new("RGB", (big, big))
    px = gradient.load()
    for y in range(big):
        for x in range(big):
            t = (x + y) / (2 * (big - 1))
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM))
    image = gradient.convert("RGBA")
    if rounded:
        mask = Image.new("L", (big, big), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 0.22), fill=255)
        image.putalpha(mask)
    font = ImageFont.truetype(find_font(), round(big * 0.66))
    ImageDraw.Draw(image).text((big / 2, big * 0.53), "D", font=font, fill="white", anchor="mm")
    return image.resize((size, size), Image.Resampling.LANCZOS)


(APP / "icon.svg").write_text(SVG, encoding="utf-8")
badge(256, rounded=True).save(APP / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
badge(180, rounded=False).convert("RGB").save(APP / "apple-icon.png")
for name in ("icon.svg", "favicon.ico", "apple-icon.png"):
    print(f"{name:16} {(APP / name).stat().st_size} bytes")
