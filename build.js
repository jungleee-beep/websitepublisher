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
// Mailchimp signup form (the publisher's list). Shown only on the author pages listed in
// "newsletterAuthors" in data/site.json. Plain HTML posting to Mailchimp, no scripts,
// so nothing loads from third parties until a visitor submits. The hidden b_... field is
// Mailchimp's bot trap and must stay empty.
const NEWSLETTER = `<form class="newsletter" action="https://greybridgepress.us10.list-manage.com/subscribe/post?u=5976044de63cd6e5ff47f95a5&amp;id=3e82efc963&amp;f_id=000fc2e1f0" method="post" name="mc-embedded-subscribe-form" target="_blank" rel="noopener">
    <h2>Subscribe to our Newsletter</h2>
    <label for="mce-EMAIL">Email Address <span class="req" aria-hidden="true">*</span></label>
    <div class="nl-row">
      <input type="email" name="EMAIL" id="mce-EMAIL" required autocomplete="email" placeholder="Your email address">
      <button type="submit" name="subscribe">Subscribe</button>
    </div>
    <div style="position:absolute;left:-5000px" aria-hidden="true"><input type="text" name="b_5976044de63cd6e5ff47f95a5_3e82efc963" tabindex="-1" value=""></div>
    <p class="small">You can unsubscribe at any time.</p>
  </form>`;
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
    ["", "Books"],
    ["authors/", "Authors"],
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

function authorCard(a, depth, showEmail = true) {
  const root = "../".repeat(depth);
  const href = `${root}authors/${a.slug}/`;
  const email = showEmail && a.links && a.links.email;
  const top = `<span class="avatar" aria-hidden="true">${esc(initials(a.name))}</span>
    <span class="author-name">${esc(a.name)}</span>`;
  const bottom = `<span class="author-genre">${esc(genreOf(a))}</span>
    ${a.tagline ? `<span class="author-tag">${esc(a.tagline)}</span>` : ""}
    <span class="author-count">${nBooks(a.books.length)}</span>`;
  // Anchors cannot nest, so with an email the card is two plain links to the same page
  // (above and below the email). Every part of the card except the email opens the author.
  if (!email) {
    return `<a class="author-card" href="${href}" style="--c:${a.color}">
  <span class="card-part">${top}${bottom}</span>
</a>`;
  }
  return `<div class="author-card" style="--c:${a.color}">
  <a class="card-part card-top" href="${href}">${top}</a>
  <div class="card-mid"><a class="card-fill card-fill-l" href="${href}" tabindex="-1" aria-hidden="true"></a><a class="author-email" href="${entities("mailto:" + email)}">${entities(email)}</a><a class="card-fill" href="${href}" tabindex="-1" aria-hidden="true"></a></div>
  <a class="card-part card-bottom" href="${href}" tabindex="-1" aria-hidden="true">${bottom}</a>
</div>`;
}

const cats = ["Fiction", "Non-fiction"].map((c) => [c, allBooks.filter((b) => b.category === c).length]);

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
  const email = a.links && a.links.email;
  const links = Object.entries(a.links || {})
    .filter(([k]) => k !== "email")
    .map(([k, v]) => `<a href="${esc(v)}" rel="noopener" target="_blank">${k === "amazon" ? "Amazon author page" : "Website"}</a>`)
    .join(" &middot; ");
  const contact = email ? `<p class="contact">Contact the Author: <a href="${entities("mailto:" + email)}">${entities(email)}</a></p>` : "";
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
  <div class="bio">${a.bio.map((p) => `<p>${esc(p)}</p>`).join("")}${contact}${(site.newsletterAuthors || []).includes(a.slug) ? NEWSLETTER : ""}${links ? `<p class="small">${links}</p>` : ""}</div>
  <h2>Books by ${esc(a.name)}</h2>
  <div class="book-list">${a.books.map((b) => bookCard({ ...b, author: a }, 2, false)).join("\n")}</div>
</div>`,
  }));
}

// Landing page: the books catalogue (also the first tab in the nav)
write("index.html", page({
  title: `${site.name} - Books`,
  desc: `${site.tagline} ${site.subtitle}`,
  depth: 0,
  nav: "",
  body: `<div class="wrap section">
  <h1>Our books</h1>
  <div class="filters" role="group" aria-label="Filter by category">
    <button type="button" data-f="all" aria-pressed="true">All (${allBooks.length})</button>
    ${cats.map(([c, n]) => `<button type="button" data-f="${catSlug(c)}" aria-pressed="false">${c} (${n})</button>`).join("\n    ")}
  </div>
  <div class="book-list">${allBooks.map((b) => bookCard(b, 0, true)).join("\n")}</div>
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

// The old /books/ address now forwards to the landing page, keeping any #fiction filter
write("books/index.html", `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.name)} - Books</title>
<link rel="canonical" href="../">
<meta http-equiv="refresh" content="0; url=../">
<script>location.replace("../" + location.hash);</script>
</head>
<body><p><a href="../">Our books are on the home page.</a></p></body>
</html>
`);

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
