console.log("🔥 VERSION 4 APP.JS LOADED");

const SHEET_ID = "15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w";
const MISSIONARY_SHEET_NAME = "Form Responses 1";
const COORDINATES_SHEET_NAME = "Coordinates";

let allMissionaries = [];
let allMarkers = [];
let selectedYears = new Set();
let activeSearch = "";

const map = L.map("map", {
  zoomControl: false,
  worldCopyJump: true
}).setView([25, 0], 2);

const streetLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" }
);

const satelliteLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Imagery © Esri" }
);

const terrainLayer = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" }
);

streetLayer.addTo(map);

L.control.zoom({
  position: "bottomright"
}).addTo(map);

L.control.layers(
  {
    Street: streetLayer,
    Satellite: satelliteLayer,
    Terrain: terrainLayer
  },
  null,
  {
    position: "bottomright",
    collapsed: false
  }
).addTo(map);

const CONTINENTS = {
  "United States": "North America",
  USA: "North America",
  US: "North America",
  Brazil: "South America",
  Denmark: "Europe",
  Germany: "Europe",
  Italy: "Europe",
  France: "Europe",
  Spain: "Europe",
  Mexico: "North America",
  Canada: "North America",
  England: "Europe",
  "United Kingdom": "Europe",
  Argentina: "South America",
  Chile: "South America",
  Peru: "South America",
  Colombia: "South America",
  Philippines: "Asia",
  Japan: "Asia",
  Australia: "Oceania",
  "New Zealand": "Oceania"
};

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNoAccent(value) {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanHeader(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getValue(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== "") return row[name];
  }

  const keys = Object.keys(row);

  for (const name of names) {
    const found = keys.find(k => normalize(k) === normalize(name));
    if (found && row[found] !== "") return row[found];
  }

  return "";
}

async function loadSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const cols = json.table.cols.map(c => cleanHeader(c.label));

  return json.table.rows.map(row => {
    const obj = {};
    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });
    return obj;
  });
}

function getName(m) {
  return getValue(m, [
    "Missionary Name (First Last) (e.g., Dawn Hollingsworth)",
    "Missionary Name (First Last)",
    "Missionary Name",
    "Name"
  ]);
}

function getSex(m) {
  return getValue(m, ["Biological Sex", "Sex", "Gender"]);
}

function getRelation(m) {
  return getValue(m, ["Who is your Haag relation?", "Haag relation", "Relation"]);
}

function getRelationship(m) {
  return getValue(m, [
    "What is your relationship to Elva and Darrell?",
    "Relationship to Elva and Darrell"
  ]);
}

function getMissionName(m) {
  return getValue(m, [
    "Official Mission name (Ex: Maryland Baltimore)",
    "Official Mission Name",
    "Official Mission name",
    "Mission Name"
  ]);
}

function getCity(m) {
  return getValue(m, ["City", "Mission City"]);
}

function getState(m) {
  return getValue(m, ["State/Region", "State", "Mission State"]);
}

function getCountry(m) {
  return getValue(m, ["Country", "Mission Country"]);
}

function getLanguage(m) {
  return getValue(m, ["Assigned Language(s)", "Assigned Languages", "Language", "Languages"]);
}

function getStartDate(m) {
  return getValue(m, ["Start Date (MM/YYYY)", "Start Date"]);
}

function getEndDate(m) {
  return getValue(m, ["End Date (MM/YYYY)", "End Date"]);
}

function getPresidents(m) {
  return getValue(m, [
    "Mission President Names (Ex: President and Sister Piros; President and Sister Varner)",
    "Mission President Names",
    "Mission Presidents"
  ]);
}

function getSpouse(m) {
  return getValue(m, ["Your Spouse's Name (If Applicable)", "Spouse", "Spouse Name"]);
}

function getTitle(sex, name, language) {
  if (sex !== "Female") return `Elder ${name || ""}`;

  const firstLanguage = String(language || "English").split(",")[0].trim();

  const sisterTitles = {
    Spanish: "Hermana",
    Italian: "Sorella",
    French: "Sœur"
  };

  return `${sisterTitles[firstLanguage] || "Sister"} ${name || ""}`;
}

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function isInLaw(m) {
  return normalize(getRelationship(m)).includes("in-law");
}

function parseMonthYear(value) {
  if (!value) return null;

  const parts = String(value).trim().split("/");
  if (parts.length !== 2) return null;

  const month = Number(parts[0]);
  const year = Number(parts[1]);

  if (!month || !year || month < 1 || month > 12) return null;

  return { month, year };
}

function formatMissionDate(value) {
  const parsed = parseMonthYear(value);
  if (!parsed) return value || "";

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${months[parsed.month - 1]} ${parsed.year}`;
}

function isCurrentlyServing(m) {
  const end = parseMonthYear(getEndDate(m));
  if (!end) return false;

  const endDate = new Date(end.year, end.month, 0);
  return endDate >= new Date();
}

function missionLength(start, end) {
  const s = parseMonthYear(start);
  const e = parseMonthYear(end);

  if (!s || !e) return "";

  const months = (e.year - s.year) * 12 + (e.month - s.month) + 1;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function formatMissionDates(m) {
  const start = getStartDate(m);
  const end = getEndDate(m);

  if (isCurrentlyServing(m)) {
    return `
      <div class="card-date-main">${formatMissionDate(start)} – Present</div>
      <div class="currently-serving">✓ Currently Serving</div>
    `;
  }

  return `
    <div class="card-date-main">${formatMissionDate(start)} – ${formatMissionDate(end)}</div>
    <div class="mission-length">${missionLength(start, end)}</div>
  `;
}

function formatPresidents(text) {
  return String(text || "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean)
    .join("<br>");
}

function missionaryYears(m) {
  const start = parseMonthYear(getStartDate(m));
  const end = parseMonthYear(getEndDate(m));

  if (!start || !end) return [];

  const years = [];
  for (let y = start.year; y <= end.year; y++) years.push(y);

  return years;
}

function getFlagImage(country, state) {
  const cleanCountry = String(country || "").replace(/\s+/g, " ").trim();
  const cleanState = String(state || "").replace(/\s+/g, " ").trim();
  const stateKey = normalizeNoAccent(cleanState);

  const usFlags = {
    maryland: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_Maryland.svg",
    louisiana: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Flag_of_Louisiana.svg",
    utah: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Utah.svg",
    ohio: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Ohio.svg",
    washington: "https://upload.wikimedia.org/wikipedia/commons/5/54/Flag_of_Washington.svg",
    oregon: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Flag_of_Oregon.svg",
    connecticut: "https://upload.wikimedia.org/wikipedia/commons/9/96/Flag_of_Connecticut.svg"
  };

  const brazilFlags = {
    goias: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Bandeira_de_Goi%C3%A1s.svg",
    "rio de janeiro": "https://upload.wikimedia.org/wikipedia/commons/7/73/Bandeira_do_estado_do_Rio_de_Janeiro.svg"
  };

  if (["United States", "USA", "US"].includes(cleanCountry) && usFlags[stateKey]) {
    return `<img class="flag-img" src="${usFlags[stateKey]}" alt="${cleanState} flag">`;
  }

  if (cleanCountry === "Brazil" && brazilFlags[stateKey]) {
    return `<img class="flag-img" src="${brazilFlags[stateKey]}" alt="${cleanState} flag">`;
  }

  const countryCodes = {
    "United States": "us",
    USA: "us",
    US: "us",
    Brazil: "br",
    Denmark: "dk",
    Germany: "de",
    Italy: "it",
    France: "fr",
    Spain: "es",
    Mexico: "mx",
    Canada: "ca",
    England: "gb",
    "United Kingdom": "gb",
    Argentina: "ar",
    Chile: "cl",
    Peru: "pe",
    Colombia: "co",
    Philippines: "ph",
    Japan: "jp",
    Australia: "au",
    "New Zealand": "nz"
  };

  const code = countryCodes[cleanCountry];
  if (!code) return `<div class="flag-placeholder">🌍</div>`;

  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${cleanCountry} flag">`;
}

function missionaryPopupHtml(m) {
  const language = getLanguage(m);
  const presidents = getPresidents(m);
  const spouse = getSpouse(m);

  return `
    <div class="leaflet-mission-popup single-missionary-popup">
      <h2>${getTitle(getSex(m), getName(m), language)}</h2>

      <div class="card-divider"></div>

      <div class="card-location-small">
        ${getFlagImage(getCountry(m), getState(m))}
        <div>
          <div class="card-mission">${getMissionName(m) || ""}</div>
          ${language ? `<div class="popup-language">${language}</div>` : ""}
        </div>
      </div>

      <div class="card-dates">${formatMissionDates(m)}</div>

      ${presidents ? `<div class="card-presidents">${formatPresidents(presidents)}</div>` : ""}
      ${spouse ? `<div class="card-spouse">Married to ${spouse}</div>` : ""}
    </div>
  `;
}

function groupPopupHtml(group) {
  const first = group[0];

  const languages = new Set(group.map(m => getLanguage(m)).filter(Boolean));

  return `
    <div class="leaflet-mission-popup group-mission-popup">
      <h2>${getMissionName(first)}</h2>

      <div class="card-divider"></div>

      <div class="card-location-small">
        ${getFlagImage(getCountry(first), getState(first))}
        <div>
          <div class="card-mission">${group.length} missionaries served here</div>
          ${languages.size ? `<div class="popup-language">${Array.from(languages).join(", ")}</div>` : ""}
        </div>
      </div>

      <div class="missionary-list">
        ${group.map((m, index) => `
          <button type="button" class="missionary-list-item" data-index="${index}">
            <strong>${getTitle(getSex(m), getName(m), getLanguage(m))}</strong>
            <span>${formatMissionDate(getStartDate(m))} – ${
              isCurrentlyServing(m) ? "Present" : formatMissionDate(getEndDate(m))
            }</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function showDetailPreview(m, anchorElement) {
  const preview = document.getElementById("detailPreview");
  if (!preview || !anchorElement) return;

  preview.innerHTML = missionaryPopupHtml(m);
  preview.classList.remove("hidden");

  const rect = anchorElement.getBoundingClientRect();
  let left = rect.right + 14;
  let top = rect.top;

  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;

  const previewRect = preview.getBoundingClientRect();

  if (previewRect.right > window.innerWidth - 12) {
    left = rect.left - previewRect.width - 14;
  }

  if (previewRect.bottom > window.innerHeight - 12) {
    top = window.innerHeight - previewRect.height - 12;
  }

  if (top < 12) top = 12;

  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
}

function hideDetailPreview() {
  const preview = document.getElementById("detailPreview");
  if (!preview) return;

  preview.classList.add("hidden");
  preview.innerHTML = "";

  document
    .querySelectorAll(".missionary-list-item.active")
    .forEach(btn => btn.classList.remove("active"));
}

function setupGroupPopupEvents(marker, group) {
  marker.on("popupopen", event => {
    setTimeout(() => {
      const popupEl = event.popup.getElement();
      if (!popupEl) return;

      popupEl.querySelectorAll(".missionary-list-item").forEach(button => {
        const missionary = group[Number(button.dataset.index)];

        button.addEventListener("mouseenter", () => {
          document.querySelectorAll(".missionary-list-item.active")
            .forEach(btn => btn.classList.remove("active"));

          button.classList.add("active");
          showDetailPreview(missionary, button);
        });

        button.addEventListener("click", e => {
          e.preventDefault();
          e.stopPropagation();

          document.querySelectorAll(".missionary-list-item.active")
            .forEach(btn => btn.classList.remove("active"));

          button.classList.add("active");
          showDetailPreview(missionary, button);
        });
      });

      document.addEventListener("click", handleOutsidePreviewClick);
    }, 0);
  });

  marker.on("popupclose", () => {
    hideDetailPreview();
    document.removeEventListener("click", handleOutsidePreviewClick);
  });
}

function handleOutsidePreviewClick(e) {
  const preview = document.getElementById("detailPreview");
  if (!preview || preview.classList.contains("hidden")) return;

  const clickedPreview = preview.contains(e.target);
  const clickedListItem = e.target.closest(".missionary-list-item");

  if (!clickedPreview && !clickedListItem) hideDetailPreview();
}

function bindMarkerPopup(marker, group) {
  if (group.length === 1) {
    marker.bindPopup(missionaryPopupHtml(group[0]), {
      closeButton: true,
      autoPan: true,
      maxWidth: 360,
      className: "haag-leaflet-popup"
    });
  } else {
    marker.bindPopup(groupPopupHtml(group), {
      closeButton: true,
      autoPan: true,
      maxWidth: 380,
      className: "haag-leaflet-popup"
    });

    setupGroupPopupEvents(marker, group);
  }

  marker.on("mouseover", () => marker.openPopup());
  marker.on("click", () => marker.openPopup());
}

function createMarkerIcon(group) {
  const count = group.length;
  const hasMale = group.some(m => getSex(m) !== "Female");
  const hasFemale = group.some(m => getSex(m) === "Female");
  const hasCurrent = group.some(m => isCurrentlyServing(m));
  const hasInLaw = group.some(m => isInLaw(m));

  let color = getColor(getSex(group[0]));

  if (hasMale && hasFemale) color = "#7c3aed";

  let inner = "";
  if (count > 1) inner = `<span class="marker-number">${count}</span>`;
  else if (hasCurrent) inner = `<span class="marker-check">✓</span>`;

  const classes = [
    "mission-marker",
    count > 1 ? "duplicate-marker" : "",
    hasInLaw && count === 1 ? "heart-marker" : "dot-marker"
  ].join(" ");

  return L.divIcon({
    className: "custom-marker",
    html: `<div class="${classes}" style="--marker-color:${color}">${inner}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -14]
  });
}

function clearMarkers() {
  allMarkers.forEach(marker => map.removeLayer(marker));
  allMarkers = [];
}

function getFilteredData() {
  return allMissionaries.filter(m => {
    return (
      matchesFamily(m) &&
      matchesSex(m) &&
      matchesCurrent(m) &&
      matchesInLaw(m) &&
      matchesSearch(m) &&
      matchesYears(m)
    );
  });
}

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

function matchesCurrent(m) {
  return document.getElementById("showCurrent").checked || !isCurrentlyServing(m);
}

function matchesInLaw(m) {
  return document.getElementById("showInLaws").checked || !isInLaw(m);
}

function matchesSearch(m) {
  if (!activeSearch) return true;

  const haystack = [
    getName(m),
    getMissionName(m),
    getCity(m),
    getState(m),
    getCountry(m),
    getLanguage(m),
    getPresidents(m),
    getSpouse(m),
    getRelation(m)
  ].join(" ");

  return normalize(haystack).includes(normalize(activeSearch));
}

function matchesYears(m) {
  if (selectedYears.size === 0) return true;
  return missionaryYears(m).some(year => selectedYears.has(year));
}

function groupByMission(data) {
  const groups = {};

  data.forEach(m => {
    if (!m.coords) return;

    const key = normalize(getMissionName(m));

    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  return Object.values(groups);
}

function drawMarkers() {
  clearMarkers();
  hideDetailPreview();

  const data = getFilteredData();
  updateStats(data);

  const groups = groupByMission(data);
  const bounds = [];

  groups.forEach(group => {
    const coords = group[0].coords;

    const marker = L.marker([coords.lat, coords.lng], {
      icon: createMarkerIcon(group)
    }).addTo(map);

    bindMarkerPopup(marker, group);

    allMarkers.push(marker);
    bounds.push([coords.lat, coords.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, {
      padding: [80, 80],
      maxZoom: 5
    });
  }
}

function countItems(values) {
  const counts = {};

  values.filter(Boolean).forEach(value => {
    const key = String(value).trim();
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

function topItem(values) {
  const entries = Object.entries(countItems(values));
  if (!entries.length) return "--";

  entries.sort((a, b) => b[1] - a[1]);
  return `${entries[0][0]} (${entries[0][1]})`;
}

function getLanguageList(m) {
  return String(getLanguage(m) || "")
    .split(/,|;|\/|&/)
    .map(x => x.trim())
    .filter(Boolean);
}

function updateStats(data) {
  document.getElementById("totalMissionaries").textContent = data.length;
  document.getElementById("totalElders").textContent =
    data.filter(m => getSex(m) !== "Female").length;
  document.getElementById("totalSisters").textContent =
    data.filter(m => getSex(m) === "Female").length;
  document.getElementById("currentMissionaries").textContent =
    data.filter(m => isCurrentlyServing(m)).length;

  document.getElementById("countriesServed").textContent =
    new Set(data.map(m => getCountry(m)).filter(Boolean)).size;
  document.getElementById("totalContinents").textContent =
    new Set(data.map(m => CONTINENTS[getCountry(m)]).filter(Boolean)).size;

  const languages = new Set();
  data.forEach(m => getLanguageList(m).forEach(lang => languages.add(lang)));
  document.getElementById("totalLanguages").textContent = languages.size;

  const missionCounts = countItems(data.map(m => getMissionName(m)));
  const duplicateCount = Object.values(missionCounts).filter(count => count > 1).length;

  document.getElementById("duplicateMissions").textContent = duplicateCount;
  document.getElementById("topLanguage").textContent =
    topItem(data.flatMap(m => getLanguageList(m)));
  document.getElementById("topCountry").textContent =
    topItem(data.map(m => getCountry(m)));
}

function buildYearCheckboxes() {
  const container = document.getElementById("yearCheckboxes");
  const years = new Set();

  allMissionaries.forEach(m => missionaryYears(m).forEach(year => years.add(year)));

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

      if (input.checked) selectedYears.add(year);
      else selectedYears.delete(year);

      drawMarkers();
    });
  });
}

function setupControls() {
  document.getElementById("showElders").addEventListener("change", drawMarkers);
  document.getElementById("showSisters").addEventListener("change", drawMarkers);
  document.getElementById("showCurrent").addEventListener("change", drawMarkers);
  document.getElementById("showInLaws").addEventListener("change", drawMarkers);
  document.getElementById("familyFilter").addEventListener("change", drawMarkers);

  document.getElementById("searchInput").addEventListener("input", e => {
    activeSearch = e.target.value;
    drawMarkers();
  });

  document.getElementById("clearYears").addEventListener("click", () => {
    selectedYears.clear();
    document.querySelectorAll("#yearCheckboxes input").forEach(input => {
      input.checked = false;
    });
    drawMarkers();
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("menuPanel").classList.remove("hidden-panel");
    document.getElementById("menuToggle").style.display = "none";
  });

  document.getElementById("menuClose").addEventListener("click", () => {
    document.getElementById("menuPanel").classList.add("hidden-panel");
    document.getElementById("menuToggle").style.display = "block";
  });

  document.getElementById("statsToggle").addEventListener("click", () => {
    document.getElementById("statsPanel").classList.remove("hidden-panel");
    document.getElementById("statsToggle").style.display = "none";
  });

  document.getElementById("statsClose").addEventListener("click", () => {
    document.getElementById("statsPanel").classList.add("hidden-panel");
    document.getElementById("statsToggle").style.display = "block";
  });

  document.getElementById("menuToggle").style.display = "none";
  document.getElementById("statsToggle").style.display = "none";
}

async function buildMap() {
  const missionaries = await loadSheet(MISSIONARY_SHEET_NAME);
  const coordinates = await loadSheet(COORDINATES_SHEET_NAME);

  const coordLookup = {};

  coordinates.forEach(row => {
    const missionName = getMissionName(row);
    const lat = Number(getValue(row, ["Latitude", "Lat"]));
    const lng = Number(getValue(row, ["Longitude", "Long", "Lng"]));

    if (!missionName || isNaN(lat) || isNaN(lng)) return;

    coordLookup[normalize(missionName)] = { lat, lng };
  });

  allMissionaries = missionaries.map(m => {
    const missionName = getMissionName(m);
    const coords = coordLookup[normalize(missionName)] || null;

    if (!coords) {
      console.warn("No coordinates found for mission:", missionName);
    }

    return { ...m, coords };
  });

  buildYearCheckboxes();
  setupControls();
  drawMarkers();
}

buildMap();
