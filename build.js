// Static site generator. No dependencies. Run: node build.js
// Reads data/*.json and writes the finished site to docs/.
const fs = require("fs");
const path = require("path");

const site = JSON.parse(fs.readFileSync("data/site.json", "utf8"));
const authors = JSON.parse(fs.readFileSync("data/authors.json", "utf8"));
const OUT = "docs";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const allBooks = authors
  .flatMap((a) => a.books.map((b) => ({ ...b, author: a, slug: slugify(b.title) })))
  .sort((x, y) => y.year - x.year);

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
<meta name="description" content="${esc(desc || site.tagline)}">
<link rel="stylesheet" href="${root}style.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap bar">
    <a class="logo" href="${root}">${esc(site.name)}</a>
    <nav aria-label="Main">
      ${links.map(([h, l]) => `<a href="${root}${h}"${nav === h ? ' aria-current="page"' : ""}>${l}</a>`).join("\n      ")}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p><strong>${esc(site.name)}</strong> - ${esc(site.tagline)}</p>
    <p class="small">Books are sold by Amazon. Links on this site go to each book's Amazon page.</p>
  </div>
</footer>
</body>
</html>
`;
}

function cover(book, root) {
  return `<div class="cover" style="--c:${book.author.color}" role="img" aria-label="Cover placeholder for ${esc(book.title)}">
  <span class="cover-title">${esc(book.title)}</span>
  <span class="cover-author">${esc(book.author.name)}</span>
</div>`;
}

function bookCard(book, depth, showAuthor) {
  const root = "../".repeat(depth);
  return `<article class="book">
  ${cover(book)}
  <div class="book-info">
    <h3>${esc(book.title)}</h3>
    ${book.series ? `<p class="series">${esc(book.series)}</p>` : ""}
    ${showAuthor ? `<p class="by">by <a href="${root}authors/${book.author.slug}/">${esc(book.author.name)}</a></p>` : ""}
    <p>${esc(book.description)}</p>
    <p class="meta">${book.year} &middot; ${book.formats.map(esc).join(", ")}</p>
    <a class="btn" href="${esc(book.amazon)}" rel="noopener" target="_blank">Buy on Amazon</a>
  </div>
</article>`;
}

function authorCard(a, depth) {
  const root = "../".repeat(depth);
  return `<a class="author-card" href="${root}authors/${a.slug}/" style="--c:${a.color}">
  <span class="avatar" aria-hidden="true">${esc(a.name.split(" ").map((w) => w[0]).join(""))}</span>
  <span class="author-name">${esc(a.name)}</span>
  <span class="author-genre">${esc(a.genre)}</span>
  <span class="author-tag">${esc(a.tagline)}</span>
  <span class="author-count">${a.books.length} ${a.books.length === 1 ? "book" : "books"}</span>
</a>`;
}

// Home
const featured = allBooks.slice(0, 3);
write("index.html", page({
  title: `${site.name} - Indie publisher for KDP authors`,
  depth: 0,
  nav: "",
  body: `<section class="hero">
  <div class="wrap">
    <h1>Good books deserve a good start.</h1>
    <p class="lead">${esc(site.tagline)} We handle the editing, cover design, formatting and launch, and you keep creative control.</p>
    <p><a class="btn" href="for-authors/">Publish with us</a> <a class="btn ghost" href="books/">Browse our books</a></p>
  </div>
</section>
<section class="wrap section">
  <h2>Latest books</h2>
  <div class="book-list">${featured.map((b) => bookCard(b, 0, true)).join("\n")}</div>
  <p><a href="books/">See all books &rarr;</a></p>
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
  <p class="lead">Every author here publishes through Amazon KDP with our support. Click through for their bio and books.</p>
  <div class="author-grid">${authors.map((a) => authorCard(a, 1)).join("\n")}</div>
</div>`,
}));

// Author pages
for (const a of authors) {
  const links = Object.entries(a.links || {})
    .map(([k, v]) => `<a href="${esc(v)}" rel="noopener" target="_blank">${k === "amazon" ? "Amazon author page" : "Website"}</a>`)
    .join(" &middot; ");
  write(`authors/${a.slug}/index.html`, page({
    title: `${a.name} - ${site.name}`,
    desc: `${a.name}: ${a.tagline}`,
    depth: 2,
    nav: "authors/",
    body: `<div class="wrap section">
  <p class="crumb"><a href="../">&larr; All authors</a></p>
  <div class="author-head" style="--c:${a.color}">
    <span class="avatar big" aria-hidden="true">${esc(a.name.split(" ").map((w) => w[0]).join(""))}</span>
    <div>
      <h1>${esc(a.name)}</h1>
      <p class="author-genre">${esc(a.genre)}</p>
      <p class="lead">${esc(a.tagline)}</p>
    </div>
  </div>
  <div class="bio">${a.bio.map((p) => `<p>${esc(p)}</p>`).join("")}${links ? `<p class="small">${links}</p>` : ""}</div>
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
  <div class="book-list">${allBooks.map((b) => bookCard(b, 1, true)).join("\n")}</div>
</div>`,
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
console.log(`Built ${authors.length} authors and ${allBooks.length} books into ${OUT}/`);
