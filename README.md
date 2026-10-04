# Greybridge Press website

Static website for an indie publisher supporting authors on Amazon KDP. No dependencies, just Node.

## Edit content

- `data/site.json` - publisher name, tagline, contact email
- `data/authors.json` - authors, bios and their books (each book has an Amazon link)

Add an author by adding an entry with a unique `slug`. Their page is created at `/authors/<slug>/` and their books also appear on `/books/`.

## Build

    node build.js

Output goes to `docs/`. Deploy that folder anywhere (GitHub Pages: set source to `/docs`, Netlify, Cloudflare Pages).

## Before launch

- Covers are colored placeholders. Add real covers later if wanted.

## Custom domain

The site is served at `www.greybridgepress.com` through GitHub Pages. The domain is set in `src/CNAME`, which the build copies to `docs/CNAME` (the build wipes `docs/`, so do not edit that copy). To change the domain, edit `src/CNAME` and rebuild.
