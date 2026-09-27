from pathlib import Path
from PIL import Image

src = Path(r"C:\Users\ADMIN\.cursor\projects\e-Dentomax\assets")
dst = Path(r"E:\Dentomax\Dentomax\public\atmosphere")
dst.mkdir(parents=True, exist_ok=True)
jobs = {
    "library-hall.png": ("library-hall.webp", (1920, 1080), 78),
    "bookshelf-edge.png": ("bookshelf-edge.webp", (720, 1280), 76),
    "study-desk.png": ("study-desk.webp", (1600, 900), 76),
    "institutional-night.png": ("institutional-night.webp", (1600, 900), 76),
    "paper-fiber.png": ("paper-fiber.webp", (512, 512), 70),
    "dental-plate.png": ("dental-plate.webp", (900, 1200), 74),
}
for name, (out, size, q) in jobs.items():
    im = Image.open(src / name).convert("RGB")
    im.thumbnail(size, Image.Resampling.LANCZOS)
    path = dst / out
    im.save(path, "WEBP", quality=q, method=6)
    print(out, im.size, path.stat().st_size)
