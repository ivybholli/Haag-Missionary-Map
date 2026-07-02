// MAP
const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);

// GEOCODE
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

// HELPERS
function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getTitle(sex, name) {
  return sex === "Female"
    ? `Sister ${name}`
    : `Elder ${name}`;
}

// DATA
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w/gviz/tq?tqx=out:csv";

async function loadSheet() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  return parseCSV(text);
}

function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");
    let obj = {};

    headers.forEach((h, i) => {
      obj[h.trim()] = values[i];
    });

    return obj;
  });
}

// BUILD MAP
async function buildMap() {

  const data = await loadSheet();

  for (let m of data) {

    const location = `${m["Mission City"]}, ${m["Mission Country"]}`;

    const coords = await geocode(location);
    if (!coords) continue;

    const sex = m["Biological Sex"];
    const name = m["Missionary Name (First Last) (e.g., Dawn Hollingsworth)"];

    const color = getColor(sex);
    const title = getTitle(sex, name);

    L.circleMarker([coords.lat, coords.lng], {
      radius: 6,
      color,
      fillColor: color,
      fillOpacity: 0.85
    })
    .addTo(map)
    .bindPopup(`
      <b>${title}</b><br>
      ${m["Official Mission name (Ex: Maryland Baltimore)"]}<br>
      ${m["Start Date (MM/YYYY)"]} – ${m["End Date (MM/YYYY)"]}
    `);

    await new Promise(r => setTimeout(r, 1000));
  }
}

buildMap();
