# Mamyr Altaibek — academic website

An English-language academic homepage for Mamyr Altaibek, PhD Researcher in Information Technology at L.N. Gumilyov Eurasian National University and Head of the ENU Luban Workshop Laboratory.

**GitHub Pages address:** <https://mmr000.github.io/mamyraltaibek.github.io/>

This repository is a **project site**, because its name differs from `MMR000.github.io`. Keep the trailing `/mamyraltaibek.github.io/` path in links and deployment configuration. The address above is the deployment target; a successful workflow and live-page check establish whether a particular revision is published.

## Develop and check

Use Node.js 22 (22.12 or later) and npm. Install the versions recorded in `package-lock.json`:

```sh
npm ci
npm run dev
```

The development server prints its local URL. Open the `/mamyraltaibek.github.io/` path. Before publishing:

```sh
npm run lint
npm test
npm run build
npm run preview
```

Browser checks use Playwright:

```sh
npx playwright install chromium
npm run test:browser
```

Inspect the page at 390, 768, 1280 and 1440 pixels, in both color modes, with keyboard navigation and with JavaScript disabled. Check publication links, filtering, readable contrast, small-screen navigation and the repository path. These are maintenance instructions, not a claim that every future revision has passed these checks.

## How the site works

The site is static Vite and TypeScript, with no application backend. `scripts/render-site.mjs` reads structured data and generates `index.html` during development and production builds. The HTML contains the biography and complete publication list for search engines and visitors without JavaScript. Edit source data or the renderer rather than generated `index.html`. `src/main.ts` progressively enhances the page with publication filtering and a color-mode control. `vite.config.ts` sets the project-site base path.

- `data/profile.json`: verified identity, affiliation, research interests, profile IDs, email, portrait and optional CV path.
- `data/publications.json`: editable bibliography, DOI links and source-specific metadata.
- `data/metrics.json`: separately identified Scopus, Web of Science and OpenAlex snapshots with timestamps and refresh status.
- `public/`: publicly served assets, including the supplied portrait.
- `docs/SITE_BRIEF.md`: the supplied design and factual requirements.
- [Bibliography provenance](docs/DATA_PROVENANCE.md): ORCID and Scopus reconciliation, publisher verification and source conflicts.
- [Metrics configuration and provenance](docs/METRICS.md): authorized refresh settings, secrets, identity checks and failure behavior.

## Maintain the content

### Biography, email and research

Update `data/profile.json` and, when changing prose, the relevant copy in `scripts/render-site.mjs`. The contact email supplied by the owner is `mameralt@outlook.com`. Keep current robotics research directions distinct from completed or published work. Do not add degree dates, awards, results or other personal details without verified information.

The five academic and developer profile links come from the ORCID, Scopus, Web of Science ResearcherID, Google Scholar and GitHub identifiers. If an identifier changes, update the structured data and verify the destination manually.

### Portrait

The supplied original photo is copied to `public/images/mamyr-altaibek.jpg`. Replace this file with an authorized formal portrait to retain its current URL, or set `portrait_file` in `data/profile.json` to another path relative to `public/`. Keep one small headshot and meaningful alternative text. Do not introduce stock or generated portraits.

### Publications

Edit `data/publications.json`, then rebuild. Deduplicate by normalized DOI first and carefully compare title, authors and year when no DOI exists. Preserve the author list, venue, publisher link and the origin of each record. New items must be supported by public or owner-provided records.

The bibliography contains 20 unique ORCID-listed works; 16 match the supplied Scopus export. Reconciliation against the public ORCID record and publisher dates is documented in [Bibliography provenance](docs/DATA_PROVENANCE.md). These are bibliography provenance counts, not a live Scopus publication metric. ORCID inclusion and a DOI do not establish Web of Science indexing. Preserve source-specific document classifications and publication-year discrepancies rather than silently overwriting them. Publication citation counts are also source-specific and must not be presented as current unless refreshed and dated.

### CV and projects

No CV file was supplied. Add a real, public-ready PDF under `public/`, set `cv_file` to its relative path in `data/profile.json`, and rebuild; the renderer should expose the link only when the actual file exists. Verify the PDF link under the repository-specific URL. Avoid publishing sensitive personal information in the PDF.

Add a Projects section only for confirmed public work with an accurate description and working source or project link. Research directions alone are not evidence of completed projects.

## Metrics

Metric values are maintained independently in `data/metrics.json`. Unknown values stay `null`; unavailable metrics must not become zeroes. The historical Scopus export is not a live count, and OpenAlex values must keep their own label. The site builds without API credentials.

See [docs/METRICS.md](docs/METRICS.md) before enabling an integration or changing a manual snapshot. It documents weekly refreshes, explicit provider authorization, credentials, identity matching and timestamps. Keep API keys in GitHub Actions secrets, never in JSON, source files, build output or frontend environment variables. A failed provider request retains its last successful data.

## Publish with GitHub Pages

1. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build and deployment source.
2. Allow the `github-pages` environment to deploy from `main`. Apply any desired owner approval rule there.
3. Push the checked implementation to `main`. The **Build and deploy academic website** workflow installs locked dependencies, checks code and types, runs tests, builds `dist/`, uploads the Pages artifact and deploys it.
4. Open the deployment URL from the Actions run, then verify the homepage, portrait, assets and links at <https://mmr000.github.io/mamyraltaibek.github.io/>.

Pull requests run the same build checks without publishing. Manual runs accept a `ref` input, defaulting to `main`. The workflow also supports `workflow_call` so a successful metrics update can build its newly committed SHA directly: a commit made with `GITHUB_TOKEN` does not ordinarily trigger another push workflow. The caller must grant `contents: read`, `pages: write` and `id-token: write`; it does not need to pass provider secrets to the deployment workflow.

Publishing is restricted to this repository, an event on `main` and a checked-out commit reachable from `main`. Jobs request separate permissions: builds can read repository contents, while deployment alone can publish Pages and request an identity token. Checkout credentials are not persisted, and the deployment workflow does not write repository contents. A shared concurrency group serializes main builds and deployments. Official GitHub actions are pinned to verified release commit hashes; update these deliberately when maintaining the workflow.

If deployment fails, read the failed job before retrying. Confirm Pages uses GitHub Actions, environment branch rules permit `main`, Actions are enabled, and the repository remains eligible for Pages hosting. Do not change the Vite base to `/` to resolve a deployment error: this repository requires its project path. GitHub's [custom Pages workflows documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) explains the artifact and deployment requirements.
