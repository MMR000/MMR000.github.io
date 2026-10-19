# Implementation brief — Academic homepage for Mamyr Altaibek

## Mission
Build and deploy a genuinely polished **English-only, academic personal website** in `MMR000/MMR000.github.io`. This is not a fashion portfolio, a generic corporate template, or a humorous website. No B99 jokes or casual slogans. Elegant, credible, readable, contemporary, restrained.

## Existing repository and URL (IMPORTANT)
Owner is **MMR000**, repository is **MMR000.github.io**, and the default branch is `main`. The owner renamed the existing repository and requested migration to the **user Pages site** at `https://mmr000.github.io/`, preserving the established GitHub identity. With Vite set `base: '/'`; ensure all resources and generated URLs work at the domain root. Preserve the existing academic content, publications, portrait, design, and metrics integration during this migration.

## Identity and tone
Use `profile.json` as source of truth. Full name: Mamyr Altaibek. Position: PhD Researcher in Information Technology, L.N. Gumilyov Eurasian National University (ENU), Kazakhstan; Head of ENU Luban Workshop Laboratory. Focus: autonomous robotic skill learning, multimodal demonstrations, transfer/adaptation in simulation (current PhD research directions, not proven completed results). Previous research includes speech emotion recognition, NLP and multimodal AI, learning technologies, and information security.

Suggested biography (edit for polish, never overclaim):
> I am a PhD researcher in Information Technology at L.N. Gumilyov Eurasian National University (ENU), Kazakhstan, and Head of the ENU Luban Workshop Laboratory. My current research focuses on autonomous robot skill learning, multimodal demonstrations, and the adaptation of robotic skills across tasks and simulated environments. My earlier work includes speech processing, multimodal AI, educational technologies, and information security.

No false university degree dates, no fake awards, no prospective publications presented as published, no fake research results. If master's degree is mentioned, do not guess its completion date. Do not infer a Web of Science indexed paper merely because the DOI or ORCID is known.

## Photo and visuals
One **small formal headshot** only; it will be provided separately. Do not replace it with a stock photo, AI portrait, emoji, giant hero photography or avatars. Reserve a tasteful 140–180px wide image (100–130px on mobile) next to an introduction. If photo missing, use a simple typographic fallback or empty slot marked for the owner; never deploy a fake face. Modern Swiss/editorial academic aesthetics: excellent type, quiet color palette, consistent grid, generous but not excessive whitespace, light and optionally dark mode, accessible buttons, mobile friendly. Choose a refined serif for headings plus a clear sans serif for content, or one high-quality type family. Keep first viewport informative, concise and image-light. Use no decorative gadgets, meaningless animations, or empty cards.

## Sections (all English)
Home | About | Research | Publications | Projects (only confirmed public cases) | CV (only when actual file exists) | Contact (only verified details).

Prefer a polished single-page academic site to empty pages. Separate **current research directions** from **published work**. Research highlights: embodied AI, skill reuse and transfer, multimodal learning. Publications topics: speech emotion recognition, speaker verification, IoT/network security, multilingual systems, educational avatars and NLP. Avoid claiming all papers are about robotics.

## Bibliography and indices
`publications.json` contains **20 unique ORCID-listed works**, 16 of which match the provided Scopus CSV by author ID 59535935600; four are additional public ORCID works. Do not advertise 20 Scopus-indexed papers. Display papers organized newest first; each should have title, authors, venue, year, DOI/publisher link, and source-aware indexing label if shown. Citation entries should be editable; create a compact featured-publications selection with a full expandable/list view. Note: CSV records one 2024 item as Scopus document type `Editorial`, even though ORCID calls it a conference paper; preserve source-specific classifications or omit type display. One Springer book chapter has differing publication years (Scopus 2026 vs ORCID 2025), flag for owner review; prefer publisher publication date after checking.

Source profile links:
- ORCID: https://orcid.org/0009-0002-8219-0751
- Scopus ID: 59535935600; public author profile: https://www.scopus.com/authid/detail.uri?authorId=59535935600
- Web of Science ResearcherID: NAX-9175-2025 (verify profile link before hardcoding)
- Google Scholar ID: NBU7ZlEAAAAJ; https://scholar.google.com/citations?user=NBU7ZlEAAAAJ
- GitHub: https://github.com/MMR000

## Metrics and weekly refresh
Implement optional small **source-labelled** metrics (Scopus h-index, citations, indexed outputs; WoS h-index, Times Cited, publications; OpenAlex metrics optional). **Never** fabricate values or substitute OpenAlex numbers under other labels. APIs require permissions: Clarivate Web of Science Researcher API requires an additional paid license. Scopus Elsevier access can have institutional entitlement restrictions. Do not attempt to scrape logged-in pages. If no authorized API key, show verified date-stamped manual snapshot or omit metric; the 16-paper export is not a live Scopus count. OpenAlex API can be used with its own label only, after identity matching. Weekly GitHub Actions may update authorized metrics, with keys in Secrets, validate responses, fail safely, retain last successful values, record update timestamps, and obey request caps and redistribution terms. Site must still build and work without any API keys. Never commit API secrets.

## Implementation
Prefer static Vite + React + TypeScript + Tailwind CSS (or a genuinely simpler static stack if quality improves). Elegant design; no backend or paid API dependence. SEO, Open Graph, accessible labels, semantic HTML, strong color contrast, keyboard use, responsive 390px/768px/1280px/1440px, performance, good typography. No fake buttons or broken CV link. Maintain profile/publications in structured files. GitHub Actions deployment to root user Pages URL. Avoid broken image link when photo is missing. A small contact section should link only to verified public profiles until email is supplied.

## Review and handoff
Install/run/build/lint/test. Use browser screenshot review at mobile and desktop if available. Critique visual balance, font consistency, biography factual accuracy, bibliography dedup and source provenance, SEO, keyboard accessibility, root-base paths, and API secret-handling. Fix issues found. Commit and push when authorized. Verify published URL before claiming successful deployment. Provide desktop/mobile screenshots if supported, list which metrics are genuinely live versus manual, and document exactly how owner can add the headshot, CV, email, new publications and credentials. Do not stall for missing photo: build a complete polished version with a graceful text-only fallback.

## What to explicitly exclude
No comedy or sitcom references; no Instagram jokes or emojis; no family/personal relationship information; no health, financial or vehicle details; no travel itineraries; no specific scholarship/funding amounts; no passwords, servers, IPs, internal data, unpublished numerical results, or proprietary code; no citation ranking claims unless officially verified; no internship/award claims inferred from papers.
