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

// BUILD MAP
async function buildMap() {

  for (let m of missionaries) {

    const location = `${m.city}, ${m.state || ""}, ${m.country}`;

    const coords = await geocode(location);

    if (!coords) continue;

    const color = getColor(m.sex);
    const title = getTitle(m.sex, m.name);

    L.circleMarker([coords.lat, coords.lng], {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.85,
      weight: 2
    })
    .addTo(map)
    .bindPopup(`<b>${title}</b><br>${m.mission}`);

    await new Promise(r => setTimeout(r, 1000));
  }
}

buildMap();
