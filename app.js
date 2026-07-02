// 1. CREATE MAP
const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);
async function geocode(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.length) {
    console.log("Not found:", location);
    return null;
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
}
function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getTitle(sex, name) {
  return sex === "Female"
    ? `Sister ${name}`
    : `Elder ${name}`;
}
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
async function buildAndRender() {

  for (let m of missionaries) {

    const location = `${m.city}, ${m.state || ""}, ${m.country}`;

    const coords = await geocode(location);

    if (coords) {
      m.lat = coords.lat;
      m.lng = coords.lng;
    }

    await new Promise(r => setTimeout(r, 1000)); // prevent blocking
  }

  drawMarkers();
}
function drawMarkers() {

  missionaries.forEach(m => {

    if (!m.lat || !m.lng) return;

    const color = getColor(m.sex);
    const title = getTitle(m.sex, m.name);

    L.circleMarker([m.lat, m.lng], {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.85
    })
    .addTo(map)
    .bindPopup(`
      <b>${title}</b><br>
      ${m.mission}<br><br>
      ${m.start} – ${m.end}
    `);

  });

}


// 2. COLOR + TITLE RULES
function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function getTitle(sex, name) {
  return sex === "Female"
    ? `Sister ${name}`
    : `Elder ${name}`;
}



// 3. DATA (TEMPORARY - will later come from Google Sheets)
const missionaries = [
  {
    name: "Dawn Hollingsworth",
    sex: "Female",
    mission: "Maryland Baltimore",
    city: "Baltimore",
    country: "USA",
    languages: "English",
    start: "01/2019",
    end: "12/2020",
    president: "President and Sister Smith",
    spouse: "N/A",
    lat: 39.2904,
    lng: -76.6122
  }
];



// 4. ADD MARKERS TO MAP
missionaries.forEach(m => {

  const color = getColor(m.sex);
  const title = getTitle(m.sex, m.name);

  const marker = L.circleMarker([m.lat, m.lng], {
    radius: 7,
    color: color,
    fillColor: color,
    fillOpacity: 0.85,
    weight: 2
  }).addTo(map);

  marker.bindPopup(`
    <div style="font-family: Arial; min-width: 220px">

      <h3 style="margin:0">
        ${title}
      </h3>

      <hr>

      <b>Mission:</b><br>
      ${m.mission}<br><br>

      <b>Service Dates:</b><br>
      ${m.start} – ${m.end}<br><br>

      <b>Mission President:</b><br>
      ${m.president}<br><br>

      <b>Languages:</b><br>
      ${m.languages}<br><br>

      <b>Spouse:</b><br>
      ${m.spouse}

    </div>
  `);
  buildAndRender();

});
