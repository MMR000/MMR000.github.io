// Source-specific adapters. Never substitute one index's counts for another.
export class MetricsError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const fail = (code) => {
  throw new MetricsError(code);
};
const integer = (value, allowString = false) => {
  const parsed =
    allowString && typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
      ? Number(value)
      : value;
  if (!Number.isSafeInteger(parsed) || parsed < 0) fail("invalid_metrics");
  return parsed;
};
const metrics = (h, c, p, allowString = false) => ({
  hIndex: integer(h, allowString),
  citations: integer(c, allowString),
  publications: integer(p, allowString),
});
export const normalizeDoi = (value) =>
  typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")
        .replace(/^doi:\s*/, "")
    : "";
const normalizeOrcid = (value) =>
  typeof value === "string"
    ? value.replace(/^https?:\/\/orcid\.org\//, "").replace(/\/$/, "")
    : "";

export function parseScopus(payload, authorId) {
  const response = payload?.["author-retrieval-response"];
  // Elsevier's single-author JSON sample is an object; some responses wrap it in
  // a one-element array. Never choose an arbitrary entry from a multi-hit result.
  if (Array.isArray(response) && response.length !== 1)
    fail("invalid_response");
  const row = Array.isArray(response) ? response[0] : response;
  if (!row || typeof row !== "object" || Array.isArray(row))
    fail("invalid_response");
  if (row?.coredata?.["dc:identifier"] !== `AUTHOR_ID:${authorId}`)
    fail("identity_mismatch");
  // The official JSON sample uses citation-count; the current official views
  // table spells this citations-count. Accept these documented forms only and
  // reject conflicting values rather than ever using cited-by-count.
  const citationFields = ["citation-count", "citations-count"].filter((field) =>
    Object.hasOwn(row.coredata, field),
  );
  if (!citationFields.length) fail("invalid_metrics");
  const citations = citationFields.map((field) =>
    integer(row.coredata[field], true),
  );
  if (citations.some((value) => value !== citations[0]))
    fail("conflicting_metrics");
  return {
    metrics: metrics(
      row["h-index"],
      citations[0],
      row.coredata["document-count"],
      true,
    ),
  };
}

export function parseWebOfScience(payload, researcherId, orcid) {
  if (
    !Array.isArray(payload?.ids?.rids) ||
    !payload.ids.rids.includes(researcherId)
  )
    fail("identity_mismatch");
  const listedOrcids = payload.ids.orcids;
  if (
    Array.isArray(listedOrcids) &&
    listedOrcids.length &&
    !listedOrcids.some((id) => normalizeOrcid(id) === orcid)
  )
    fail("identity_mismatch");
  const row = payload.metricsAllTime;
  return {
    metrics: metrics(row?.hIndex, row?.totalTimesCited, row?.documents?.count),
  };
}

export function parseOpenAlex(payload, orcid, previousAuthorId = null) {
  const ids = [payload?.orcid, payload?.ids?.orcid].filter((id) => id != null);
  if (!ids.length || !ids.every((id) => normalizeOrcid(id) === orcid))
    fail("identity_mismatch");
  if (
    typeof payload.id !== "string" ||
    !/^https:\/\/openalex\.org\/A\d+$/.test(payload.id)
  )
    fail("identity_mismatch");
  const authorId = payload.id.split("/").at(-1);
  // A merged/reassigned OpenAlex ID needs owner review instead of silently switching.
  if (previousAuthorId && authorId !== previousAuthorId)
    fail("identity_changed");
  return {
    metrics: metrics(
      payload.summary_stats?.h_index,
      payload.cited_by_count,
      payload.works_count,
    ),
    identity: { orcid, authorId },
    profileUrl: payload.id,
  };
}

export function verifyOpenAlexWorks(payload, authorId, knownDois) {
  if (!Array.isArray(payload?.results)) fail("invalid_response");
  const known = new Set(knownDois.map(normalizeDoi).filter(Boolean));
  if (known.size < 2) fail("insufficient_identity_evidence");
  const matches = [
    ...new Set(
      payload.results
        .filter(
          (work) =>
            known.has(normalizeDoi(work.doi)) &&
            Array.isArray(work.authorships) &&
            work.authorships.some(
              (a) => a.author?.id === `https://openalex.org/${authorId}`,
            ),
        )
        .map((work) => normalizeDoi(work.doi)),
    ),
  ].sort();
  if (matches.length < 2) fail("insufficient_identity_evidence");
  return { doiMatches: matches.length, verifiedDois: matches.slice(0, 3) };
}

async function fetchJson(fetchImpl, url, headers = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
  } catch {
    fail("network_error");
  }
  if (!response.ok)
    fail(
      `http_${Number.isInteger(response.status) ? response.status : "error"}`,
    );
  try {
    return await response.json();
  } catch {
    fail("invalid_json");
  }
}

export async function refreshMetrics(
  snapshot,
  {
    profile,
    knownDois,
    env = {},
    fetchImpl = globalThis.fetch,
    now = new Date().toISOString(),
  },
) {
  if (
    snapshot?.schemaVersion !== 1 ||
    !snapshot.sources ||
    !Number.isFinite(Date.parse(now))
  )
    fail("invalid_snapshot");
  const next = structuredClone(snapshot);
  const results = [];
  const authorized = (prefix) =>
    env[`${prefix}_METRICS_ENABLED`] === "true" &&
    env[`${prefix}_PUBLIC_DISPLAY_ALLOWED`] === "true";
  const adapters = {
    scopus: {
      enabled: authorized("SCOPUS") && Boolean(env.SCOPUS_API_KEY),
      run: async () => {
        if (next.sources.scopus.identity.authorId !== profile.scopus_author_id)
          fail("identity_mismatch");
        const headers = { "X-ELS-APIKey": env.SCOPUS_API_KEY };
        if (env.SCOPUS_INSTTOKEN)
          headers["X-ELS-Insttoken"] = env.SCOPUS_INSTTOKEN;
        const data = await fetchJson(
          fetchImpl,
          `https://api.elsevier.com/content/author/author_id/${encodeURIComponent(profile.scopus_author_id)}?view=METRICS`,
          headers,
        );
        return parseScopus(data, profile.scopus_author_id);
      },
    },
    webOfScience: {
      enabled: authorized("WOS") && Boolean(env.WOS_API_KEY),
      run: async () => {
        if (
          next.sources.webOfScience.identity.researcherId !==
          profile.web_of_science_researcher_id
        )
          fail("identity_mismatch");
        const data = await fetchJson(
          fetchImpl,
          `https://api.clarivate.com/apis/wos-researcher/researchers/${encodeURIComponent(profile.web_of_science_researcher_id)}`,
          { "X-ApiKey": env.WOS_API_KEY },
        );
        return parseWebOfScience(
          data,
          profile.web_of_science_researcher_id,
          profile.orcid,
        );
      },
    },
    openalex: {
      // OpenAlex metadata is CC0 and this site's owner requested weekly public metrics.
      enabled: env.OPENALEX_METRICS_ENABLED !== "false",
      run: async () => {
        if (next.sources.openalex.identity.orcid !== profile.orcid)
          fail("identity_mismatch");
        const headers = env.OPENALEX_API_KEY
          ? { Authorization: `Bearer ${env.OPENALEX_API_KEY}` }
          : {};
        const data = await fetchJson(
          fetchImpl,
          `https://api.openalex.org/authors/https://orcid.org/${encodeURIComponent(profile.orcid)}`,
          headers,
        );
        const parsed = parseOpenAlex(
          data,
          profile.orcid,
          next.sources.openalex.identity.authorId,
        );
        const worksUrl = new URL("https://api.openalex.org/works");
        worksUrl.searchParams.set(
          "filter",
          `author.id:${parsed.identity.authorId}`,
        );
        worksUrl.searchParams.set("per_page", "100");
        worksUrl.searchParams.set("select", "id,doi,authorships");
        const works = await fetchJson(fetchImpl, worksUrl.toString(), headers);
        return {
          ...parsed,
          provenance: {
            method: "official_api",
            orcidMatch: true,
            ...verifyOpenAlexWorks(works, parsed.identity.authorId, knownDois),
          },
        };
      },
    },
  };
  await Promise.all(
    Object.entries(adapters).map(async ([key, adapter]) => {
      if (!adapter.enabled) {
        results.push({ source: key, outcome: "skipped" });
        return;
      }
      const source = next.sources[key];
      if (!source) fail("invalid_snapshot");
      source.lastAttempt = now;
      try {
        Object.assign(source, await adapter.run(), {
          status: "current",
          lastSuccess: now,
        });
        delete source.lastError;
        results.push({ source: key, outcome: "success" });
      } catch (error) {
        // Never write remote response bodies, URLs with credentials, or raw error messages.
        source.status = source.lastSuccess ? "stale" : "unavailable";
        source.lastError =
          error instanceof MetricsError ? error.code : "unexpected_error";
        results.push({
          source: key,
          outcome: "failed",
          code: source.lastError,
        });
      }
    }),
  );
  return {
    snapshot: next,
    results: results.sort((a, b) => a.source.localeCompare(b.source)),
  };
}
