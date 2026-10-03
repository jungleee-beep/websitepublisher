"""Rebuild data/authors.json from data/Final_Book_List.xlsx.

Needs openpyxl (pip install openpyxl). Columns: S. No., Pen Name, Category, Title, Link.
Rows with no title (section headings, blanks) are skipped.
Book descriptions and series come from data/descriptions.json (matched by title).
Bios and taglines are not in the spreadsheet; any already in authors.json are kept.
Authors are shown in reverse alphabetical order (see PUSH_TO_END below).
Run from the repo root:  python3 scripts/import_books.py
"""
import json, os, re
import openpyxl

SRC, DST = "data/Final_Book_List.xlsx", "data/authors.json"
DESC = "data/descriptions.json"  # title -> {"description": ..., "series": ...}, edit freely
COLORS = ["#b5533c", "#2f5d7c", "#5b7d3a", "#7a4e8c", "#a07a1c", "#3d7a74", "#8c3b55", "#4f5d75", "#6b5b3e"]

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

extra = json.load(open(DESC)) if os.path.exists(DESC) else {}
old = {}
if os.path.exists(DST):
    old = {a["slug"]: a for a in json.load(open(DST))}

authors, by_name = [], {}
for row in openpyxl.load_workbook(SRC).active.iter_rows(min_row=2, values_only=True):
    _, pen, cat, title, link = (list(row) + [None] * 5)[:5]
    if not (pen and title and link):
        continue
    pen, title = pen.strip(), title.strip()
    if pen not in by_name:
        slug = slugify(pen)
        prev = old.get(slug, {})
        by_name[pen] = {
            "slug": slug, "name": pen,
            "color": prev.get("color", COLORS[len(authors) % len(COLORS)]),
            "tagline": prev.get("tagline", ""), "bio": prev.get("bio", []),
            "links": prev.get("links", {}), "books": [],
        }
        authors.append(by_name[pen])
    by_name[pen]["books"].append({"title": title, "category": (cat or "").strip(), "amazon": link.strip(), **extra.get(title, {})})

# Within each author, series books are listed in reading order. A series sits where its
# first book appeared in the spreadsheet. Uses the "series" text from descriptions.json:
# "<Series>, Booklet N of M" / "<Series>, Book N", or "Sequel to <Title>" (placed right after it).
def series_key(book):
    ser = book.get("series", "")
    m = re.match(r"Sequel to (.+)$", ser)
    if m:
        return m.group(1), 2
    m = re.match(r"(.+?), (?:Booklet|Book) (\d+)", ser)
    return (m.group(1), int(m.group(2))) if m else (None, 0)

for a in authors:
    keys = [series_key(b) for b in a["books"]]
    firsts = {}
    for i, b in enumerate(a["books"]):
        group = keys[i][0] or b["title"]
        firsts.setdefault(group, i)
    # a sequel's base book (no series text) joins its sequel's group as book 1
    for i, b in enumerate(a["books"]):
        if keys[i][0] is None and any(k[0] == b["title"] for k in keys):
            keys[i] = (b["title"], 1)
    order = sorted(range(len(a["books"])), key=lambda i: (firsts[keys[i][0] or a["books"][i]["title"]], keys[i][1], i))
    a["books"] = [a["books"][i] for i in order]

# Display order: reverse alphabetical by name (ignoring "Dr."), except authors listed
# in PUSH_TO_END, which go last so similar-genre authors are not next to each other.
PUSH_TO_END = ["dr-saiyed-ali-al-razavi"]
def sort_key(a):
    return re.sub(r"^dr\.?\s+", "", a["name"], flags=re.I).lower()
authors.sort(key=sort_key, reverse=True)
authors.sort(key=lambda a: a["slug"] in PUSH_TO_END)  # stable: keeps the order above

json.dump(authors, open(DST, "w"), indent=2, ensure_ascii=False)
open(DST, "a").write("\n")
print(f"{len(authors)} authors, {sum(len(a['books']) for a in authors)} books")
