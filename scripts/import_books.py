"""Rebuild data/authors.json from data/Final_Book_List.xlsx.

Needs openpyxl (pip install openpyxl). Columns: S. No., Pen Name, Category, Title, Link.
Rows with no title (section headings, blanks) are skipped.
Bios and taglines are not in the spreadsheet; any already in authors.json are kept.
Run from the repo root:  python3 scripts/import_books.py
"""
import json, os, re
import openpyxl

SRC, DST = "data/Final_Book_List.xlsx", "data/authors.json"
COLORS = ["#b5533c", "#2f5d7c", "#5b7d3a", "#7a4e8c", "#a07a1c", "#3d7a74", "#8c3b55", "#4f5d75", "#6b5b3e"]

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

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
    by_name[pen]["books"].append({"title": title, "category": (cat or "").strip(), "amazon": link.strip()})

json.dump(authors, open(DST, "w"), indent=2, ensure_ascii=False)
open(DST, "a").write("\n")
print(f"{len(authors)} authors, {sum(len(a['books']) for a in authors)} books")
