// 1. Create the map
const map = L.map('map').setView([20, 0], 2);

// 2. Add a muted world map layer
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap & CartoDB'
}).addTo(map);
