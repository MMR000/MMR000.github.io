# Academic metrics

The site keeps Scopus, Web of Science, and OpenAlex in separate records in `data/metrics.json`. Counts from one database never fill gaps in another. The bibliography is a curated list of supplied Scopus and ORCID records; its size is not a live Scopus or Web of Science count.

## Initial status

OpenAlex is enabled. The initial official API lookup matched ORCID `0009-0002-8219-0751` to author `A5115648231`, Mamyr Altaibek, with ENU affiliation. A second API request confirmed author attribution for 19 DOIs also present in the supplied bibliography. The exact retrieval date, values, identity, and a compact DOI audit trail are stored in `data/metrics.json`.

The owner supplied a Scopus h-index of 4 and a Web of Science h-index of 2 on 20 October 2026 (local date). These are separate, dated manual snapshots, not API-verified values. Their citation and publication counts remain `null` and must not be presented as zero. No export-derived citation count or invented h-index is used. Scopus and Web of Science have no configured credentials; their API adapters are implemented and tested against synthetic fixtures following the official response schemas, but live credentialed calls remain unverified until the owner supplies authorized access.

## Owner-provided manual snapshots

For a value explicitly supplied by the owner, edit only its source in `data/metrics.json`. Set `status` to `manual`, put the supplied nonnegative integer in its metric field, leave unsupplied fields `null`, and leave `lastSuccess` as `null`. Add `manualSnapshot` with an accurate `asOf` date in `YYYY-MM-DD` form, `providedBy: "owner"`, and a `fields` array naming exactly the supplied fields, such as `["hIndex"]`. This provenance must be shown with the metric; it does not establish API verification or authorization to call a restricted API. Remove any obsolete API provenance when replacing a source with a manual snapshot.

A skipped API source leaves its manual snapshot unchanged. A failed authorized request retains the manual values and original `asOf` date, keeps `lastSuccess` null, and marks the source `stale`; its owner-provided provenance remains visible. A successful, identity-validated API response replaces all metric fields, records `lastSuccess`, marks the source `current`, and removes `manualSnapshot`. Only then may the site describe those values as automatically retrieved. Do not combine a manual h-index with unrelated or unverified citation/publication counts.

## Weekly refresh

`.github/workflows/refresh-metrics.yml` runs every Monday at 03:17 UTC and can also be run manually from GitHub Actions. GitHub may delay scheduled runs. The workflow:

1. Checks out `main` and installs the lockfile dependencies.
2. Queries only enabled sources, validates identity and every count, and preserves each failed source's previous successful values and date.
3. Runs tests, lint, and the production build before committing `data/metrics.json`.
4. Calls the reusable Pages deployment workflow with the exact new commit SHA. This explicit call is necessary because a commit made with `GITHUB_TOKEN` does not trigger a second push workflow.

No credentials are required to build or browse the website. API requests happen only in the update script. The static site receives only the validated snapshot.

If all attempted sources fail, the update job fails and the published site keeps its prior snapshot. Partial success publishes the validated sources and marks unsuccessful sources with existing data as `stale`. A failed attempt never advances `lastSuccess`. Workflow logs show sanitized outcome codes, not remote response bodies or secrets. A protected branch that disallows the workflow token from pushing requires the owner to permit this workflow or switch the update step to a pull-request process; no branch protection is bypassed.

## OpenAlex

OpenAlex metadata is released under CC0. Current official API documentation permits basic anonymous requests, so the owner's requested weekly public update works without a key. The updater uses two requests per run: an exact ORCID lookup and at most 100 author works for DOI confirmation. It requires at least two distinct known DOIs with an explicit authorship connection. A changed OpenAlex author ID, missing ORCID, conflicting ORCID, or insufficient DOI overlap leaves the previous snapshot intact for review.

Optional repository secret: `OPENALEX_API_KEY`. It is sent in an authorization header. To stop future OpenAlex requests, set repository variable `OPENALEX_METRICS_ENABLED` to `false`; unset or any other value enables the requested public update. Disabling refresh retains the dated snapshot. To remove public display as well, set its values and `lastSuccess` to `null` in `data/metrics.json` and redeploy.

Official references: [OpenAlex authentication and limits](https://help.openalex.org/api/authentication/), [author attributes](https://help.openalex.org/data/authors/), [common metric fields](https://help.openalex.org/data/common-attributes/), and [CC0 data release](https://help.openalex.org/data/how-its-built/).

## Scopus

Before enabling Scopus, confirm that the application's Elsevier API agreement and institutional entitlement cover both automated access from GitHub Actions and public display of the returned metrics. Possessing a key alone does not establish redistribution permission.

In GitHub repository settings, add:

- Secret `SCOPUS_API_KEY`.
- Optional secret `SCOPUS_INSTTOKEN`, if Elsevier has issued one for this application/institution and permits that use.
- Variable `SCOPUS_METRICS_ENABLED` = `true`.
- Variable `SCOPUS_PUBLIC_DISPLAY_ALLOWED` = `true`, after confirming the public display terms.

The adapter makes one request to the Author Retrieval API with `view=METRICS`, using author ID `59535935600`. It requires the response's `coredata.dc:identifier` to match exactly. It reads `h-index`, `coredata.citation-count`, and `coredata.document-count`. Elsevier's JSON sample uses `citation-count`, while its current view table calls this field `citations-count`; both documented spellings are supported, but conflicting values are rejected. The separate `cited-by-count` counts citing documents and is never substituted for citations. A 401/403 entitlement response, missing metrics, or redirected/reassigned identity fails safely. Requests are not routed through a logged-in browser and no profile scraping occurs.

Official references: [Author Retrieval API, authentication, views and entitlement errors](https://dev.elsevier.com/documentation/AuthorRetrievalAPI.wadl), [official JSON sample](https://dev.elsevier.com/payloads/retrieval/authorRetrievalResp.json), and [current author view table](https://dev.elsevier.com/sc_author_retrieval_views.html).

## Web of Science

Clarivate's Researcher API requires an additional paid license beyond a Web of Science subscription. Confirm that its license permits this website's public metric display. A subscription to the website or an API key for a different Clarivate product is insufficient.

Add:

- Secret `WOS_API_KEY` for the Researcher API.
- Variable `WOS_METRICS_ENABLED` = `true`.
- Variable `WOS_PUBLIC_DISPLAY_ALLOWED` = `true`, after confirming public display terms.

The adapter makes one request to `https://api.clarivate.com/apis/wos-researcher/researchers/NAX-9175-2025`. The returned `ids.rids` must contain that exact ResearcherID; any nonempty `ids.orcids` must include the supplied ORCID. It reads `metricsAllTime.hIndex`, `metricsAllTime.totalTimesCited`, and `metricsAllTime.documents.count`. It does not infer indexed records from ORCID or DOI availability. Use the site label “Times cited” for this source's citation figure. Its h-index and citation scope follow Clarivate's definitions, not OpenAlex's.

Official references: [Researcher API licensing and limits](https://developer.clarivate.com/apis/wos-researcher), [official OpenAPI schema](https://developer.clarivate.com/apis/wos-researcher/swagger), and [Web of Science profile metrics definitions](https://webofscience.help.clarivate.com/en-us/Content/researcher-profile-metrics.html).

## Maintenance and failure handling

Run `npm run metrics:update` to request a refresh. Secrets must be provided through environment variables or GitHub Secrets; never prefix them with `VITE_`, put them in JSON, or commit them. Logs and saved data contain no credential values. Redirects are rejected, requests have a 20-second timeout, and there are no automatic retries: at most four HTTP requests occur per run when all sources are enabled. Rate-limit failures wait until a later scheduled or manual run instead of repeatedly spending quota.

Run `node --test tests/metrics.test.mjs` to verify numeric validation, mismatched identities, DOI overlap, source separation, no-entitlement behavior, network errors, HTTP errors, malformed JSON, partial failures, credential isolation, manual snapshot retention, and replacement by a successful authorized API result. Test figures are synthetic and never copied into the production data.

If an author identifier changes legitimately, verify the replacement against the official source and supplied records before editing both the profile and metrics identity. If OpenAlex eventually contains more than 100 works and its first page no longer includes two known DOIs, the conservative overlap check will stop updates; review the adapter rather than weakening identity checks silently. Stop flags affect future requests; removing an existing public snapshot requires removing its values and redeploying.

API documentation and licensing pages were checked on 19 October 2026 UTC. Provider policies and schemas can change. Failed validation retains dated data rather than guessing a new field mapping.
