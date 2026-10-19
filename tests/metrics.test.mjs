import test from "node:test";
import assert from "node:assert/strict";
import {
  parseScopus,
  parseWebOfScience,
  parseOpenAlex,
  verifyOpenAlexWorks,
  refreshMetrics,
} from "../scripts/metrics-lib.mjs";

// Synthetic fixtures only: these counts are test inputs, never publication data.
const profile = {
  orcid: "0009-0002-8219-0751",
  scopus_author_id: "59535935600",
  web_of_science_researcher_id: "NAX-9175-2025",
};
const knownDois = ["10.1234/test-one", "10.1234/test-two"];
const now = "2026-10-19T20:00:00.000Z";
const old = "2026-10-12T20:00:00.000Z";
const values = { hIndex: 2, citations: 8, publications: 5 };
const scopus = {
  "author-retrieval-response": [
    {
      coredata: {
        "dc:identifier": `AUTHOR_ID:${profile.scopus_author_id}`,
        "document-count": "5",
        "citation-count": "8",
      },
      "h-index": "2",
    },
  ],
};
const wos = {
  ids: {
    rids: [profile.web_of_science_researcher_id],
    orcids: [profile.orcid],
  },
  metricsAllTime: { hIndex: 2, totalTimesCited: 8, documents: { count: 5 } },
};
const openalex = {
  id: "https://openalex.org/A123",
  orcid: `https://orcid.org/${profile.orcid}`,
  ids: { orcid: `https://orcid.org/${profile.orcid}` },
  summary_stats: { h_index: 2 },
  cited_by_count: 8,
  works_count: 5,
};
const works = {
  results: knownDois.map((doi) => ({
    doi: `https://doi.org/${doi}`,
    authorships: [{ author: { id: "https://openalex.org/A123" } }],
  })),
};
const response = (data, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => data,
});
const snapshot = () => ({
  schemaVersion: 1,
  sources: {
    scopus: {
      identity: { authorId: profile.scopus_author_id },
      metrics: values,
      status: "current",
      lastSuccess: old,
      lastAttempt: old,
    },
    webOfScience: {
      identity: { researcherId: profile.web_of_science_researcher_id },
      metrics: values,
      status: "current",
      lastSuccess: old,
      lastAttempt: old,
    },
    openalex: {
      identity: { orcid: profile.orcid, authorId: "A123" },
      metrics: values,
      status: "current",
      lastSuccess: old,
      lastAttempt: old,
    },
  },
});
const allEnabled = {
  SCOPUS_METRICS_ENABLED: "true",
  SCOPUS_PUBLIC_DISPLAY_ALLOWED: "true",
  SCOPUS_API_KEY: "scopus-secret",
  WOS_METRICS_ENABLED: "true",
  WOS_PUBLIC_DISPLAY_ALLOWED: "true",
  WOS_API_KEY: "wos-secret",
};

test("all source adapters map their own documented fields", () => {
  assert.deepEqual(
    parseScopus(scopus, profile.scopus_author_id).metrics,
    values,
  );
  assert.deepEqual(
    parseScopus(
      { "author-retrieval-response": scopus["author-retrieval-response"][0] },
      profile.scopus_author_id,
    ).metrics,
    values,
  );
  assert.deepEqual(
    parseWebOfScience(wos, profile.web_of_science_researcher_id, profile.orcid)
      .metrics,
    values,
  );
  assert.deepEqual(parseOpenAlex(openalex, profile.orcid).metrics, values);
});

test("ambiguous Scopus responses and unknown field names fail safely", () => {
  assert.throws(
    () =>
      parseScopus(
        { "author-retrieval-response": [] },
        profile.scopus_author_id,
      ),
    /invalid_response/,
  );
  assert.throws(
    () =>
      parseScopus(
        {
          "author-retrieval-response": [
            ...scopus["author-retrieval-response"],
            ...scopus["author-retrieval-response"],
          ],
        },
        profile.scopus_author_id,
      ),
    /invalid_response/,
  );
  const missing = structuredClone(scopus);
  delete missing["author-retrieval-response"][0].coredata["citation-count"];
  missing["author-retrieval-response"][0].coredata["cited-by-count"] = "99";
  assert.throws(
    () => parseScopus(missing, profile.scopus_author_id),
    /invalid_metrics/,
  );
  assert.throws(
    () =>
      parseWebOfScience(
        {
          ...wos,
          metricsAllTime: { hIndex: 2, totalTimesCited: 8, documentsCount: 5 },
        },
        profile.web_of_science_researcher_id,
        profile.orcid,
      ),
    /invalid_metrics/,
  );
  assert.throws(
    () =>
      parseWebOfScience(
        { ...wos, metricsAllTime: undefined },
        profile.web_of_science_researcher_id,
        profile.orcid,
      ),
    /invalid_metrics/,
  );
});

test("documented Scopus citation field spellings are accepted only when consistent", () => {
  const plural = structuredClone(scopus);
  plural["author-retrieval-response"][0].coredata["citations-count"] = "8";
  assert.deepEqual(
    parseScopus(plural, profile.scopus_author_id).metrics,
    values,
  );
  delete plural["author-retrieval-response"][0].coredata["citation-count"];
  assert.deepEqual(
    parseScopus(plural, profile.scopus_author_id).metrics,
    values,
  );
  plural["author-retrieval-response"][0].coredata["citation-count"] = "999";
  assert.throws(
    () => parseScopus(plural, profile.scopus_author_id),
    /conflicting_metrics/,
  );
});

test("wrong/missing identities and conflicting ORCID are rejected", () => {
  assert.throws(() => parseScopus(scopus, "000"), /identity_mismatch/);
  assert.throws(
    () => parseWebOfScience(wos, "OTHER-ID", profile.orcid),
    /identity_mismatch/,
  );
  assert.throws(
    () =>
      parseWebOfScience(
        wos,
        profile.web_of_science_researcher_id,
        "wrong-orcid",
      ),
    /identity_mismatch/,
  );
  assert.throws(
    () =>
      parseOpenAlex(
        { ...openalex, ids: { orcid: "wrong-orcid" } },
        profile.orcid,
      ),
    /identity_mismatch/,
  );
  assert.throws(
    () => parseOpenAlex(openalex, profile.orcid, "A999"),
    /identity_changed/,
  );
  assert.throws(
    () =>
      parseOpenAlex(
        { ...openalex, id: "https://example.com/A123" },
        profile.orcid,
      ),
    /identity_mismatch/,
  );
});

test("missing, negative, fractional, nonnumeric and unsafe counts are rejected", () => {
  for (const bad of [
    null,
    undefined,
    "",
    false,
    -1,
    1.5,
    "8",
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(
      () => parseOpenAlex({ ...openalex, cited_by_count: bad }, profile.orcid),
      /invalid_metrics/,
    );
  }
  for (const bad of ["", null, false, "-2", "1.2", "1e3", " 5 "]) {
    const invalid = structuredClone(scopus);
    invalid["author-retrieval-response"][0].coredata["document-count"] = bad;
    assert.throws(
      () => parseScopus(invalid, profile.scopus_author_id),
      /invalid_metrics/,
    );
  }
  assert.equal(
    parseOpenAlex({ ...openalex, cited_by_count: 0 }, profile.orcid).metrics
      .citations,
    0,
  );
});

test("OpenAlex identity requires two distinct known DOIs attributed to this author", () => {
  assert.equal(verifyOpenAlexWorks(works, "A123", knownDois).doiMatches, 2);
  assert.throws(
    () => verifyOpenAlexWorks(works, "A999", knownDois),
    /insufficient_identity_evidence/,
  );
  assert.throws(
    () =>
      verifyOpenAlexWorks(
        { results: [works.results[0], works.results[0]] },
        "A123",
        knownDois,
      ),
    /insufficient_identity_evidence/,
  );
  assert.throws(
    () => verifyOpenAlexWorks({ results: [] }, "A123", knownDois),
    /insufficient_identity_evidence/,
  );
});

test("disabled/no-entitlement sources make no requests and preserve snapshot", async () => {
  const original = snapshot();
  const result = await refreshMetrics(original, {
    profile,
    knownDois,
    env: {
      OPENALEX_METRICS_ENABLED: "false",
      SCOPUS_API_KEY: "secret",
      WOS_API_KEY: "secret",
    },
    now,
    fetchImpl: () => assert.fail("An unauthorized request was made"),
  });
  assert.deepEqual(result.snapshot, original);
  assert.ok(result.results.every((source) => source.outcome === "skipped"));
});

test("OpenAlex works without credentials; requests are bounded and never use returned URLs", async () => {
  const requests = [];
  const result = await refreshMetrics(snapshot(), {
    profile,
    knownDois,
    now,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return response(
        url.includes("/authors/")
          ? { ...openalex, works_api_url: "https://untrusted.test/" }
          : works,
      );
    },
  });
  assert.equal(requests.length, 2);
  assert.ok(
    requests.every(({ url }) => url.startsWith("https://api.openalex.org/")),
  );
  assert.ok(
    requests.every(
      ({ options }) => options.redirect === "error" && options.signal,
    ),
  );
  assert.equal(result.snapshot.sources.openalex.lastSuccess, now);
  assert.equal(result.snapshot.sources.scopus.lastSuccess, old);
});

test("network/HTTP/invalid JSON failures preserve previous successful counts and timestamp", async () => {
  const failures = [
    async () => {
      throw new Error("sensitive-secret");
    },
    async () => response({}, 403),
    async () => response({}, 429),
    async () => ({
      ok: true,
      json: async () => {
        throw new Error("private response");
      },
    }),
  ];
  for (const fetchImpl of failures) {
    const original = snapshot();
    const result = await refreshMetrics(original, {
      profile,
      knownDois,
      now,
      fetchImpl,
    });
    const source = result.snapshot.sources.openalex;
    assert.equal(source.status, "stale");
    assert.equal(source.lastSuccess, old);
    assert.equal(source.lastAttempt, now);
    assert.deepEqual(source.metrics, values);
    assert.doesNotMatch(
      JSON.stringify(result),
      /sensitive-secret|private response/,
    );
    assert.deepEqual(original, snapshot());
  }
});

test("partial failure retains failed source while successfully refreshing other sources", async () => {
  const result = await refreshMetrics(snapshot(), {
    profile,
    knownDois,
    env: allEnabled,
    now,
    fetchImpl: async (url) => {
      if (url.includes("elsevier")) return response(scopus);
      if (url.includes("clarivate")) return response({}, 403);
      return response(url.includes("/authors/") ? openalex : works);
    },
  });
  assert.equal(
    result.results.filter((source) => source.outcome === "success").length,
    2,
  );
  assert.equal(result.snapshot.sources.webOfScience.lastSuccess, old);
  assert.equal(result.snapshot.sources.webOfScience.status, "stale");
  assert.equal(result.snapshot.sources.scopus.lastSuccess, now);
  assert.equal(result.snapshot.sources.openalex.lastSuccess, now);
});

test("failed OpenAlex DOI verification never advances snapshot success date", async () => {
  const result = await refreshMetrics(snapshot(), {
    profile,
    knownDois,
    now,
    fetchImpl: async (url) =>
      response(url.includes("/authors/") ? openalex : { results: [] }),
  });
  assert.equal(result.snapshot.sources.openalex.lastSuccess, old);
  assert.equal(
    result.snapshot.sources.openalex.lastError,
    "insufficient_identity_evidence",
  );
});

test("keys are sent only in headers and never enter the stored snapshot", async () => {
  const requests = [];
  const result = await refreshMetrics(snapshot(), {
    profile,
    knownDois,
    now,
    env: { ...allEnabled, OPENALEX_API_KEY: "openalex-secret" },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return response(
        url.includes("elsevier")
          ? scopus
          : url.includes("clarivate")
            ? wos
            : url.includes("/authors/")
              ? openalex
              : works,
      );
    },
  });
  assert.equal(requests.length, 4);
  assert.ok(requests.every(({ url }) => !url.includes("secret")));
  assert.equal(
    requests.find(({ url }) => url.includes("elsevier")).options.headers[
      "X-ELS-APIKey"
    ],
    "scopus-secret",
  );
  assert.equal(
    requests.find(({ url }) => url.includes("clarivate")).options.headers[
      "X-ApiKey"
    ],
    "wos-secret",
  );
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});
