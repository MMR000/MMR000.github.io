# Publication data provenance

Reconciled on **19 October 2026 (UTC)**, which is 20 October in Astana/Almaty. The editable site bibliography is `data/publications.json`.

## Inputs and reconciliation

- The supplied `SITE_BRIEF.md`, `profile.json`, and `publications.json` establish the requested identity, wording, and bibliography scope. Biography and current research directions are owner-supplied facts, not claims inferred from publication titles.
- The supplied `mamyr altaibek.csv` contains **16 rows**, all explicitly including Scopus author ID **59535935600** in the author-ID column. All 16 titles, years, authors, venues, document types, and EIDs agree with the supplied JSON after normalization of nonbreaking spaces. These records carry `indexing.scopus: export_confirmed`.
- The other available file, `scopus.csv`, contains five rows, only one with that author ID. Its matching record, “Multimodal AI in education…”, is already present in the 16-row export and adds no work. Unrelated authors' records were excluded.
- The live [ORCID public API bibliography](https://pub.orcid.org/v3.0/0009-0002-8219-0751/works) returned **20 grouped works and 33 individual source records**. Every supplied work matched a group. Nineteen works have a DOI; the remaining work matches by normalized title and now has a publisher link.
- DOI matching is case-insensitive, strips resolver prefixes, and uses the DOI as the primary deduplication key. For the work without a DOI, normalized title matching removes case, whitespace, and punctuation differences. Multiple ORCID source assertions within one group are not counted as separate papers.
- Each work preserves ORCID put codes, source organizations, source dates, and record-specific API links in `provenance.orcid.records`. The four works outside the Scopus export retain `scopus: not_verified`; being listed on ORCID does not establish indexing.

The export itself does not include its download date. `as_of`/`checked_at` describes this reconciliation, **not an asserted Scopus export date**. The export's 16 rows must not be shown as the current total on Scopus. The raw CSV files and API response files are intentionally excluded from the public repository; provenance contains the necessary bibliographic identifiers without copying unrelated or private data.

## Publisher corrections and source disagreements

### Distributed Multimodal Video Generation and Interaction Framework Based on Message-Driven Middleware

The [Springer publisher page](https://link.springer.com/chapter/10.1007/978-3-032-11512-6_14) states **First Online / Published: 25 November 2025** and recommends a **2025** citation. The site therefore displays **2025**. The Scopus export's **2026** remains in `source_years.scopus`; ORCID's 2025 remains in `source_years.orcid`. This is a publisher-supported display correction, with the database difference retained for the owner's review.

Springer and Scopus label it a conference paper; ORCID labels it a book chapter. The source-specific types remain separate in `source_types`.

### Effective Search Engine Optimization in CMS Using Morphological Analysis

The Scopus CSV's document type is **Editorial**. The [ORCID record](https://pub.orcid.org/v3.0/0009-0002-8219-0751/work/186525517) calls it **conference-paper**. The CSV value remains in the original `type` and `source_types.scopus` fields. A UI should omit a single universal document-type badge or explicitly identify the classification's source.

### Research on Automatic Detection of Network Security Threats Using Deep Learning Technology

The previously missing link is the [IJACEN publisher page](https://ijacen.iraj.in/paperdetails/21597), which lists a publication date of **22 May 2025**, volume 13, issue 1. No DOI is listed there or in the public ORCID record, so `doi` remains `null`.

The publisher lists **Tolegen Aidynov first and Mamyr Altaibek second**. The [owner-entered ORCID record](https://pub.orcid.org/v3.0/0009-0002-8219-0751/work/184677643) reverses those first two names. The displayed author order follows the publisher, while the ORCID form is retained in provenance for owner review. The publisher concatenates “Aliyaissainova”; the display uses the supplied bibliography's name spacing, “Aliya Issainova”, and stores the publisher's literal spelling in provenance. No page range was added because the journal and related proceedings metadata differ.

### Kazakh Abstractive Summarization

The [Springer publisher page](https://link.springer.com/chapter/10.1007/978-981-96-5881-7_18) confirms **17 April 2025**, pages **235–246**, and the actual venue: *Recent Challenges in Intelligent Information and Database Systems (ACIIDS 2025)*, *Communications in Computer and Information Science*, volume **2493**. This replaces the generic supplied venue “Book chapter (Springer)”. ORCID's book-chapter classification and Springer's conference-paper classification are both retained. Scopus and Web of Science indexing are not inferred from Springer publication.

## Profile links and indexing limits

- [ORCID](https://orcid.org/0009-0002-8219-0751): public API identity and works verified. Its [external identifiers](https://pub.orcid.org/v3.0/0009-0002-8219-0751/person) explicitly link Scopus author ID 59535935600.
- [Scopus](https://www.scopus.com/authid/detail.uri?authorId=59535935600): uses the supplied ID, corroborated by ORCID and the original CSV. Current metrics were not independently retrieved.
- [Web of Science](https://www.webofscience.com/wos/author/rid/NAX-9175-2025): uses the owner-supplied ResearcherID. The official [ResearcherID resolver](https://www.researcherid.com/rid/NAX-9175-2025) redirects to this `/wos/author/rid/` route. The endpoint returned HTTP 200, but only a JavaScript application shell was available during verification; profile identity and metrics could not be independently read. Do not describe this as a verified live metric source.
- [Google Scholar](https://scholar.google.com/citations?user=NBU7ZlEAAAAJ) and [GitHub](https://github.com/MMR000): use the exact profile identifiers supplied by the owner. No Google Scholar scraping or citation-count aggregation was performed.

Five ORCID source records contain explicit Web of Science identifiers imported through the Web of Science ORCID integration. These identifiers are preserved under `provenance.orcid.imported_web_of_science_identifiers`. They are **not a live Web of Science API result, a complete Web of Science publication count, or independent verification of current indexing**, so the public site should not turn them into “WoS indexed” badges. The supplied `indexing.web_of_science: not_checked` values are retained to avoid unsupported claims.

The bibliography is complete against the supplied materials and the public ORCID snapshot retrieved during this reconciliation. It is not a claim that all future or unlisted works have been found.

## Metrics boundaries

No h-index, citation total, or current indexed-publication total is calculated from the publication export. Citation totals in an incomplete export are not equivalent to an author profile's citation totals. Scopus, Web of Science, and OpenAlex are distinct datasets; values from one must never be relabeled as another. Metric availability and credentials are documented separately in the repository's setup documentation.
