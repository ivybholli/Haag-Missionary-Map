let selectedYears = new Set();

function matchesFamily(m) {
  const selected = document.getElementById("familyFilter").value;
  if (selected === "all") return true;
  return normalize(getRelation(m)).includes(normalize(selected));
}

function matchesSex(m) {
  const showElders = document.getElementById("showElders").checked;
  const showSisters = document.getElementById("showSisters").checked;
  return getSex(m) === "Female" ? showSisters : showElders;
}

function matchesCurrentFilter(m) {
  return document.getElementById("showCurrent").checked || !isCurrentlyServing(m);
}

function matchesInLawFilter(m) {
  return document.getElementById("showInLaws").checked || !isInLaw(m);
}

function matchesSearch(m) {
  if (!activeSearch) return true;

  const haystack = [
    getName(m),
    getMissionName(m),
    getCountry(m),
    getState(m),
    getCity(m),
    getLanguage(m),
    getRelation(m)
  ].join(" ");

  return normalize(haystack).includes(normalize(activeSearch));
}

function missionaryYears(m) {
  const start = parseMonthYear(getStartDate(m));
  const end = parseMonthYear(getEndDate(m));

  if (!start || !end) return [];

  const years = [];
  for (let y = start.year; y <= end.year; y++) {
    years.push(y);
  }

  return years;
}

function matchesYearFilter(m) {
  if (selectedYears.size === 0) return true;

  const years = missionaryYears(m);
  return years.some(year => selectedYears.has(year));
}

function getFilteredData() {
  return allMissionaries.filter(m => {
    return (
      matchesFamily(m) &&
      matchesSex(m) &&
      matchesCurrentFilter(m) &&
      matchesInLawFilter(m) &&
      matchesSearch(m) &&
      matchesYearFilter(m)
    );
  });
}

function buildYearCheckboxes() {
  const container = document.getElementById("yearCheckboxes");
  if (!container) return;

  const years = new Set();

  allMissionaries.forEach(m => {
    missionaryYears(m).forEach(year => years.add(year));
  });

  container.innerHTML = Array.from(years)
    .sort((a, b) => b - a)
    .map(year => `
      <label class="year-option">
        <input type="checkbox" value="${year}">
        ${year}
      </label>
    `)
    .join("");

  container.querySelectorAll("input").forEach(input => {
    input.addEventListener("change", () => {
      const year = Number(input.value);

      if (input.checked) {
        selectedYears.add(year);
      } else {
        selectedYears.delete(year);
      }

      drawMarkers();
    });
  });
}

function setupFilters() {
  document.getElementById("showElders").addEventListener("change", drawMarkers);
  document.getElementById("showSisters").addEventListener("change", drawMarkers);
  document.getElementById("showCurrent").addEventListener("change", drawMarkers);
  document.getElementById("showInLaws").addEventListener("change", drawMarkers);
  document.getElementById("familyFilter").addEventListener("change", drawMarkers);

  document.getElementById("searchInput").addEventListener("input", event => {
    activeSearch = event.target.value;
    drawMarkers();
  });

  document.getElementById("clearYears").addEventListener("click", () => {
    selectedYears.clear();

    document
      .querySelectorAll("#yearCheckboxes input")
      .forEach(input => input.checked = false);

    drawMarkers();
  });

  buildYearCheckboxes();
}
