console.log("🔥 APP.JS LOADED");

// =====================
// MAP SETUP
// =====================

const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);


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
// HELPERS
// =====================

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getTitle(sex, name) {
  return sex === "Female"
    ? `Sister ${name}`
    : `Elder ${name}`;
}


// =====================
// GOOGLE SHEET
// =====================

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w/gviz/tq?tqx=out:csv";

async function loadSheet() {

  const url =
    "https://docs.google.com/spreadsheets/d/15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w/gviz/tq?tqx=out:json";

  const res = await fetch(url);
  const text = await res.text();

  // clean Google wrapper
  const json = JSON.parse(
    text.substring(47).slice(0, -2)
  );

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
// CSV PARSER
// =====================

function parseCSV(csv) {
  const lines = csv.trim().split("\n");

  const headers = lines[0]
    .split(",")
    .map(h => h.replace(/"/g, "").trim());

  return lines.slice(1).map(line => {

    const values = line
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map(v => v.replace(/"/g, "").trim());

    let obj = {};

    headers.forEach((h, i) => {
      obj[h] = values[i];
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

 for (let m of data) {

  // 🔥 ADD THIS FIRST (inspect the row)
  console.log("ROW OBJECT:", m);
  console.log("ROW KEYS:", Object.keys(m));

  // 🔥 ADD THIS SECOND (check actual values)
  console.log("CITY:", m["Mission City"]);
  console.log("COUNTRY:", m["Mission Country"]);

for (let m of data) {

  // 🔥 ADD THIS FIRST (inspect the row)
  console.log("ROW OBJECT:", m);
  console.log("ROW KEYS:", Object.keys(m));

  // 🔥 ADD THIS SECOND (check actual values)
  console.log("CITY:", m["Mission City"]);
  console.log("COUNTRY:", m["Mission Country"]);

  if (!m["Mission City"] || !m["Mission Country"]) {
    console.log("SKIPPED ROW (missing city/country)");
    continue;
  }

  const location = `${m["Mission City"]}, ${m["Mission Country"]}`;

  console.log("LOCATION STRING:", location);

  const coords = await geocode(location);

  console.log("COORDS:", coords);

  if (!coords) {
    console.log("GEOCODE FAILED:", location);
    continue;
  }

  L.circleMarker([coords.lat, coords.lng], {
    radius: 6,
    color: "red"
  }).addTo(map);
}

  L.circleMarker([coords.lat, coords.lng], {
    radius: 6,
    color: "red"
  }).addTo(map);
}


// =====================
// START APP
// =====================

buildMap();
