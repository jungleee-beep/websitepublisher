"""Download book covers into src/covers/<title-slug>.jpg.

For each book in data/authors.json: follow its mybook.to link one hop to find the
Amazon ASIN, then fetch the cover from Amazon's image server. ASINs are cached in
data/asins.json. Needs Pillow (pip install pillow). Existing covers are kept unless
you pass --force. Run from the repo root:  python3 scripts/fetch_covers.py
"""
import io, json, os, re, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
FORCE = "--force" in sys.argv
CACHE = "data/asins.json"
asins = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
slugify = lambda s: re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None
opener = urllib.request.build_opener(NoRedirect)

def find_asin(url):
    """Follow redirects by hand, stopping before we reach amazon.com itself."""
    for _ in range(6):
        m = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
        if m:
            return m.group(1)
        try:
            opener.open(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=20)
            return None
        except urllib.error.HTTPError as e:
            loc = e.headers.get("Location")
            if e.code in (301, 302, 303, 307, 308) and loc:
                url = urllib.request.urljoin(url, loc)
            else:
                return None
    return None

def fetch(book):
    slug, link = slugify(book["title"]), book["amazon"]
    out = f"src/covers/{slug}.jpg"
    if os.path.exists(out) and not FORCE:
        return slug, "kept"
    asin = asins.get(link) or find_asin(link)
    if not asin:
        # Some links are a landing page rather than a redirect; use the cover it embeds.
        try:
            page = urllib.request.urlopen(urllib.request.Request(link, headers={"User-Agent": UA}), timeout=20).read().decode("utf-8", "ignore")
            m = re.search(r"https://m\.media-amazon\.com/images/I/[^\"' <>]+\.jpg", page)
            im = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(m.group(0), headers={"User-Agent": UA}), timeout=20).read())).convert("RGB")
            im.thumbnail((400, 600))
            im.save(out, quality=88)
            return slug, f"ok landing page {im.size}"
        except Exception:
            return slug, "no ASIN found"
    asins[link] = asin
    for size in ("LZZZZZZZ", "SCLZZZZZZZ"):
        try:
            req = urllib.request.Request(f"https://m.media-amazon.com/images/P/{asin}.01.{size}.jpg", headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=20).read()
        except Exception:
            continue
        try:
            im = Image.open(io.BytesIO(data)).convert("RGB")
        except Exception:
            continue
        if im.width < 100:  # Amazon returns a 1x1 gif when it has no image
            continue
        im.thumbnail((400, 600))
        im.save(out, quality=88)
        return slug, f"ok {asin} {im.size}"
    return slug, f"no image for {asin}"

os.makedirs("src/covers", exist_ok=True)
books = [b for a in json.load(open("data/authors.json")) for b in a["books"]]
with ThreadPoolExecutor(6) as ex:
    results = list(ex.map(fetch, books))
json.dump(asins, open(CACHE, "w"), indent=2)
bad = [(s, r) for s, r in results if not r.startswith(("ok", "kept"))]
print(f"{len(results) - len(bad)}/{len(results)} covers present")
for s, r in bad:
    print("  missing:", s, "-", r)
