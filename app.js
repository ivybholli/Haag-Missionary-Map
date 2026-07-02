// ============================
// 1. CREATE MAP
// ============================
const map = L.map('map').setView([20, 0], 2);

// ============================
// 2. ADD TILE LAYER (BASE MAP)
// ============================
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ============================
// 3. SAMPLE DATA (replace later with Google Sheets)
// ============================
const missionaries = [
  {
    name: "Elder Smith",
    lat: 19.4326,
    lng: -99.1332,
    mission: "Mexico City"
  },
  {
    name: "Sister Johnson",
    lat: -23.5505,
    lng: -46.6333,
    mission: "São Paulo"
  },
  {
    name: "Elder Lee",
    lat: 35.6762,
    lng: 139.6503,
    mission: "Tokyo"
  }
];

// ============================
// 4. ADD MARKERS
// ============================
missionaries.forEach(m => {
  L.marker([m.lat, m.lng])
    .addTo(map)
    .bindPopup(`
      <b>${m.name}</b><br/>
      Mission: ${m.mission}
    `);
});
