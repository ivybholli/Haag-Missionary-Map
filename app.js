// ============================
// 1. MAP SETUP
// ============================

const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);


// ============================
// 2. GOOGLE SHEET URL
// ============================

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w/gviz/tq?tqx=out:csv";


// ============================
// 3. FETCH SHEET DATA
// ============================

async function loadSheet() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  return parseCSV(text);
}


// ============================
// 4. CSV PARSER
// ============================

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


// ============================
// 5. GEOCODING (CITY → LAT/LNG)
// ============================

async function geocode(location) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) return null;

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}


// ============================
// 6. COLOR + LABEL RULES
// ============================

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getTitle(sex, name) {
  return sex === "Female"
    ? `Sister ${name}`
    : `Elder ${name}`;
}


// ============================
// 7. BUILD MAP FROM SHEET
// ============================

async function buildMap() {

  const data = await loadSheet();

  for (let m of data) {

    const city = m["Mission City"];
    const country = m["Mission Country"];

    if (!city || !country) continue;

    const location = `${city}, ${country}`;

    const coords = await geocode(location);

    if (!coords) continue;

    const sex = m["Biological Sex"];
    const name = m["Missionary Name (First Last) (e.g., Dawn Hollingsworth)"];

    const title = getTitle(sex, name);
    const color = getColor(sex);

    const popup = `
      <div style="font-family: Arial; min-width:220px">

        <h3 style="margin:0">
          ${title}
        </h3>

        <hr>

        <b>Mission:</b><br>
        ${m["Official Mission name (Ex: Maryland Baltimore)"]}<br><br>

        <b>Location:</b><br>
        ${m["Mission City"]}, ${m["Mission State"]}, ${m["Mission Country"]}<br><br>

        <b>Languages:</b><br>
        ${m["Assigned Language(s)"] || ""}<br><br>

        <b>Service Dates:</b><br>
        ${m["Start Date (MM/YYYY)"]} – ${m["End Date (MM/YYYY)"]}<br><br>

        <b>Mission President:</b><br>
        ${m["Mission President Names (Ex: President and Sister Piros; President and Sister Varner)"]}<br><br>

        <b>Spouse:</b><br>
        ${m["Your Spouse's Name (If Applicable)"] || "N/A"}

      </div>
    `;

    L.circleMarker([coords.lat, coords.lng], {
      radius: 6,
      color: color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    })
      .addTo(map)
      .bindPopup(popup);

    // prevent API overload
    await new Promise(r => setTimeout(r, 1000));
  }
}


// ============================
// 8. START APP
// ============================

buildMap();
