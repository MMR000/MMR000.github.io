import "./styles.css";

const root = document.documentElement;
const themeButton = document.querySelector<HTMLButtonElement>(".theme-toggle")!;
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
let explicitTheme: string | null = null;
try {
  explicitTheme = localStorage.getItem("theme");
} catch {
  /* Storage may be unavailable. */
}
function setTheme(theme: string) {
  root.dataset.theme = theme;
  themeButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
  );
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#191e1e" : "#f8f7f3");
}
setTheme(root.dataset.theme || (themeMedia.matches ? "dark" : "light"));
themeButton.hidden = false;
themeButton.addEventListener("click", () => {
  explicitTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(explicitTheme);
  try {
    localStorage.setItem("theme", explicitTheme);
  } catch {
    /* Session-only preference. */
  }
});
themeMedia.addEventListener("change", (event) => {
  if (!explicitTheme) setTheme(event.matches ? "dark" : "light");
});

const search = document.querySelector<HTMLInputElement>("#publication-search")!;
const year = document.querySelector<HTMLSelectElement>("#publication-year")!;
const toggle = document.querySelector<HTMLButtonElement>(
  "#toggle-publications",
)!;
const rows = [...document.querySelectorAll<HTMLElement>(".publication")];
const status = document.querySelector<HTMLElement>("#results-status")!;
const viewLabel = document.querySelector<HTMLElement>(
  "#publication-view-label",
)!;
const emptyState = document.querySelector<HTMLElement>(".empty-state")!;
let expanded = false;
function filterPublications(announce = true) {
  const terms = search.value
    .trim()
    .toLocaleLowerCase("en")
    .split(/\s+/)
    .filter(Boolean);
  const filtering = terms.length > 0 || year.value !== "all";
  let count = 0;
  rows.forEach((row) => {
    const matches =
      (year.value === "all" || row.dataset.year === year.value) &&
      terms.every((term) => row.dataset.search?.includes(term));
    row.hidden = !(
      matches &&
      (expanded || filtering || row.dataset.featured === "true")
    );
    if (!row.hidden) count++;
  });
  viewLabel.textContent = filtering
    ? "Filtered bibliography"
    : expanded
      ? "Complete bibliography"
      : "Selected publications";
  emptyState.hidden = count !== 0;
  status.hidden = !announce;
  status.textContent = filtering
    ? `${count} of ${rows.length} publications`
    : `${count} ${expanded ? "publications" : "selected publications"}`;
  toggle.hidden = filtering;
  toggle.setAttribute("aria-expanded", String(expanded));
  toggle.innerHTML = expanded
    ? 'Show selected publications <span aria-hidden="true">↑</span>'
    : `View all ${rows.length} publications <span aria-hidden="true">↓</span>`;
}
search.addEventListener("input", () => filterPublications());
year.addEventListener("change", () => filterPublications());
toggle.addEventListener("click", () => {
  expanded = !expanded;
  filterPublications();
  if (!expanded)
    document
      .querySelector("#publications")
      ?.scrollIntoView({ behavior: "instant" });
});
document.querySelector("#clear-filters")?.addEventListener("click", () => {
  search.value = "";
  year.value = "all";
  filterPublications();
  search.focus();
});
document.querySelector<HTMLElement>(".publication-controls")!.hidden = false;
filterPublications(false);

const navLinks = [
  ...document.querySelectorAll<HTMLAnchorElement>(
    '.site-header nav a[href^="#"]',
  ),
];
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          if (link.hash === `#${entry.target.id}`)
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
    }
  },
  { rootMargin: "-10% 0px -60% 0px", threshold: 0 },
);
navLinks.forEach((link) => {
  const section = document.querySelector(link.hash);
  if (section) observer.observe(section);
});
