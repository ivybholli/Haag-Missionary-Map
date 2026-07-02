// ============================
// 1. CREATE MAP
// ============================

const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);


// ============================
// 2. GOOGLE SHEET (optional later)
// ============================
// const SHEET_URL = "PASTE YOUR SHEET HERE";


// ============================
// 3. GEOCODING
// ============================

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


// ============================
// 4. HELPERS
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
// 5. DATA (KEEP ONLY ONE COPY)
// ============================

const missionaries = [
  {
    name: "Dawn Hollingsworth",
    sex: "Female",
    mission: "Maryland Baltimore",
    city: "Baltimore",
    state: "MD",
    country: "USA",
    languages: "English",
    start: "01/2019",
    end: "12/2020",
    president: "President Smith",
    spouse: "N/A"
  }
];


// ============================
// 6. BUILD MAP (GEOCODE + DRAW)
// ============================

async function buildMap() {

  for (let m of missionaries) {

    const location = `${m.city}, ${m.state || ""}, ${m.country}`;

    const coords = await geocode(location);

    if (!coords) continue;

    m.lat = coords.lat;
    m.lng = coords.lng;

    const color = getColor(m.sex);
    const title = getTitle(m.sex, m.name);

    L.circleMarker([m.lat, m.lng], {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    })
    .addTo(map)
    .bindPopup(`
      <b>${title}</b><br><br>
      <b>Mission:</b> ${m.mission}<br><br>
      <b>Service:</b> ${m.start} – ${m.end}<br><br>
      <b>President:</b> ${m.president}<br><br>
      <b>Languages:</b> ${m.languages}<br><br>
      <b>Spouse:</b> ${m.spouse}
    `);

    await new Promise(r => setTimeout(r, 1000)); // avoid rate limits
  }
}


// ============================
// 7. START APP
// ============================

buildMap();
