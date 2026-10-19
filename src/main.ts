import "./styles.css";

const root = document.documentElement;
const themeButton = document.querySelector<HTMLButtonElement>(".theme-toggle")!;
function setTheme(theme: "light" | "dark") {
  root.dataset.theme = theme;
  themeButton.setAttribute(
    "aria-label",
    `Switch to ${theme === "dark" ? "light" : "dark"} mode`,
  );
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#191e1e" : "#f8f7f3");
}
setTheme(root.dataset.theme === "dark" ? "dark" : "light");
themeButton.hidden = false;
themeButton.addEventListener("click", () => {
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* Session-only preference. */
  }
});

const search = document.querySelector<HTMLInputElement>("#publication-search")!;
const year = document.querySelector<HTMLSelectElement>("#publication-year")!;
const rows = [...document.querySelectorAll<HTMLElement>(".publication")];
const status = document.querySelector<HTMLElement>("#results-status")!;
const viewLabel = document.querySelector<HTMLElement>(
  "#publication-view-label",
)!;
const emptyState = document.querySelector<HTMLElement>(".empty-state")!;
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
    row.hidden = !matches;
    if (!row.hidden) count++;
  });
  viewLabel.textContent = filtering
    ? "Filtered bibliography"
    : "Complete bibliography";
  emptyState.hidden = count !== 0;
  status.hidden = !announce;
  status.textContent = filtering
    ? `${count} of ${rows.length} publications`
    : `${count} publications`;
}
search.addEventListener("input", () => filterPublications());
year.addEventListener("change", () => filterPublications());
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
