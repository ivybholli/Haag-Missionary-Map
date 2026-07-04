console.log("🔥 APP.JS LOADED");

const SHEET_ID = "15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w";

const MISSIONARY_SHEET_NAME = "Form Responses 1";
const COORDINATES_SHEET_NAME = "Coordinates";

const map = L.map("map", {
  zoomControl: true
}).setView([20, 0], 2);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Tiles © Esri"
  }
).addTo(map);

let allMissionaries = [];
let allMarkers = [];

const TITLE_BY_LANGUAGE = {
  English: { elder: "Elder", sister: "Sister" },
  Spanish: { elder: "Élder", sister: "Hermana" },
  Italian: { elder: "Anziano", sister: "Sorella" },
  French: { elder: "Aîné", sister: "Sœur" },
  German: { elder: "Ältester", sister: "Schwester" },
  Portuguese: { elder: "Élder", sister: "Irmã" },
  Danish: { elder: "Ældste", sister: "Søster" }
};

const COUNTRY_CODES = {
  "United States": "us",
  USA: "us",
  Brazil: "br",
  Italy: "it",
  Denmark: "dk",
  Germany: "de",
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

const CONTINENTS = {
  "United States": "North America",
  USA: "North America",
  Canada: "North America",
  Mexico: "North America",
  Brazil: "South America",
  Argentina: "South America",
  Chile: "South America",
  Peru: "South America",
  Colombia: "South America",
  Italy: "Europe",
  Denmark: "Europe",
  Germany: "Europe",
  France: "Europe",
  Spain: "Europe",
  England: "Europe",
  "United Kingdom": "Europe",
  Philippines: "Asia",
  Japan: "Asia",
  Australia: "Oceania",
  "New Zealand": "Oceania"
};

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function loadSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substring(47).slice(0, -2));

  const cols = json.table.cols.map(c => c.label);

  return json.table.rows.map(row => {
    const obj = {};
    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });
    return obj;
  });
}

function coordKey(city, state, country) {
  return `${normalize(city)}|${normalize(state)}|${normalize(country)}`;
}

function getTitle(sex, name, language) {
  const firstLanguage = String(language || "English").split(",")[0].trim();
  const titles = TITLE_BY_LANGUAGE[firstLanguage] || TITLE_BY_LANGUAGE.English;
  const prefix = sex === "Female" ? titles.sister : titles.elder;
  return `${prefix} ${name || ""}`;
}

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function parseMissionEndDate(value) {
  if (!value) return null;

  const text = String(value).trim();
  const parts = text.split("/");

  if (parts.length !== 2) return null;

  const month = Number(parts[0]);
  const year = Number(parts[1]);

  if (!month || !year) return null;

  return new Date(year, month, 0);
}

function isCurrentlyServing(m) {
  const endDate = parseMissionEndDate(m["End Date (MM/YYYY)"]);
  if (!endDate) return false;
  return endDate >= new Date();
}

function isInLaw(m) {
  const relationship = m["What is your relationship to Elva and Darrell?"];
  return normalize(relationship).includes("in-law");
}

function getMarkerShape(m) {
  if (isInLaw(m)) return "heart";
  if (isCurrentlyServing(m)) return "star";
  return "circle";
}

function createIcon(shape, color) {
  let svgShape;

  if (shape === "star") {
    svgShape = `<path d="M12 2 L15 8.5 L22 9.2 L16.7 14 L18.2 21 L12 17.3 L5.8 21 L7.3 14 L2 9.2 L9 8.5 Z" />`;
  } else if (shape === "heart") {
    svgShape = `<path d="M12 21 C7.5 17.1 3 14.1 3 8.7 C3 5.6 5.4 3.5 8.1 3.5 C9.8 3.5 11.1 4.4 12 5.7 C12.9 4.4 14.2 3.5 15.9 3.5 C18.6 3.5 21 5.6 21 8.7 C21 14.1 16.5 17.1 12 21 Z" />`;
  } else {
    svgShape = `<circle cx="12" cy="12" r="8" />`;
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <svg width="28" height="28" viewBox="0 0 24 24">
        <g fill="${color}" stroke="white" stroke-width="2">
          ${svgShape}
        </g>
      </svg>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
}

function getFlagImage(country, state) {
  const code = COUNTRY_CODES[country];

  if (!code) {
    return `<div class="flag-placeholder">🌍</div>`;
  }

  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${country} flag">`;
}

function showInfoCard(m) {
  const name = m["Missionary Name (First Last) (e.g., Dawn Hollingsworth)"];
  const sex = m["Biological Sex"];
  const language = m["Assigned Language(s)"];
  const mission = m["Official Mission name (Ex: Maryland Baltimore)"];
  const country = m["Mission Country"];
  const state = m["Mission State"];
  const start = m["Start Date (MM/YYYY)"];
  const end = m["End Date (MM/YYYY)"];
  const presidents = m["Mission President Names (Ex: President and Sister Piros; President and Sister Varner)"];
  const spouse = m["Your Spouse's Name (If Applicable)"];

  document.getElementById("infoCardContent").innerHTML = `
    <h2>${getTitle(sex, name, language)}</h2>

    <div class="card-divider"></div>

    <div class="card-location-small">
      ${getFlagImage(country, state)}
      <div class="card-mission">${mission || ""}</div>
    </div>

    <div class="card-dates">${start || ""} – ${end || ""}</div>

    ${presidents ? `<div class="card-presidents">${presidents}</div>` : ""}

    ${spouse ? `<div class="card-spouse">Married to ${spouse}</div>` : ""}
  `;

  document.getElementById("infoCard").classList.remove("hidden");
}

function matchesFamily(m) {
  const selected = document.getElementById("familyFilter").value;
  if (selected === "all") return true;

  const relation = m["Who is your Haag relation?"];
  return normalize(relation).includes(normalize(selected));
}

function matchesSex(m) {
  const showElders = document.getElementById("showElders").checked;
  const showSisters = document.getElementById("showSisters").checked;

  return m["Biological Sex"] === "Female" ? showSisters : showElders;
}

function getFilteredData() {
  return allMissionaries.filter(m => matchesFamily(m) && matchesSex(m));
}

function updateStats(data) {
  document.getElementById("totalMissionaries").textContent = data.length;

  document.getElementById("totalElders").textContent =
    data.filter(m => m["Biological Sex"] !== "Female").length;

  document.getElementById("totalSisters").textContent =
    data.filter(m => m["Biological Sex"] === "Female").length;

  const countries = new Set(data.map(m => m["Mission Country"]).filter(Boolean));

  const languages = new Set();
  data.forEach(m => {
    String(m["Assigned Language(s)"] || "")
      .split(/,|;/)
      .map(x => x.trim())
      .filter(Boolean)
      .forEach(lang => languages.add(lang));
  });

  const continents = new Set(
    data.map(m => CONTINENTS[m["Mission Country"]]).filter(Boolean)
  );

  document.getElementById("countriesServed").textContent = countries.size;
  document.getElementById("totalLanguages").textContent = languages.size;
  document.getElementById("totalContinents").textContent = continents.size;
}

function clearMarkers() {
  allMarkers.forEach(marker => map.removeLayer(marker));
  allMarkers = [];
}

function drawMarkers() {
  clearMarkers();

  const data = getFilteredData();
  updateStats(data);

  const bounds = [];

  data.forEach(m => {
    if (!m.coords) return;

    const marker = L.marker([m.coords.lat, m.coords.lng], {
      icon: createIcon(getMarkerShape(m), getColor(m["Biological Sex"]))
    }).addTo(map);

    marker.on("mouseover", () => showInfoCard(m));
    marker.on("click", () => {
      showInfoCard(m);
      map.panTo([m.coords.lat, m.coords.lng]);
    });

    allMarkers.push(marker);
    bounds.push([m.coords.lat, m.coords.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, {
      padding: [70, 70],
      maxZoom: 5
    });
  }
}

async function buildMap() {
  const missionaries = await loadSheet(MISSIONARY_SHEET_NAME);
  const coordinates = await loadSheet(COORDINATES_SHEET_NAME);

  const coordLookup = {};

  coordinates.forEach(row => {
    const key = coordKey(row["City"], row["State/Region"], row["Country"]);

    coordLookup[key] = {
      lat: Number(row["Latitude"]),
      lng: Number(row["Longitude"])
    };
  });

  allMissionaries = missionaries.map(m => {
    const key = coordKey(
      m["Mission City"],
      m["Mission State"],
      m["Mission Country"]
    );

    return {
      ...m,
      coords: coordLookup[key] || null
    };
  });

  drawMarkers();
}

document.getElementById("showElders").addEventListener("change", drawMarkers);
document.getElementById("showSisters").addEventListener("change", drawMarkers);
document.getElementById("familyFilter").addEventListener("change", drawMarkers);

document.getElementById("closeCard").addEventListener("click", () => {
  document.getElementById("infoCard").classList.add("hidden");
});

buildMap();
