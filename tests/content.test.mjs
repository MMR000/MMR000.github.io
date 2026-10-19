import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  escapeHtml,
  normalizeDoi,
  validatePublications,
  toBibtex,
  renderSite,
  renderMetrics,
  BASE,
  SITE,
} from "../scripts/render-site.mjs";

const data = JSON.parse(
  await readFile(new URL("../data/publications.json", import.meta.url), "utf8"),
);
test("bibliography preserves the verified ORCID / Scopus reconciliation", () => {
  assert.equal(data.publications.length, 20);
  assert.equal(
    data.publications.filter((p) => p.indexing.scopus === "export_confirmed")
      .length,
    16,
  );
  assert.equal(
    new Set(
      data.publications.filter((p) => p.doi).map((p) => normalizeDoi(p.doi)),
    ).size,
    19,
  );
  assert.ok(
    data.publications.every((p) => p.indexing.web_of_science !== "confirmed"),
  );
  assert.doesNotThrow(() => validatePublications(data.publications));
  assert.equal(
    data.publications.find((p) => p.doi === "10.1007/978-3-032-11512-6_14")
      .year,
    2025,
  );
});
test("publication validation rejects duplicate DOI variants and unsafe URLs", () => {
  const p = data.publications[0];
  assert.throws(
    () =>
      validatePublications([
        p,
        { ...p, doi: `https://doi.org/${p.doi.toUpperCase()}` },
      ]),
    /Duplicate/,
  );
  assert.throws(
    () => validatePublications([{ ...p, url: "javascript:alert(1)" }]),
    /HTTPS/,
  );
  assert.throws(
    () => validatePublications([{ ...p, year: "2025" }]),
    /invalid/,
  );
});
test("HTML escapes imported text and BibTeX keeps available identifiers only", () => {
  assert.equal(escapeHtml('<script>"&'), "&lt;script&gt;&quot;&amp;");
  const bib = toBibtex(data.publications[0], 0);
  assert.ok(bib.includes("author = {Altaibek, M."));
  const withoutDoi = data.publications.find((p) => !p.doi);
  assert.ok(!toBibtex(withoutDoi, 0).includes("doi ="));
});
test("generated HTML and sitemap use the root Pages URL and preserve academic content", async () => {
  await renderSite();
  assert.equal(BASE, "/");
  assert.equal(SITE, "https://mmr000.github.io/");
  const profile = JSON.parse(
    await readFile(new URL("../data/profile.json", import.meta.url), "utf8"),
  );
  assert.equal(profile.github_username, "MMR000");
  assert.equal(profile.github_repo, "MMR000/MMR000.github.io");
  assert.equal(profile.current_url_if_published, SITE);
  const html = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8",
  );
  assert.equal((html.match(/class="publication"/g) || []).length, 20);
  assert.ok(html.includes('lang="en"'));
  assert.ok(html.includes(`rel="canonical" href="${SITE}"`));
  assert.ok(html.includes(`property="og:url" content="${SITE}"`));
  assert.ok(
    html.includes(`property="og:image" content="${SITE}images/mamyr-altaibek.jpg"`),
  );
  assert.ok(html.includes(`src="${BASE}images/mamyr-altaibek.jpg"`));
  assert.ok(html.includes('href="/publications.bib"'));
  assert.ok(html.includes('href="/favicon.svg"'));
  assert.ok(
    html.includes("https://github.com/MMR000/MMR000.github.io/blob/main/docs/DATA_PROVENANCE.md"),
  );
  assert.ok(html.includes("mailto:mameralt@outlook.com"));
  assert.ok(
    html.includes("https://www.webofscience.com/wos/author/rid/NAX-9175-2025"),
  );
  assert.ok(!html.includes(">CV</a>"));
  assert.ok(!html.includes(">Projects</a>"));
  assert.ok(!html.includes("20 Scopus"));
  const jsonLd = JSON.parse(
    html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
  );
  assert.equal(jsonLd.mainEntity.name, "Mamyr Altaibek");
  assert.equal(jsonLd.url, SITE);
  assert.equal(jsonLd.mainEntity.url, SITE);
  assert.equal(jsonLd.mainEntity.image, `${SITE}images/mamyr-altaibek.jpg`);
  assert.ok(jsonLd.mainEntity.sameAs.includes("https://github.com/MMR000"));
  const sitemap = await readFile(
    new URL("../public/sitemap.xml", import.meta.url),
    "utf8",
  );
  assert.ok(sitemap.includes(`<loc>${SITE}</loc>`));
  const bib = await readFile(
    new URL("../public/publications.bib", import.meta.url),
    "utf8",
  );
  assert.equal((bib.match(/^@/gm) || []).length, 20);
});

test("manual metrics show only provided figures with their own date and source", () => {
  const html = renderMetrics(
    {
      sources: {
        scopus: {
          label: "Scopus",
          profileUrl:
            "https://www.scopus.com/authid/detail.uri?authorId=59535935600",
          metrics: { hIndex: 4, citations: null, publications: null },
          status: "manual",
          lastSuccess: null,
          manualSnapshot: {
            asOf: "2026-10-20",
            providedBy: "owner",
            fields: ["hIndex"],
          },
        },
      },
    },
    "2026-10-19",
  );
  assert.ok(html.includes("As of 20 Oct 2026"));
  assert.ok(html.includes("<dd>4</dd>"));
  assert.ok(!html.includes("<dt>Citations</dt>"));
  assert.ok(!html.includes("<dd>0</dd>"));
  assert.ok(html.includes("confirmed by Mamyr Altaibek"));
  assert.ok(!/manual snapshot|API/i.test(html));
});
