# Lantern & Ink Press website

Static website for an indie publisher supporting authors on Amazon KDP. No dependencies, just Node.

## Edit content

- `data/site.json` - publisher name, tagline, contact email
- `data/authors.json` - authors, bios and their books (each book has an Amazon link)

Add an author by adding an entry with a unique `slug`. Their page is created at `/authors/<slug>/` and their books also appear on `/books/`.

## Build

    node build.js

Output goes to `docs/`. Deploy that folder anywhere (GitHub Pages: set source to `/docs`, Netlify, Cloudflare Pages).

## Before launch

- Replace the sample authors, `hello@example.com` and the `EXAMPLE000x` Amazon links.
- Covers are colored placeholders. Add real covers later if wanted.
