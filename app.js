// 1. CREATE MAP
const map = L.map('map').setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '&copy; OpenStreetMap & CartoDB'
  }
).addTo(map);



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

});
