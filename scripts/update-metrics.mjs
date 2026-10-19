import { readFile, writeFile, rename, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { refreshMetrics } from "./metrics-lib.mjs";

const root = new URL("../", import.meta.url);
const target = new URL("data/metrics.json", root);
const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));
const [snapshot, profile, publicationData] = await Promise.all([
  readJson("data/metrics.json"),
  readJson("data/profile.json"),
  readJson("data/publications.json"),
]);
const publications = Array.isArray(publicationData)
  ? publicationData
  : publicationData.publications;
if (!Array.isArray(publications))
  throw new Error("Publication data must contain a publications array.");
const { snapshot: updated, results } = await refreshMetrics(snapshot, {
  profile,
  knownDois: publications.map((publication) => publication.doi),
  env: process.env,
});
const succeeded = results.filter(
  (result) => result.outcome === "success",
).length;
const failed = results.filter((result) => result.outcome === "failed").length;
const changed = JSON.stringify(updated) !== JSON.stringify(snapshot);
if (changed) {
  const temporary = `${fileURLToPath(target)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(updated, null, 2)}\n`);
  await rename(temporary, target);
}
for (const result of results) {
  console.log(
    `${result.source}: ${result.outcome}${result.code ? ` (${result.code})` : ""}`,
  );
}
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `success_count=${succeeded}\nfailure_count=${failed}\nchanged=${changed && succeeded > 0}\n`,
  );
}
if (failed)
  console.warn(
    "One or more sources could not refresh; their last successful values and dates were retained.",
  );
if (failed && !succeeded) process.exitCode = 1;
