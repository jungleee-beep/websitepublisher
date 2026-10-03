// Static site generator. No dependencies. Run: node build.js
// Reads data/*.json and writes the finished site to docs/.
const fs = require("fs");
const path = require("path");

const site = JSON.parse(fs.readFileSync("data/site.json", "utf8"));
const authors = JSON.parse(fs.readFileSync("data/authors.json", "utf8"));
const OUT = "docs";
fs.rmSync(OUT, { recursive: true, force: true }); // drop pages for removed authors

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// HTML-entity encode so the address is not sitting in the page source as plain text
const entities = (t) => [...t].map((c) => `&#${c.charCodeAt(0)};`).join("");
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const allBooks = authors
  .flatMap((a) => a.books.map((b) => ({ ...b, author: a, slug: slugify(b.title) })));

const catSlug = (c) => slugify(c || "other");
const genreOf = (a) => {
  const cats = [...new Set(a.books.map((b) => b.category).filter(Boolean))];
  return cats.length > 1 ? "Fiction and non-fiction" : cats[0] || "";
};
const initials = (name) => {
  const w = name.replace(/,.*$/, "").split(/\s+/).filter((x) => !/^(dr\.?|prof\.?|phd)$/i.test(x));
  return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase();
};
const nBooks = (n) => `${n} ${n === 1 ? "book" : "books"}`;

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function page({ title, desc, depth, nav, body }) {
  const root = depth === 0 ? "./" : "../".repeat(depth);
  const links = [
    ["authors/", "Authors"],
    ["books/", "Books"],
    ["for-authors/", "For authors"],
    ["about/", "About"],
    ["contact/", "Contact"],
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || site.tagline + " " + site.subtitle)}">
<link rel="icon" type="image/png" href="${root}images/favicon.png">
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="banner-wrap"><a class="banner-link" href="${root}"><img class="banner" src="${root}images/banner.jpg" width="1600" height="608" alt="${esc(site.name)}: ${esc(site.tagline)}"></a></div>
<header class="site-header">
  <div class="wrap bar">
    <nav aria-label="Main">
      ${links.map(([h, l]) => {
        const a = `<a href="${root}${h}"${nav === h ? ' aria-current="page"' : ""}>${l}</a>`;
        if (h !== "authors/") return a;
        const sub = authors.map((x) => `<a href="${root}authors/${x.slug}/">${esc(x.name)}</a>`).join("");
        return `<div class="has-menu">${a}<div class="menu">${sub}</div></div>`;
      }).join("\n      ")}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <img class="foot-logo" src="${root}images/logo.jpg" width="120" height="120" alt="${esc(site.name)} logo">
    <p><strong>${esc(site.name)}</strong> - ${esc(site.tagline)} ${esc(site.subtitle)}</p>
    <p class="small">Books are sold by Amazon. Links on this site go to each book's Amazon page.</p>
  </div>
</footer>
</body>
</html>
`;
}

const coverFile = (book) => `covers/${slugify(book.title)}.jpg`;
function cover(book, root) {
  if (fs.existsSync(path.join("src", coverFile(book)))) {
    return `<img class="cover-img" src="${root}${coverFile(book)}" width="130" height="195" loading="lazy" alt="Cover of ${esc(book.title)} by ${esc(book.author.name)}">`;
  }
  return `<div class="cover" style="--c:${book.author.color}" role="img" aria-label="Cover placeholder for ${esc(book.title)}">
  <span class="cover-title">${esc(book.title)}</span>
  <span class="cover-author">${esc(book.author.name)}</span>
</div>`;
}

function bookCard(book, depth, showAuthor) {
  const root = "../".repeat(depth);
  return `<article class="book" data-cat="${catSlug(book.category)}">
  ${cover(book, root)}
  <div class="book-info">
    <h3>${esc(book.title)}</h3>
    ${book.series ? `<p class="series">${esc(book.series)}</p>` : ""}
    ${showAuthor ? `<p class="by">by <a href="${root}authors/${book.author.slug}/">${esc(book.author.name)}</a></p>` : ""}
    ${book.description ? `<p>${esc(book.description)}</p>` : ""}
    <p class="meta">${[book.category, book.year, (book.formats || []).join(", ")].filter(Boolean).map(esc).join(" &middot; ")}</p>
    <a class="btn" href="${esc(book.amazon)}" rel="noopener" target="_blank">Buy on Amazon</a>
  </div>
</article>`;
}

function authorCard(a, depth) {
  const root = "../".repeat(depth);
  return `<a class="author-card" href="${root}authors/${a.slug}/" style="--c:${a.color}">
  <span class="avatar" aria-hidden="true">${esc(initials(a.name))}</span>
  <span class="author-name">${esc(a.name)}</span>
  <span class="author-genre">${esc(genreOf(a))}</span>
  ${a.tagline ? `<span class="author-tag">${esc(a.tagline)}</span>` : ""}
  <span class="author-count">${nBooks(a.books.length)}</span>
</a>`;
}

// Home
const cats = ["Fiction", "Non-fiction"].map((c) => [c, allBooks.filter((b) => b.category === c).length]);
write("index.html", page({
  title: `${site.name} - Indie publisher for KDP authors`,
  depth: 0,
  nav: "",
  body: `<section class="hero">
  <div class="wrap hero-text">
    <h1 class="sr-only">${esc(site.name)}: ${esc(site.tagline)}</h1>
    <p class="kicker">${esc(site.subtitle)}</p>
    <p class="lead">We help authors publish and keep publishing on Amazon KDP. We handle the editing, cover design, formatting and launch, and you keep creative control.</p>
    <p><a class="btn" href="for-authors/">Publish with us</a> <a class="btn ghost" href="books/">Browse our books</a></p>
  </div>
</section>
<section class="wrap section">
  <h2>Browse our books</h2>
  <div class="cards">${cats.map(([c, n]) => `<a class="card cat-card" href="books/#${catSlug(c)}"><h3>${c}</h3><p>${nBooks(n)} from ${new Set(allBooks.filter((b) => b.category === c).map((b) => b.author.slug)).size} authors</p></a>`).join("")}</div>
  <p><a href="books/">See all ${allBooks.length} books &rarr;</a></p>
</section>
<section class="band">
  <div class="wrap section">
    <h2>Our authors</h2>
    <div class="author-grid">${authors.map((a) => authorCard(a, 0)).join("\n")}</div>
    <p><a href="authors/">Meet everyone &rarr;</a></p>
  </div>
</section>`,
}));

// Authors index
write("authors/index.html", page({
  title: `Authors - ${site.name}`,
  desc: "Meet the authors published by " + site.name,
  depth: 1,
  nav: "authors/",
  body: `<div class="wrap section">
  <h1>Our authors</h1>
  <p class="lead">Every author here publishes through Amazon KDP with our support. Click through to see their books.</p>
  <div class="author-grid">${authors.map((a) => authorCard(a, 1)).join("\n")}</div>
</div>`,
}));

// Author pages
for (const a of authors) {
  const links = Object.entries(a.links || {})
    .map(([k, v]) => {
      if (k === "email") return `<a href="${entities("mailto:" + v)}">${entities(v)}</a>`;
      return `<a href="${esc(v)}" rel="noopener" target="_blank">${k === "amazon" ? "Amazon author page" : "Website"}</a>`;
    })
    .join(" &middot; ");
  write(`authors/${a.slug}/index.html`, page({
    title: `${a.name} - ${site.name}`,
    desc: `${a.name}: ${a.tagline || nBooks(a.books.length) + " published by " + site.name}`,
    depth: 2,
    nav: "authors/",
    body: `<div class="wrap section">
  <p class="crumb"><a href="../">&larr; All authors</a></p>
  <div class="author-head" style="--c:${a.color}">
    <span class="avatar big" aria-hidden="true">${esc(initials(a.name))}</span>
    <div>
      <h1>${esc(a.name)}</h1>
      <p class="author-genre">${esc(genreOf(a))} &middot; ${nBooks(a.books.length)}</p>
      ${a.tagline ? `<p class="lead">${esc(a.tagline)}</p>` : ""}
    </div>
  </div>
  ${a.bio.length || links ? `<div class="bio">${a.bio.map((p) => `<p>${esc(p)}</p>`).join("")}${links ? `<p class="small">${links}</p>` : ""}</div>` : ""}
  <h2>Books by ${esc(a.name)}</h2>
  <div class="book-list">${a.books.map((b) => bookCard({ ...b, author: a }, 2, false)).join("\n")}</div>
</div>`,
  }));
}

// Books index
write("books/index.html", page({
  title: `Books - ${site.name}`,
  desc: "All books published by " + site.name,
  depth: 1,
  nav: "books/",
  body: `<div class="wrap section">
  <h1>All books</h1>
  <div class="filters" role="group" aria-label="Filter by category">
    <button type="button" data-f="all" aria-pressed="true">All (${allBooks.length})</button>
    ${cats.map(([c, n]) => `<button type="button" data-f="${catSlug(c)}" aria-pressed="false">${c} (${n})</button>`).join("\n    ")}
  </div>
  <div class="book-list">${allBooks.map((b) => bookCard(b, 1, true)).join("\n")}</div>
</div>
<script>
(function () {
  var btns = document.querySelectorAll(".filters button"), books = document.querySelectorAll(".book");
  function show(f) {
    btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.f === f)); });
    books.forEach(function (b) { b.hidden = f !== "all" && b.dataset.cat !== f; });
  }
  btns.forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.f); history.replaceState(null, "", b.dataset.f === "all" ? "#" : "#" + b.dataset.f); }); });
  var h = location.hash.slice(1);
  show([].some.call(btns, function (b) { return b.dataset.f === h; }) ? h : "all");
})();
</script>`,
}));

// For authors
const services = [
  ["Editing", "Developmental edits, copyedits and proofreading from editors who read your genre."],
  ["Cover design", "Professional covers for ebook, paperback and hardcover, built to sell at thumbnail size."],
  ["Formatting", "Clean interiors and Kindle files that pass KDP review the first time."],
  ["KDP setup", "Metadata, keywords, categories, pricing and your Author Central page, done properly."],
  ["Launch and marketing", "A launch plan, review outreach, newsletter swaps and ad guidance."],
  ["Ongoing support", "A real person to ask when your rankings drop or your next book is ready."],
];
write("for-authors/index.html", page({
  title: `For authors - ${site.name}`,
  desc: "How we help authors publish on Amazon KDP.",
  depth: 1,
  nav: "for-authors/",
  body: `<div class="wrap section">
  <h1>Publish on KDP, with a team behind you</h1>
  <p class="lead">You keep your rights and your KDP account. We do the work that makes a book look and sell like it came from a big house.</p>
  <div class="cards">${services.map(([t, d]) => `<div class="card"><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>
  <h2>How it works</h2>
  <ol class="steps">
    <li><strong>Send us your book.</strong> A short pitch and a sample chapter is plenty.</li>
    <li><strong>We talk.</strong> We tell you honestly whether we can help and what it would take.</li>
    <li><strong>We build it together.</strong> Edit, cover, formatting, and a launch plan.</li>
    <li><strong>You publish.</strong> The book goes live under your KDP account and appears on your page here.</li>
  </ol>
  <h2>Submissions</h2>
  <p>${site.submissionsOpen ? "We are currently open to new authors." : "We are not open to submissions right now."} Email us at <a href="mailto:${esc(site.email)}?subject=Submission">${esc(site.email)}</a> with your genre, a short pitch and a sample chapter.</p>
</div>`,
}));

// About
write("about/index.html", page({
  title: `About - ${site.name}`,
  depth: 1,
  nav: "about/",
  body: `<div class="wrap section narrow">
  <h1>About ${esc(site.name)}</h1>
  <p class="lead">We are a small independent press for authors who want a professional finish without giving up control.</p>
  <p>Self-publishing on Amazon KDP is powerful, but doing every job yourself is exhausting. We started this press to share the load: editors, designers and marketers working for the author, not the other way around.</p>
  <p>We publish a small number of books each year so every author gets proper attention. Authors keep their rights, their KDP accounts and the final say on their work.</p>
  <p><a class="btn" href="../for-authors/">How we work with authors</a></p>
</div>`,
}));

// Contact
write("contact/index.html", page({
  title: `Contact - ${site.name}`,
  depth: 1,
  nav: "contact/",
  body: `<div class="wrap section narrow">
  <h1>Contact</h1>
  <p class="lead">Questions, submissions or press enquiries, we read everything.</p>
  <p><a class="btn" href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
</div>`,
}));

fs.copyFileSync("src/style.css", path.join(OUT, "style.css"));
fs.cpSync("src/images", path.join(OUT, "images"), { recursive: true });
if (fs.existsSync("src/covers")) fs.cpSync("src/covers", path.join(OUT, "covers"), { recursive: true });
// GitHub Pages custom domain: the CNAME file must live in the published folder
if (fs.existsSync("src/CNAME")) fs.copyFileSync("src/CNAME", path.join(OUT, "CNAME"));
console.log(`Built ${authors.length} authors and ${allBooks.length} books into ${OUT}/`);
