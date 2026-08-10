// build.js
// Stitches /partials into each /pages/*.html and outputs static HTML,
// plus /css and /js, into /dist. No dependencies, no bundler.
//
// Usage: node build.js

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const PAGES_DIR = path.join(ROOT, "pages");
const PARTIALS_DIR = path.join(ROOT, "partials");

const template = fs.readFileSync(path.join(ROOT, "template.html"), "utf8");
const headerSrc = fs.readFileSync(path.join(PARTIALS_DIR, "header.html"), "utf8");
const footerSrc = fs.readFileSync(path.join(PARTIALS_DIR, "footer.html"), "utf8");

function extract(section, html) {
  const re = new RegExp(`<!--${section}-->([\\s\\S]*?)<!--\\/${section}-->`);
  const match = html.match(re);
  if (!match) {
    throw new Error(`Missing <!--${section}-->...<!--/${section}--> block`);
  }
  return match[1].trim();
}

function markActiveNav(headerHtml, pageKey) {
  // Adds aria-current="page" to the <a data-nav="pageKey"> link, and makes
  // sure no other link carries it (in case a partial gets hand-edited).
  return headerHtml.replace(
    /<a href="([^"]*)" data-nav="([^"]+)">/g,
    (full, href, key) => {
      const current = key === pageKey ? ' aria-current="page"' : "";
      return `<a href="${href}" data-nav="${key}"${current}>`;
    }
  );
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const pageFiles = fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".html") && !f.startsWith("_"));

  let builtCount = 0;
  const headingIssues = [];

  for (const file of pageFiles) {
    const raw = fs.readFileSync(path.join(PAGES_DIR, file), "utf8");
    const head = extract("HEAD", raw);
    const main = extract("MAIN", raw);

    const pageKey = file === "home.html" ? "home" : file.replace(".html", "");
    const header = markActiveNav(headerSrc, pageKey);

    let out = template
      .replace("{{HEAD}}", head)
      .replace("{{HEADER}}", header)
      .replace("{{MAIN}}", main)
      .replace("{{FOOTER}}", footerSrc);

    // Heading audit: exactly one <h1> per page.
    const h1Count = (out.match(/<h1[ >]/g) || []).length;
    if (h1Count !== 1) {
      headingIssues.push(`${file}: expected exactly one <h1>, found ${h1Count}`);
    }

    const outName = file === "home.html" ? "index.html" : file;
    fs.writeFileSync(path.join(DIST, outName), out);
    builtCount += 1;
  }

  copyDir(path.join(ROOT, "css"), path.join(DIST, "css"));
  copyDir(path.join(ROOT, "js"), path.join(DIST, "js"));

  for (const extra of ["robots.txt", "sitemap.xml"]) {
    const p = path.join(ROOT, extra);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(DIST, extra));
  }

  console.log(`Built ${builtCount} page(s) into /dist`);
  if (headingIssues.length) {
    console.warn("Heading audit warnings:");
    headingIssues.forEach((msg) => console.warn(`  - ${msg}`));
  }
}

build();
