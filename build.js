#!/usr/bin/env node
/**
 * Ledgerline static build.
 *
 * Why this exists: the task requires "shared components and a structure a
 * content team could extend without touching layout code" while forbidding
 * page builders. This script is the smallest thing that satisfies both —
 * header/footer/nav live in /partials once, each page in /pages is just its
 * <head> metadata + main content, and this script stitches them together at
 * build time. No client-side framework, no runtime cost, output is plain
 * static HTML that ships to /dist.
 *
 * A content editor adding a 5th page:
 *   1. Copy /pages/_template.html to /pages/new-page.html
 *   2. Fill in <title>, meta description, OG tags, JSON-LD, and the <main> content
 *   3. Add one <li> to partials/header.html for the nav link
 *   4. Run `node build.js`
 * They never touch CSS, the footer, or the nav markup logic.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PAGES_DIR = path.join(ROOT, "pages");
const PARTIALS_DIR = path.join(ROOT, "partials");
const DIST_DIR = path.join(ROOT, "dist");

const header = fs.readFileSync(path.join(PARTIALS_DIR, "header.html"), "utf8");
const footer = fs.readFileSync(path.join(PARTIALS_DIR, "footer.html"), "utf8");

function copyStatic() {
  for (const dir of ["css", "js"]) {
    const src = path.join(ROOT, dir);
    const dest = path.join(DIST_DIR, dir);
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      fs.copyFileSync(path.join(src, file), path.join(dest, file));
    }
  }
  for (const file of ["robots.txt", "sitemap.xml"]) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, file));
  }
}

function markActiveNav(headerHtml, slug) {
  // slug e.g. "home", "product", "pricing", "contact"
  return headerHtml.replace(
    new RegExp(`data-nav="${slug}"`),
    `data-nav="${slug}" aria-current="page"`
  );
}

function build() {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  copyStatic();

  const pageFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".html") && !f.startsWith("_"));

  for (const file of pageFiles) {
    const slug = path.basename(file, ".html"); // home | product | pricing | contact
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), "utf8");
    const scopedHeader = markActiveNav(header, slug);

    const html = raw
      .replace("{{HEADER}}", scopedHeader)
      .replace("{{FOOTER}}", footer);

    const outName = slug === "home" ? "index.html" : `${slug}.html`;
    fs.writeFileSync(path.join(DIST_DIR, outName), html);
    console.log(`built dist/${outName}`);
  }
}

build();
