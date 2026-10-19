import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 390, 729, 768, 1280, 1440]) {
  test(`responsive layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const failed: string[] = [];
    page.on("pageerror", (e) => failed.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith("http://127.0.0.1:4173") && r.status() >= 400)
        failed.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("./");
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page.getByRole("heading", { name: "Mamyr Altaibek." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    expect(
      await page
        .locator(".portrait img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBeTruthy();
    await expect(page.locator(".publication:visible")).toHaveCount(20);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    expect(failed).toEqual([]);
  });
}
test("search, year filters, empty state and reset work together", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("searchbox").fill("emotion");
  await expect(page.locator(".publication:visible")).toHaveCount(3);
  await page.getByLabel("Publication year").selectOption("2026");
  await expect(page.locator(".publication:visible")).toHaveCount(1);
  await page.getByRole("searchbox").fill("zzzz no match");
  await expect(
    page.getByText("No publications match your search."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".publication:visible")).toHaveCount(20);
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByLabel("Publication year").selectOption("2024");
  await expect(page.locator(".publication:visible")).toHaveCount(2);
});
test("light is the default regardless of system theme, manual choice persists and skip link works", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("source separation and citation download", async ({ page, request }) => {
  await page.goto("./");
  await expect(
    page.locator(".source-badge").filter({ hasText: "Scopus export" }),
  ).toHaveCount(16);
  await expect(
    page.locator(".source-badge").filter({ hasText: "ORCID" }),
  ).toHaveCount(4);
  await page
    .getByText("About the records and metrics", { exact: false })
    .click();
  await expect(
    page.getByText("ORCID alone does not establish indexing", { exact: false }),
  ).toBeVisible();
  const bib = await request.get("./publications.bib");
  expect(bib.status()).toBe(200);
  expect((await bib.text()).match(/^@/gm)).toHaveLength(20);
  expect(await page.locator('a[href^="javascript:"]').count()).toBe(0);
});
for (const mode of ["light", "dark"] as const) {
  for (const width of [390, 1440]) {
    test(`accessibility and screenshot ${mode} ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.emulateMedia({ colorScheme: mode, reducedMotion: "reduce" });
      await page.goto("./");
      if (mode === "dark") {
        await page.getByRole("button", { name: "Switch to dark mode" }).click();
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `../${width === 390 ? "mobile" : "desktop"}-${mode}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `../${width === 390 ? "mobile" : "desktop"}-${mode}-viewport.png`,
      });
    });
  }
}
test("all content and links remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".publication:visible")).toHaveCount(20);
  await expect(
    page.getByRole("link", { name: "mameralt@outlook.com" }),
  ).toBeVisible();
  await expect(page.locator(".publication-controls")).toBeHidden();
  await context.close();
});

test("manual h-index snapshots stay separate from live OpenAlex metrics", async ({
  page,
}) => {
  await page.goto("./");
  const sources = page.locator(".metric-source");
  await expect(sources).toHaveCount(3);
  await expect(sources.nth(0)).toContainText("Scopus");
  await expect(sources.nth(0).locator("dd")).toHaveText("4");
  await expect(sources.nth(0)).toContainText("As of 20 Oct 2026");
  await expect(sources.nth(1)).toContainText("Web of Science");
  await expect(sources.nth(1).locator("dd")).toHaveText("2");
  await expect(sources.nth(2)).toContainText("OpenAlex");
  await expect(sources.nth(2)).toContainText("Updated");
  await expect(sources.nth(2).locator("dd")).toHaveCount(3);
  await page.locator(".source-notes summary").click();
  await expect(page.locator("body")).not.toContainText(
    /manual snapshot|\bAPI\b/i,
  );
});

test("header text stays compact independently of portrait height at 729px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 729, height: 900 });
  await page.goto("./");
  await page.evaluate(() => document.fonts.ready);
  const gap = await page.evaluate(() => {
    const name = document.querySelector("h1")!.getBoundingClientRect();
    const position = document
      .querySelector(".hero-position")!
      .getBoundingClientRect();
    const affiliation = document
      .querySelector(".hero-affiliation")!
      .getBoundingClientRect();
    return {
      nameToTitle: position.top - name.bottom,
      titleToUniversity: affiliation.top - position.bottom,
    };
  });
  expect(gap.nameToTitle).toBeLessThanOrEqual(12);
  expect(gap.titleToUniversity).toBeLessThanOrEqual(12);
  await expect(page.locator(".publication:visible")).toHaveCount(20);
  await expect(page.locator("#toggle-publications")).toHaveCount(0);
  await page.screenshot({ path: "../tablet-compact-viewport.png" });
});
