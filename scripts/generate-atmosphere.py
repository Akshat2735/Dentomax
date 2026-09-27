"""Illustrative atmosphere assets — painted, not stock photography."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

OUT = Path(__file__).resolve().parents[1] / "public" / "atmosphere"
OUT.mkdir(parents=True, exist_ok=True)

WOOD = [(64, 38, 22), (86, 52, 28), (48, 30, 16), (102, 64, 34), (72, 44, 24)]
SPINES = [
    (44, 24, 18), (92, 46, 30), (28, 56, 52), (20, 38, 46),
    (118, 90, 50), (66, 40, 28), (36, 28, 22), (24, 68, 60),
    (98, 56, 34), (52, 28, 20), (74, 50, 32), (26, 46, 42),
    (140, 108, 62), (18, 30, 32), (80, 34, 28),
]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def fill_vgrad(img, top, bottom, y0=0, y1=None):
    w, h = img.size
    y1 = h if y1 is None else y1
    px = img.load()
    span = max(1, y1 - y0 - 1)
    for y in range(y0, min(y1, h)):
        c = lerp(top, bottom, (y - y0) / span)
        for x in range(w):
            px[x, y] = c[:3]


def noise(img, amount=10, seed=1, step=2):
    r = random.Random(seed)
    px = img.load()
    w, h = img.size
    for y in range(0, h, step):
        for x in range(0, w, step):
            n = r.randint(-amount, amount)
            p = px[x, y]
            c = tuple(max(0, min(255, p[i] + n)) for i in range(3))
            for dy in range(step):
                for dx in range(step):
                    if x + dx < w and y + dy < h:
                        px[x + dx, y + dy] = c
    return img


def draw_book(draw, x, y, w, h, color, gold=False):
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)
    draw.line([(x, y), (x, y + h)], fill=lerp(color, (0, 0, 0), 0.4))
    if gold and h > 36:
        gy = y + int(h * 0.2)
        draw.line([(x + 2, gy), (x + w - 3, gy)], fill=(196, 158, 88))
    if h > 30 and w > 6:
        draw.rectangle(
            [x + 2, y + int(h * 0.44), x + w - 3, y + int(h * 0.56)],
            fill=lerp(color, (236, 220, 180), 0.22),
        )


def paper_fiber():
    img = Image.new("RGB", (512, 512), (232, 218, 190))
    r = random.Random(9)
    px = img.load()
    for y in range(512):
        for x in range(512):
            n = r.randint(-16, 12)
            fiber = 10 if ((x * 5 + y * 11) % 37 == 0) else 0
            v = 228 + n - fiber
            px[x, y] = (max(190, v), max(176, v - 12), max(148, v - 38))
    img.filter(ImageFilter.GaussianBlur(0.35)).save(OUT / "paper-fiber.webp", "WEBP", quality=72, method=6)


def bookshelf_edge():
    w, h = 720, 1280
    img = Image.new("RGB", (w, h), (32, 18, 12))
    fill_vgrad(img, (52, 30, 16), (22, 12, 8))
    draw = ImageDraw.Draw(img)
    for ux in (6, 244, 482, 700):
        draw.rectangle([ux, 0, ux + 20, h], fill=(70, 42, 22))
        draw.line([(ux + 4, 0), (ux + 4, h)], fill=(110, 72, 38))
        draw.line([(ux + 16, 0), (ux + 16, h)], fill=(40, 22, 12))
    row, n = 64, 0
    r = random.Random(3)
    while row < h - 36:
        for col, left in enumerate((28, 266, 504)):
            right = left + 208
            wood = WOOD[(n + col) % len(WOOD)]
            draw.rectangle([left, row, right, row + 15], fill=lerp(wood, (18, 10, 6), 0.15))
            draw.line([(left, row), (right, row)], fill=(24, 14, 8))
            x = left + 3
            while x < right - 8:
                bw = r.randint(7, 15)
                bh = r.randint(42, 96)
                if x + bw >= right - 3:
                    break
                draw_book(draw, x, row - bh, bw, bh, SPINES[r.randint(0, len(SPINES) - 1)], r.random() > 0.6)
                x += bw + r.choice([0, 0, 1])
        row += 110
        n += 1
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse([-100, -160, 420, 380], fill=(240, 190, 110, 40))
    wd.rectangle([0, int(h * 0.62), w, h], fill=(6, 4, 2, 70))
    img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")
    noise(img, 7, 4, 2)
    img.filter(ImageFilter.GaussianBlur(0.45)).save(OUT / "bookshelf-edge.webp", "WEBP", quality=80, method=6)


def _bay(draw, x0, y0, x1, y1, seed):
    r = random.Random(seed)
    if x1 < x0:
        x0, x1 = x1, x0
    draw.rectangle([x0, y0, x1, y1], fill=WOOD[seed % len(WOOD)])
    draw.rectangle([x0, y0, x0 + max(3, (x1 - x0) // 12), y1], fill=(58, 34, 18))
    draw.rectangle([x1 - max(3, (x1 - x0) // 12), y0, x1, y1], fill=(40, 24, 14))
    shelves = 8
    for s in range(shelves):
        sy = y0 + int((s + 1) * (y1 - y0) / (shelves + 0.4))
        draw.line([(x0 + 2, sy), (x1 - 2, sy)], fill=(28, 16, 10), width=2)
        x = x0 + 4
        top = y0 + int(s * (y1 - y0) / shelves) + 3
        while x < x1 - 5:
            bw = max(3, r.randint(4, 9))
            if x + bw >= x1 - 3:
                break
            draw.rectangle([x, top + r.randint(0, 6), x + bw - 1, sy - 1], fill=SPINES[r.randint(0, len(SPINES) - 1)])
            x += bw


def library_hall():
    w, h = 1920, 1080
    img = Image.new("RGB", (w, h), (18, 12, 10))
    fill_vgrad(img, (28, 18, 14), (10, 14, 14), 0, 640)
    fill_vgrad(img, (42, 26, 16), (18, 10, 8), 620, h)
    draw = ImageDraw.Draw(img)
    # ceiling coffers
    for i in range(7):
        y = 20 + i * 28
        draw.line([(80 + i * 40, y), (w - 80 - i * 40, y)], fill=(38, 24, 16), width=3)
    # floor planks in perspective
    for i in range(16):
        t = i / 15
        y = int(640 + t * t * 420)
        x1 = int(40 + t * 760)
        x2 = int(w - 40 - t * 760)
        draw.line([(x1, y), (x2, y)], fill=(30, 18, 10), width=2)
    for i in range(9):
        draw.line([(960, 640), (int(80 + i * 220), h)], fill=(26, 16, 10), width=1)
    # left / right receding bays
    left_pts = [(0, 30, 520, 860), (200, 90, 640, 780), (390, 140, 720, 720), (520, 175, 780, 680)]
    right_pts = [(1400, 30, 1920, 860), (1280, 90, 1720, 780), (1200, 140, 1530, 720), (1140, 175, 1400, 680)]
    for i, box in enumerate(left_pts):
        _bay(draw, *box, seed=i + 2)
    for i, box in enumerate(right_pts):
        _bay(draw, *box, seed=i + 20)
    # far wall + arch
    draw.rectangle([780, 200, 1140, 660], fill=(32, 22, 16))
    draw.pieslice([800, 160, 1120, 620], 180, 0, fill=(54, 38, 26))
    draw.pieslice([860, 220, 1060, 560], 180, 0, fill=(12, 24, 28))
    draw.rectangle([860, 390, 1060, 650], fill=(12, 22, 26))
    # columns flanking aisle
    for x in (760, 1130):
        draw.rectangle([x, 180, x + 36, 660], fill=(72, 48, 28))
        draw.rectangle([x - 10, 168, x + 46, 198], fill=(92, 64, 36))
        draw.rectangle([x - 12, 640, x + 48, 672], fill=(58, 38, 22))
    # lamps
    for cx in (560, 960, 1360):
        draw.line([(cx, 8), (cx, 70)], fill=(90, 64, 32), width=4)
        draw.ellipse([cx - 78, 62, cx + 78, 128], fill=(236, 196, 118))
        draw.ellipse([cx - 50, 78, cx + 50, 118], fill=(255, 224, 160))
    # framed plates on near shelves
    draw.rectangle([48, 240, 148, 360], outline=(168, 132, 78), width=3)
    draw.rectangle([1770, 250, 1872, 370], outline=(168, 132, 78), width=3)
    # light pools
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse([300, 20, 1620, 420], fill=(255, 208, 128, 36))
    wd.ellipse([700, 560, 1220, 860], fill=(255, 190, 100, 22))
    wd.rectangle([0, 0, 140, h], fill=(0, 0, 0, 50))
    wd.rectangle([w - 140, 0, w, h], fill=(0, 0, 0, 50))
    wd.rectangle([0, int(h * 0.78), w, h], fill=(0, 0, 0, 55))
    img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")
    noise(img, 6, 8, 3)
    img = ImageEnhance.Contrast(img).enhance(1.08)
    img.filter(ImageFilter.GaussianBlur(0.7)).save(OUT / "library-hall.webp", "WEBP", quality=78, method=6)


def study_desk():
    w, h = 1600, 900
    img = Image.new("RGB", (w, h), (70, 44, 26))
    fill_vgrad(img, (96, 66, 40), (48, 30, 18))
    draw = ImageDraw.Draw(img)
    r = random.Random(21)
    for i in range(70):
        y = r.randint(0, h)
        draw.line([(0, y), (w, y + r.randint(-22, 22))], fill=(78, 52, 30), width=1)
    # back shelf
    draw.rectangle([0, 0, w, 210], fill=(38, 22, 14))
    x = 30
    while x < w - 20:
        bw = r.randint(18, 42)
        draw.rectangle([x, 18, x + bw, 198], fill=SPINES[r.randint(0, len(SPINES) - 1)])
        if r.random() > 0.55:
            draw.line([(x + 4, 40), (x + bw - 4, 40)], fill=(196, 158, 88))
        x += bw + 2
    draw.rectangle([0, 198, w, 218], fill=(86, 54, 30))
    # blotter + pages
    draw.polygon([(120, 260), (1180, 240), (1220, 820), (90, 800)], fill=(196, 168, 122))
    draw.polygon([(160, 300), (760, 280), (790, 760), (150, 750)], fill=(246, 238, 216))
    draw.polygon([(790, 290), (1140, 270), (1170, 770), (800, 760)], fill=(250, 244, 226))
    draw.line([(790, 292), (800, 758)], fill=(210, 190, 160), width=4)
    for i in range(14):
        y = 340 + i * 26
        draw.line([(820, y), (1120, y + 6)], fill=(196, 176, 148), width=1)
        draw.line([(190, y + 8), (720, y + 4)], fill=(204, 186, 158), width=1)
    # lamp
    draw.polygon([(1280, 500), (1480, 500), (1420, 240), (1340, 240)], fill=(48, 32, 20))
    draw.ellipse([1310, 200, 1450, 250], fill=(236, 196, 110))
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse([900, 80, 1580, 740], fill=(255, 210, 130, 48))
    img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")
    noise(img, 6, 5, 2)
    img.filter(ImageFilter.GaussianBlur(0.8)).save(OUT / "study-desk.webp", "WEBP", quality=78, method=6)


def institutional_night():
    w, h = 1600, 900
    img = Image.new("RGB", (w, h), (8, 16, 18))
    fill_vgrad(img, (14, 28, 32), (6, 10, 12))
    draw = ImageDraw.Draw(img)
    # stone floor
    draw.rectangle([0, 640, w, h], fill=(12, 22, 24))
    for i in range(10):
        draw.line([(0, 650 + i * 24), (w, 650 + i * 18)], fill=(8, 16, 18))
    # arcade
    bays = [(40, 360), (360, 680), (680, 1000), (1000, 1320), (1320, 1560)]
    for i, (a, b) in enumerate(bays):
        draw.rectangle([a, 120, b, 700], fill=(16, 34, 38))
        draw.pieslice([a + 20, 90, b - 20, 520], 180, 0, fill=(10, 22, 26))
        draw.rectangle([a + 20, 300, b - 20, 700], fill=(8, 18, 22))
        glow = (186, 168, 96) if i % 2 == 0 else (70, 120, 112)
        draw.ellipse([a + 70, 210, b - 70, 360], fill=glow)
        # column
        draw.rectangle([b - 28, 80, b + 18, 720], fill=(22, 44, 48))
        draw.rectangle([b - 40, 70, b + 30, 108], fill=(32, 58, 60))
        draw.rectangle([b - 42, 700, b + 32, 748], fill=(18, 36, 40))
    draw.rectangle([0, 60, w, 88], fill=(28, 52, 54))
    wash = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    wd.ellipse([520, 40, 1080, 460], fill=(90, 160, 150, 26))
    wd.rectangle([0, 0, w, h], outline=(0, 0, 0, 0))
    wd.rectangle([0, int(h * 0.72), w, h], fill=(0, 0, 0, 80))
    img = Image.alpha_composite(img.convert("RGBA"), wash).convert("RGB")
    noise(img, 8, 11, 3)
    img.filter(ImageFilter.GaussianBlur(0.9)).save(OUT / "institutional-night.webp", "WEBP", quality=78, method=6)


def dental_plate():
    """Vintage plate: molar section + dental arch — diagrammatic, low-contrast."""
    w, h = 900, 1200
    img = Image.new("RGB", (w, h), (234, 222, 196))
    draw = ImageDraw.Draw(img)
    ink = (86, 58, 38)
    draw.rectangle([36, 36, w - 36, h - 36], outline=ink, width=3)
    draw.rectangle([50, 50, w - 50, h - 50], outline=(150, 118, 74), width=1)
    # title rule
    draw.line([(120, 96), (780, 96)], fill=ink, width=1)
    # molar outline
    cx, cy = 450, 340
    draw.ellipse([cx - 90, cy - 70, cx + 90, cy + 50], outline=ink, width=2)
    draw.polygon(
        [(cx - 70, cy + 30), (cx - 85, cy + 210), (cx - 40, cy + 230), (cx, cy + 120), (cx + 40, cy + 230), (cx + 85, cy + 210), (cx + 70, cy + 30)],
        outline=ink,
    )
    draw.arc([cx - 50, cy - 20, cx + 50, cy + 90], 200, 340, fill=ink, width=2)
    draw.line([(cx - 20, cy + 40), (cx - 28, cy + 180)], fill=ink, width=1)
    draw.line([(cx + 20, cy + 40), (cx + 28, cy + 180)], fill=ink, width=1)
    # dental arch
    draw.arc([180, 620, 720, 980], 200, 340, fill=ink, width=2)
    draw.arc([210, 650, 690, 950], 200, 340, fill=ink, width=1)
    for i in range(10):
        ang = math.radians(205 + i * 15)
        tx = int(450 + math.cos(ang) * 230)
        ty = int(840 + math.sin(ang) * 150)
        draw.ellipse([tx - 12, ty - 18, tx + 12, ty + 18], outline=ink, width=2)
        draw.line([(tx, ty + 18), (tx, ty + 28)], fill=ink, width=1)
    img = ImageEnhance.Color(img).enhance(0.65)
    img.save(OUT / "dental-plate.webp", "WEBP", quality=82, method=6)


if __name__ == "__main__":
    paper_fiber()
    bookshelf_edge()
    library_hall()
    study_desk()
    institutional_night()
    dental_plate()
    print("done")
