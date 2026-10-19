import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const BASE = "/mamyraltaibek.github.io/";
export const SITE = `https://mmr000.github.io${BASE}`;
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const normalizeDoi = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .toLowerCase();
export function validatePublications(publications) {
  const seen = new Set();
  for (const p of publications) {
    if (
      !p.title ||
      !p.authors ||
      !p.venue ||
      !Number.isInteger(p.year) ||
      p.year < 1900 ||
      p.year > new Date().getUTCFullYear() + 1
    )
      throw new Error("Incomplete or invalid publication");
    const key = p.doi
      ? normalizeDoi(p.doi)
      : p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) throw new Error(`Duplicate publication: ${p.title}`);
    seen.add(key);
    for (const url of [p.url, p.doi && `https://doi.org/${p.doi}`].filter(
      Boolean,
    )) {
      if (new URL(url).protocol !== "https:")
        throw new Error("Publication links must use HTTPS");
    }
  }
}
const arrow =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" stroke-width="1.5"/></svg>';
const e = escapeHtml;
const external = (href, label, cls = "") =>
  `<a class="${cls}" href="${e(href)}" target="_blank" rel="noopener noreferrer">${label}${arrow}<span class="sr-only"> (opens in a new tab)</span></a>`;
const dateLabel = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export function toBibtex(p, index) {
  const clean = (v) => String(v).replace(/[{}\\]/g, "");
  const type =
    p.type === "Book chapter"
      ? "incollection"
      : p.type === "Conference paper"
        ? "inproceedings"
        : p.type === "Editorial"
          ? "misc"
          : "article";
  const venueField = ["incollection", "inproceedings"].includes(type)
    ? "booktitle"
    : type === "misc"
      ? "howpublished"
      : "journal";
  const author = p.authors
    .split(";")
    .map((a) => {
      const name = a.trim();
      const match = name.match(/^(.+?)\s+((?:[A-Z]\.\s*)+)$/);
      return match ? `${match[1]}, ${match[2]}` : name;
    })
    .join(" and ");
  const fields = {
    title: `{${clean(p.title)}}`,
    author: clean(author),
    [venueField]: clean(p.venue),
    year: p.year,
    ...(p.doi ? { doi: p.doi } : {}),
    ...(p.url ? { url: p.url } : {}),
  };
  return `@${type}{Altaibek${p.year}_${index + 1},\n${Object.entries(fields)
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(",\n")}\n}`;
}
function publication(p, index) {
  const authors = p.authors
    .split(";")
    .map((a) =>
      /altaibek/i.test(a) ? `<strong>${e(a.trim())}</strong>` : e(a.trim()),
    )
    .join("; ");
  const sourceLabel =
    p.indexing.scopus === "export_confirmed" ? "Scopus export" : "ORCID";
  const sourceUrl =
    sourceLabel === "Scopus export" && p.scopus_eid
      ? `https://www.scopus.com/record/display.uri?eid=${encodeURIComponent(p.scopus_eid)}&origin=resultslist`
      : "https://orcid.org/0009-0002-8219-0751";
  return `<li class="publication" data-year="${p.year}" data-search="${e(`${p.title} ${p.authors} ${p.venue} ${p.year}`.toLowerCase())}">
    <div class="pub-year">${p.year}<span class="pub-number">${String(index + 1).padStart(2, "0")}</span></div>
    <article><h3>${p.url ? external(p.url, e(p.title), "pub-title") : e(p.title)}</h3><p class="authors">${authors}</p><p class="venue">${e(p.venue)}</p>
    <div class="pub-meta">${external(sourceUrl, sourceLabel, "source-badge")}${p.doi ? `<span class="doi">DOI: ${e(p.doi)}</span>` : '<span class="doi">Publisher record</span>'}</div>
    </article></li>`;
}
export function renderMetrics(data, asOf) {
  const sources = Object.values(data.sources);
  const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
  const available = sources.filter(
    (source) =>
      (source.lastSuccess || source.manualSnapshot?.asOf) &&
      Object.values(source.metrics).every(
        (value) => value === null || isCount(value),
      ) &&
      Object.values(source.metrics).some(isCount),
  );
  const sourceDescription = (source) => {
    if (source.manualSnapshot)
      return `The h-index was confirmed by Mamyr Altaibek on ${dateLabel(source.manualSnapshot.asOf)}. Citation and publication totals are not shown.`;
    if (source.lastSuccess)
      return `These figures are from ${e(source.label)} only. ${source.status === "stale" ? "These are the most recently available figures." : "Updated weekly from this source."}`;
    return source.label === "OpenAlex"
      ? "No verified metrics are currently published."
      : "Figures are shown only when a dated, confirmed value is available.";
  };
  return `${
    available.length
      ? `<aside class="metrics" aria-label="Source-specific research metrics">${available
          .map((source) => {
            const timestamp = source.manualSnapshot
              ? `As of ${dateLabel(source.manualSnapshot.asOf)}`
              : `${source.status === "stale" ? "As of" : "Updated"} ${dateLabel(source.lastSuccess)}`;
            return `<div class="metric-source"><div class="metric-title">${external(source.profileUrl, e(source.label))}<span>${timestamp}</span></div><dl>${Object.entries(
              source.metrics,
            )
              .filter(([, value]) => isCount(value))
              .map(
                ([key, value]) =>
                  `<div><dt>${key === "hIndex" ? "h-index" : key === "citations" ? (source.label === "Web of Science" ? "Times Cited" : "Citations") : source.label === "OpenAlex" ? "Works" : "Publications"}</dt><dd>${value.toLocaleString("en-US")}</dd></div>`,
              )
              .join("")}</dl></div>`;
          })
          .join("")}</aside>`
      : ""
  }
  <details class="source-notes"><summary>About the records and metrics <span aria-hidden="true">+</span></summary><div class="source-notes-body"><p>The bibliography combines ORCID records with a supplied Scopus export; records were reconciled on ${dateLabel(asOf)}. “Scopus export” identifies a record in that supplied file; it is not a live indexed-publication count. ORCID alone does not establish indexing in Scopus or Web of Science.</p><div class="source-columns">${sources.map((source) => `<div><h4>${e(source.label)}</h4><p>${sourceDescription(source)}</p></div>`).join("")}</div><p>Counts from different databases have different coverage and are never combined. Publication metadata and source-specific date differences are documented in the ${external("https://github.com/MMR000/mamyraltaibek.github.io/blob/main/docs/DATA_PROVENANCE.md", "data notes")}.</p></div></details>`;
}
export async function renderSite() {
  const readJson = async (path) =>
    JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
  const profile = await readJson("data/profile.json");
  const bibliography = await readJson("data/publications.json");
  const metrics = await readJson("data/metrics.json");
  validatePublications(bibliography.publications);
  const publications = [...bibliography.publications].sort(
    (a, b) => b.year - a.year || a.title.localeCompare(b.title, "en"),
  );
  const years = [...new Set(publications.map((p) => p.year))];
  const links = [
    ["ORCID", `https://orcid.org/${profile.orcid}`],
    [
      "Scopus",
      `https://www.scopus.com/authid/detail.uri?authorId=${profile.scopus_author_id}`,
    ],
    [
      "Web of Science",
      `https://www.webofscience.com/wos/author/rid/${profile.web_of_science_researcher_id}`,
    ],
    [
      "Google Scholar",
      `https://scholar.google.com/citations?user=${profile.google_scholar_id}`,
    ],
    ["GitHub", `https://github.com/${profile.github_username}`],
  ];
  let hasCv = false;
  if (
    profile.cv_file &&
    /^[\w/-]+\.pdf$/i.test(profile.cv_file) &&
    !profile.cv_file.includes("..")
  ) {
    try {
      await access(new URL(`../public/${profile.cv_file}`, import.meta.url));
      hasCv = true;
    } catch {
      /* A missing CV never creates a broken link. */
    }
  }
  const description =
    "Mamyr Altaibek, PhD researcher at L.N. Gumilyov Eurasian National University. Research in embodied AI, autonomous robot skill learning and multimodal learning.";
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: SITE,
    name: "Mamyr Altaibek — Academic Website",
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      url: SITE,
      image: `${SITE}${profile.portrait_file}`,
      jobTitle: profile.professional_title,
      worksFor: { "@type": "CollegeOrUniversity", name: profile.institution },
      email: profile.email,
      sameAs: links.map((l) => l[1]),
      knowsAbout: profile.research_interests,
    },
  };
  const html = `<!doctype html>
<html lang="en" data-theme="light"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#f8f7f3"><title>Mamyr Altaibek — AI & Robotics Research</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${SITE}"><link rel="icon" type="image/svg+xml" href="${BASE}favicon.svg"><meta property="og:type" content="profile"><meta property="og:locale" content="en_US"><meta property="og:title" content="Mamyr Altaibek — AI & Robotics Research"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${SITE}"><meta property="og:image" content="${SITE}${profile.portrait_file}"><meta property="og:image:alt" content="Portrait of Mamyr Altaibek"><meta name="twitter:card" content="summary"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
<script>try{const t=localStorage.getItem('theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch{}</script><script type="module" src="/src/main.ts"></script></head>
<body><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner"><a class="wordmark" href="#home" aria-label="Mamyr Altaibek, home">M<span class="wordmark-dot">.</span>A<span class="wordmark-dot">.</span></a><nav aria-label="Main navigation"><a href="#about">About</a><a href="#research">Research</a><a href="#publications">Publications</a><a href="mailto:${e(profile.email)}">Contact</a>${hasCv ? `<a href="${BASE}${e(profile.cv_file)}">CV</a>` : ""}</nav><button class="theme-toggle" type="button" aria-label="Switch to dark mode" hidden><svg class="moon-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z" stroke="currentColor" stroke-width="1.5"/></svg><svg class="sun-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" stroke="currentColor" stroke-width="1.5"/></svg></button></div></header>
<main id="main"><section class="hero content-width" id="home" aria-labelledby="name"><div class="hero-intro"><p class="eyebrow">Researcher in artificial intelligence</p><h1 id="name">Mamyr Altaibek<span class="name-period">.</span></h1><p class="hero-position">${e(profile.professional_title)}</p><p class="hero-affiliation">L.N. Gumilyov Eurasian National University<br>Astana, Kazakhstan</p><a class="text-link" href="#publications">Explore my publications <span aria-hidden="true">↓</span></a></div><div class="hero-profile" id="contact"><figure class="portrait"><img src="${BASE}${e(profile.portrait_file)}" width="160" height="214" alt="Formal portrait of Mamyr Altaibek" fetchpriority="high"><figcaption>ENU · Kazakhstan</figcaption></figure><a class="email-link" href="mailto:${e(profile.email)}">${e(profile.email).replace("@", "@<wbr>")}</a></div><div class="profile-links" aria-label="Academic profiles">${links.map(([label, href]) => external(href, e(label))).join("")}</div></section>
<section class="section content-width about-section" id="about" aria-labelledby="about-heading"><div class="section-label"><span class="section-number">01 /</span><h2 id="about-heading">About</h2></div><div class="section-body"><p class="lead">I study how intelligent systems learn from multimodal information and adapt to new tasks.</p><div class="about-columns"><p>I am a PhD researcher in Information Technology at <strong>L.N. Gumilyov Eurasian National University (ENU)</strong> and Head of the <strong>ENU Luban Workshop Laboratory</strong>. My current research focuses on autonomous robot skill learning, multimodal demonstrations, and the adaptation of robotic skills across tasks and simulated environments.</p><p>My earlier work spans speech processing, multimodal AI, educational technologies, and information security. These interests inform my current doctoral research in embodied AI.</p></div></div></section>
<section class="section content-width" id="research" aria-labelledby="research-heading"><div class="section-label"><span class="section-number">02 /</span><h2 id="research-heading">Research</h2></div><div class="section-body"><div class="section-intro"><p class="eyebrow">Current research directions</p><p class="section-description">Learning, transferring and adapting robotic skills.</p></div><div class="research-grid"><article><span class="research-index">I</span><h3>Embodied<br> intelligence</h3><p>Autonomous robot skill learning through interaction with tasks and simulated environments.</p></article><article><span class="research-index">II</span><h3>Multimodal<br> learning</h3><p>Learning from demonstrations that bring together complementary sources of information.</p></article><article><span class="research-index">III</span><h3>Skill transfer<br> &amp; adaptation</h3><p>Investigating how learned robotic skills can be reused and adapted across tasks.</p></article></div><p class="research-footnote">These are ongoing PhD research directions. Published work is listed below.</p></div></section>
<section class="section content-width publications-section" id="publications" aria-labelledby="publications-heading"><div class="section-label"><span class="section-number">03 /</span><h2 id="publications-heading">Publications</h2><a class="download-link" href="${BASE}publications.bib" download>Download BibTeX <span aria-hidden="true">↓</span></a></div><div class="section-body"><div class="publications-intro"><div><p class="eyebrow" id="publication-view-label">Complete bibliography</p><p class="section-description">Speech, language and intelligent systems.</p></div><span class="record-count">${publications.length} works</span></div><p class="publication-note">Peer-reviewed articles, conference contributions and other listed works, ${Math.min(...years)}–${Math.max(...years)}. Records reconciled ${dateLabel(bibliography.as_of)}.</p><div class="publication-controls" hidden><label class="search-field"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="1.5"/></svg><span class="sr-only">Search publications</span><input type="search" id="publication-search" placeholder="Search title, author or topic…" autocomplete="off"></label><label class="year-field"><span class="sr-only">Publication year</span><select id="publication-year"><option value="all">All years</option>${years.map((y) => `<option value="${y}">${y}</option>`).join("")}</select></label></div><p id="results-status" class="results-status" role="status" aria-live="polite" hidden></p><ol class="publication-list" id="publication-list">${publications.map(publication).join("")}</ol><div class="empty-state" hidden><p>No publications match your search.</p><button type="button" class="text-link" id="clear-filters">Clear filters</button></div>${renderMetrics(metrics, bibliography.as_of)}</div></section>
</main>
<footer class="site-footer content-width"><p>© ${new Date().getUTCFullYear()} Mamyr Altaibek</p><span>Research · Publications</span><a href="#home">Back to top ↑</a></footer></body></html>`;
  const root = new URL("../", import.meta.url);
  await mkdir(new URL("public", root), { recursive: true });
  await writeFile(new URL("index.html", root), html);
  await writeFile(
    new URL("public/publications.bib", root),
    publications.map(toBibtex).join("\n\n") + "\n",
  );
  await writeFile(
    new URL("public/publications.json", root),
    JSON.stringify(bibliography, null, 2) + "\n",
  );
  await writeFile(
    new URL("public/sitemap.xml", root),
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}</loc></url></urlset>`,
  );
  console.log(`Rendered ${publications.length} publications at ${BASE}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  await renderSite();
