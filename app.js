console.log("🔥 APP.JS LOADED");

// =====================
// MAP SETUP
// =====================

const map = L.map("map").setView([20, 0], 2);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    attribution: "© OpenStreetMap & CartoDB"
  }
).addTo(map);

const allMarkers = [];

// =====================
// LANGUAGE TITLES
// =====================

const TITLE_BY_LANGUAGE = {
  English: { elder: "Elder", sister: "Sister" },
  Spanish: { elder: "Élder", sister: "Hermana" },
  Italian: { elder: "Anziano", sister: "Sorella" },
  French: { elder: "Aîné", sister: "Sœur" },
  German: { elder: "Ältester", sister: "Schwester" },
  Portuguese: { elder: "Élder", sister: "Irmã" },
  Japanese: { elder: "Elder", sister: "Sister" }
};

function getTitle(sex, name, language) {
  const cleanLanguage = (language || "English").split(",")[0].trim();
  const lang = TITLE_BY_LANGUAGE[cleanLanguage] || TITLE_BY_LANGUAGE.English;

  const prefix = sex === "Female" ? lang.sister : lang.elder;
  return `${prefix} ${name}`;
}

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getFlagEmoji(country) {
  const flags = {
    Italy: "🇮🇹",
    "United States": "🇺🇸",
    USA: "🇺🇸",
    Mexico: "🇲🇽",
    Brazil: "🇧🇷",
    France: "🇫🇷",
    Germany: "🇩🇪",
    Spain: "🇪🇸",
    Japan: "🇯🇵",
    Canada: "🇨🇦",
    England: "🇬🇧",
    "United Kingdom": "🇬🇧",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    Peru: "🇵🇪",
    Colombia: "🇨🇴",
    Philippines: "🇵🇭",
    Australia: "🇦🇺",
    "New Zealand": "🇳🇿"
  };

  return flags[country] || "🌍";
}

function shouldShowSpouse(relation) {
  return (relation || "").toLowerCase().includes("in-law");
}

// =====================
// GEOCODE
// =====================

async function geocode(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}

// =====================
// GOOGLE SHEET
// =====================

async function loadSheet() {
  const url =
    "https://docs.google.com/spreadsheets/d/15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w/gviz/tq?tqx=out:json";

  const res = await fetch(url);
  const text = await res.text();

  const json = JSON.parse(text.substring(47).slice(0, -2));
  const cols = json.table.cols.map(c => c.label);

  return json.table.rows.map(row => {
    let obj = {};

    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });

    return obj;
  });
}

// =====================
// BUILD MAP
// =====================

async function buildMap() {
  const data = await loadSheet();

  console.log("RAW DATA LENGTH:", data.length);
  console.log("FIRST ROW:", data[0]);

  updateStats(data);

  for (let m of data) {
    const city = m["Mission City"];
    const country = m["Mission Country"];

    if (!city || !country) continue;

    const location = `${city}, ${country}`;
    const coords = await geocode(location);

    if (!coords) {
      console.log("GEOCODE FAILED:", location);
      continue;
    }

    const sex = m["Biological Sex"];
    const name = m["Missionary Name (First Last) (e.g., Dawn Hollingsworth)"];
    const language = m["Assigned Language(s)"];

    const title = getTitle(sex, name, language);
    const color = getColor(sex);
    const flag = getFlagEmoji(country);

    const spouse = m["Your Spouse's Name (If Applicable)"];
    const relation = m["Who is your Haag relation?"];

    const spouseLine =
      shouldShowSpouse(relation) && spouse
        ? `<div class="popup-spouse">Spouse: ${spouse}</div>`
        : "";

    const marker = L.circleMarker([coords.lat, coords.lng], {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    }).addTo(map);

    marker.bindPopup(`
      <div class="mission-popup">

        <h2>${title}</h2>

        <div class="popup-divider"></div>

        <div class="popup-location">
          <span class="popup-flag">${flag}</span>
          <div>
            <div class="popup-country">${country}</div>
            <div class="popup-city">${city}</div>
          </div>
        </div>

        <div class="popup-divider"></div>

        <div class="popup-dates">
          ${m["Start Date (MM/YYYY)"] || ""} – ${m["End Date (MM/YYYY)"] || ""}
        </div>

        ${spouseLine}

      </div>
    `);

    allMarkers.push({ marker, sex });

    await new Promise(r => setTimeout(r, 300));
  }
}

// =====================
// STATS
// =====================

function updateStats(data) {
  document.getElementById("totalMissionaries").textContent = data.length;

  const countries = new Set(
    data
      .map(m => m["Mission Country"])
      .filter(Boolean)
  );

  document.getElementById("countriesServed").textContent = countries.size;
}

// =====================
// FILTERS
// =====================

function applyFilters() {
  const showElders = document.getElementById("showElders").checked;
  const showSisters = document.getElementById("showSisters").checked;

  allMarkers.forEach(item => {
    const isFemale = item.sex === "Female";
    const shouldShow = isFemale ? showSisters : showElders;

    if (shouldShow) {
      item.marker.addTo(map);
    } else {
      map.removeLayer(item.marker);
    }
  });
}

document.getElementById("showElders").addEventListener("change", applyFilters);
document.getElementById("showSisters").addEventListener("change", applyFilters);

// =====================
// START
// =====================

buildMap();
