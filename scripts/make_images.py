"""Make the smaller image files the site uses. Needs Pillow (pip install pillow).

Run from the repo root:  python3 scripts/make_images.py
- src/images/banner.webp        the banner at 2x of its 760px display size, WebP
- src/images/logo-240.jpg       footer logo at 2x of its 120px display size
- src/images/apple-touch-icon.png, icon-192.png, icon-512.png   home screen icons
- src/covers/small/<slug>.jpg   260px-wide copies of every cover, for the cards
Existing files are kept unless you pass --force. fetch_covers.py also makes the small covers.
"""
import os, sys
from PIL import Image

FORCE = "--force" in sys.argv

def save(img, path, **kw):
    if os.path.exists(path) and not FORCE:
        return False
    img.save(path, **kw)
    return True

def make_small_covers():
    os.makedirs("src/covers/small", exist_ok=True)
    n = 0
    for name in sorted(os.listdir("src/covers")):
        if not name.endswith(".jpg"):
            continue
        im = Image.open(f"src/covers/{name}").convert("RGB")
        if im.width > 260:
            im = im.resize((260, round(im.height * 260 / im.width)), Image.LANCZOS)
        n += save(im, f"src/covers/small/{name}", quality=74, optimize=True, progressive=True)
    return n

if __name__ == "__main__":
    banner = Image.open("src/images/banner.jpg").convert("RGB")
    w = 1520
    save(banner.resize((w, round(banner.height * w / banner.width)), Image.LANCZOS), "src/images/banner.webp", quality=80, method=6)
    logo = Image.open("src/images/logo.jpg").convert("RGB")
    save(logo.resize((240, 240), Image.LANCZOS), "src/images/logo-240.jpg", quality=85, optimize=True)
    for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        save(logo.resize((size, size), Image.LANCZOS), f"src/images/{name}")
    print("small covers made:", make_small_covers())
