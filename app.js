console.log("🔥 HAAG FAMILY MISSIONARY MAP v4 LOADED");

const SHEET_ID = "15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w";
const MISSIONARY_SHEET_NAME = "Form Responses 1";
const COORDINATES_SHEET_NAME = "Coordinates";

let allMissionaries = [];
let allMarkers = [];
let selectedYears = new Set();
let activeSearch = "";
let selectedCountryForStats = "";
let searchNavigationTimer = null;

const GOOGLE_EARTH_STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery © Esri"
    },
    labels: {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Labels © Esri"
    }
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.82 } }
  ],
  sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] }
};

const map = new maplibregl.Map({
  container: "map",
  style: GOOGLE_EARTH_STYLE,
  center: [0, 25],
  zoom: 1.25,
  minZoom: 0,
  maxZoom: 18,
  projection: "globe",
  attributionControl: true
});

map.addControl(new maplibregl.NavigationControl({ showCompass: false, showZoom: true, visualizePitch: false }), "bottom-right");
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
let currentPopup = null;

const COUNTRY_VIEWS = {
  "united states": { center: [-98.5795, 39.8283], zoom: 3.2 },
  "usa": { center: [-98.5795, 39.8283], zoom: 3.2 },
  "us": { center: [-98.5795, 39.8283], zoom: 3.2 },
  "brazil": { center: [-51.9253, -14.2350], zoom: 3.7 },
  "denmark": { center: [10.0, 56.0], zoom: 5.7 },
  "germany": { center: [10.4515, 51.1657], zoom: 4.9 },
  "italy": { center: [12.5674, 41.8719], zoom: 4.8 },
  "france": { center: [2.2137, 46.2276], zoom: 4.7 },
  "spain": { center: [-3.7492, 40.4637], zoom: 4.7 },
  "mexico": { center: [-102.5528, 23.6345], zoom: 4.2 },
  "canada": { center: [-106.3468, 56.1304], zoom: 3.0 },
  "england": { center: [-1.1743, 52.3555], zoom: 5.2 },
  "united kingdom": { center: [-3.4360, 55.3781], zoom: 4.6 },
  "argentina": { center: [-63.6167, -38.4161], zoom: 3.7 },
  "chile": { center: [-71.5430, -35.6751], zoom: 3.8 },
  "peru": { center: [-75.0152, -9.1900], zoom: 4.3 },
  "colombia": { center: [-74.2973, 4.5709], zoom: 4.5 },
  "philippines": { center: [121.7740, 12.8797], zoom: 4.8 },
  "japan": { center: [138.2529, 36.2048], zoom: 4.4 },
  "australia": { center: [133.7751, -25.2744], zoom: 3.5 },
  "new zealand": { center: [174.8860, -40.9006], zoom: 4.8 }
};

const CONTINENTS = {"United States":"North America",USA:"North America",US:"North America",Brazil:"South America",Denmark:"Europe",Germany:"Europe",Italy:"Europe",France:"Europe",Spain:"Europe",Mexico:"North America",Canada:"North America",England:"Europe","United Kingdom":"Europe",Argentina:"South America",Chile:"South America",Peru:"South America",Colombia:"South America",Philippines:"Asia",Japan:"Asia",Australia:"Oceania","New Zealand":"Oceania"};

function normalize(v){return String(v||"").replace(/\s+/g," ").trim().toLowerCase();}
function normalizeNoAccent(v){return normalize(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function cleanHeader(v){return String(v||"").replace(/\s+/g," ").trim();}
function getValue(row,names){for(const n of names){if(row[n]!==undefined&&row[n]!=="")return row[n];}const keys=Object.keys(row);for(const n of names){const k=keys.find(x=>normalize(x)===normalize(n));if(k&&row[k]!=="")return row[k];}return "";}
async function loadSheet(sheetName){const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;const res=await fetch(url);const text=await res.text();const json=JSON.parse(text.substring(47).slice(0,-2));const cols=json.table.cols.map(c=>cleanHeader(c.label));return json.table.rows.map(row=>{const obj={};row.c.forEach((cell,i)=>{obj[cols[i]]=cell?cell.v:""});return obj;});}

function getName(m){return getValue(m,["Missionary Name (First Last) (e.g., Dawn Hollingsworth)","Missionary Name (First Last)","Missionary Name","Name"])}
function getSex(m){return getValue(m,["Biological Sex","Sex","Gender"])}
function getRelation(m){return getValue(m,["Who is your Haag relation?","Haag relation","Relation"])}
function getRelationship(m){return getValue(m,["What is your relationship to Elva and Darrell?","Relationship to Elva and Darrell"])}
function getMissionName(m){return getValue(m,["Official Mission name (Ex: Maryland Baltimore)","Official Mission Name","Official Mission name","Mission Name"])}
function getCity(m){return getValue(m,["City","Mission City"])}
function getState(m){return getValue(m,["State/Region","State","Mission State"])}
function getCountry(m){return getValue(m,["Country","Mission Country"])}
function getLanguage(m){return getValue(m,["Assigned Language(s)","Assigned Languages","Language","Languages"])}
function getStartDate(m){return getValue(m,["Start Date (MM/YYYY)","Start Date"])}
function getEndDate(m){return getValue(m,["End Date (MM/YYYY)","End Date"])}
function getPresidents(m){return getValue(m,["Mission President Names (Ex: President and Sister Piros; President and Sister Varner)","Mission President Names","Mission Presidents"])}
function getSpouse(m){return getValue(m,["Your Spouse's Name (Maiden Name) (If Applicable)","Your Spouse's Name (If Applicable)","Spouse","Spouse Name"])}
function getMissionType(m){return getValue(m,["Type of Mission","Mission Type","Type of mission","Mission type"])}

function getTitle(sex,name,language){if(sex!=="Female")return `Elder ${name||""}`;const first=String(language||"English").split(",")[0].trim();const sister={Spanish:"Hermana",Italian:"Sorella",French:"Sœur"};return `${sister[first]||"Sister"} ${name||""}`;}
function getColor(sex){return sex==="Female"?"#ec4899":"#2563eb";}
function isInLaw(m){return normalize(getRelationship(m)).includes("in-law");}
function parseMonthYear(v){if(!v)return null;const p=String(v).trim().split("/");if(p.length!==2)return null;const month=Number(p[0]),year=Number(p[1]);if(!month||!year||month<1||month>12)return null;return {month,year};}
function formatMissionDate(v){const p=parseMonthYear(v);if(!p)return v||"";const months=["January","February","March","April","May","June","July","August","September","October","November","December"];return `${months[p.month-1]} ${p.year}`;}
function isCurrentlyServing(m){const e=parseMonthYear(getEndDate(m));if(!e)return false;return new Date(e.year,e.month,0)>=new Date();}
function missionLength(start,end){const s=parseMonthYear(start),e=parseMonthYear(end);if(!s||!e)return "";const months=(e.year-s.year)*12+(e.month-s.month)+1;return `${months} month${months===1?"":"s"}`;}
function formatMissionDates(m){const s=getStartDate(m),e=getEndDate(m);if(isCurrentlyServing(m))return `<div class="card-date-main">${formatMissionDate(s)} – Present</div><div class="currently-serving">✓ Currently Serving</div>`;return `<div class="card-date-main">${formatMissionDate(s)} – ${formatMissionDate(e)}</div><div class="mission-length">${missionLength(s,e)}</div>`;}
function formatPresidents(t){return String(t||"").split(";").map(x=>x.trim()).filter(Boolean).join("<br>");}
function missionaryYears(m){const s=parseMonthYear(getStartDate(m)),e=parseMonthYear(getEndDate(m));if(!s||!e)return [];const arr=[];for(let y=s.year;y<=e.year;y++)arr.push(y);return arr;}

function escapeHtml(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function escapeAttr(v){return escapeHtml(v);}
function isOriginalAssignment(m){const t=normalize(getMissionType(m));return !t || t.includes("original");}
function shouldShowMissionType(m){return getMissionType(m) && !isOriginalAssignment(m);}
function findSpouseMissionary(m){const spouseName=normalize(getSpouse(m));if(!spouseName)return null;return allMissionaries.find(x=>normalize(getName(x))===spouseName&&x.coords);}
function findOriginalAssignment(m){const name=normalize(getName(m));return allMissionaries.find(x=>x!==m&&normalize(getName(x))===name&&isOriginalAssignment(x)&&x.coords)||allMissionaries.find(x=>normalize(getName(x))===name&&isOriginalAssignment(x)&&x.coords);}
function findAdditionalAssignments(m){const name=normalize(getName(m));return allMissionaries.filter(x=>x!==m&&normalize(getName(x))===name&&!isOriginalAssignment(x)&&x.coords);}
function makeMissionLink(m,label,extraClass=""){return `<a href="#" class="mission-jump-link ${extraClass}" data-name="${escapeAttr(getName(m))}" data-mission="${escapeAttr(getMissionName(m))}" data-type="${escapeAttr(getMissionType(m))}">${escapeHtml(label)}</a>`;}
function findMissionaryFromDataset(ds){return allMissionaries.find(m=>normalize(getName(m))===normalize(ds.name)&&normalize(getMissionName(m))===normalize(ds.mission)&&normalize(getMissionType(m))===normalize(ds.type))||allMissionaries.find(m=>normalize(getName(m))===normalize(ds.name)&&normalize(getMissionName(m))===normalize(ds.mission));}
function findMarkerForMissionary(m){return allMarkers.find(marker=>marker.missionaryGroup&&marker.missionaryGroup.includes(m));}
function pulseMarker(marker){if(!marker)return;const el=marker.getElement();if(!el)return;const inner=el.querySelector(".mission-marker");if(!inner)return;inner.classList.remove("pulse-marker");void inner.offsetWidth;inner.classList.add("pulse-marker");setTimeout(()=>inner.classList.remove("pulse-marker"),1400);}
function jumpToMissionary(m){if(!m||!m.coords)return;hideDetailPreview();if(currentPopup){currentPopup.remove();currentPopup=null;}map.flyTo({center:[m.coords.lng,m.coords.lat],zoom:Math.max(map.getZoom(),6),duration:1400,essential:true});setTimeout(()=>{const marker=findMarkerForMissionary(m);if(!marker)return;pulseMarker(marker);openMarkerPopup(marker,marker.missionaryGroup||[m]);if(marker.missionaryGroup&&marker.missionaryGroup.length>1){setTimeout(()=>{const popupEl=currentPopup&&currentPopup.getElement();const idx=marker.missionaryGroup.indexOf(m);const btn=popupEl&&popupEl.querySelector(`.missionary-list-item[data-index="${idx}"]`);if(btn){btn.classList.add("active");showDetailPreview(m,btn);}},180);}},950);}
function missionMetaHtml(m){const lang=getLanguage(m);const pieces=[];if(lang)pieces.push(escapeHtml(lang));if(shouldShowMissionType(m))pieces.push(`<span class="mission-type-pill">${escapeHtml(getMissionType(m))}</span>`);return pieces.length?`<div class="popup-language mission-meta">${pieces.join('<span class="meta-separator">•</span>')}</div>`:"";}
function assignmentLinksHtml(m){if(!isOriginalAssignment(m)){const original=findOriginalAssignment(m);return original?`<div class="assignment-links">${makeMissionLink(original,"See Original Assignment","original-link")}</div>`:"";}const related=findAdditionalAssignments(m);if(!related.length)return "";return `<div class="assignment-links"><div class="assignment-links-title">Additional Assignments</div>${related.map(r=>makeMissionLink(r,getMissionType(r)||getMissionName(r),"related-link")).join("")}</div>`;}
function spouseHtml(m){const spouse=getSpouse(m);if(!spouse)return "";const spouseMissionary=findSpouseMissionary(m);if(!spouseMissionary)return `<div class="card-spouse">Married to ${escapeHtml(spouse)}</div>`;return `<div class="card-spouse">Married to ${makeMissionLink(spouseMissionary,spouse,"spouse-link")}</div>`;}

/* ==========================================================
   NEW FLAG SYSTEM
   ========================================================== */

const COUNTRY_CODES = {
  "united states":"us",
  "usa":"us",
  "us":"us",
  "canada":"ca",
  "brazil":"br",
  "germany":"de",
  "australia":"au",
  "new zealand":"nz",
  "england":"gb",
  "united kingdom":"gb",
  "france":"fr",
  "italy":"it",
  "spain":"es",
  "mexico":"mx",
  "japan":"jp",
  "philippines":"ph",
  "argentina":"ar",
  "chile":"cl",
  "peru":"pe",
  "colombia":"co",
  "denmark":"dk"
};

const US_STATE_FLAGS = {};

[
"Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
"Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland",
"Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
"New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon",
"Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
"Virginia","Washington","West Virginia","Wisconsin","Wyoming"
].forEach(state=>{
    US_STATE_FLAGS[state.toLowerCase()] =
      `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent("Flag of "+state+".svg")}`;
});

function countryFlag(country){
    const code = COUNTRY_CODES[normalize(country)];
    return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

function getFlagImage(country,state){

    const s = normalize(state);
    const c = normalize(country);

    let url="";

    if(["united states","usa","us"].includes(c) && US_STATE_FLAGS[s]){
        url = US_STATE_FLAGS[s];
    }

    if(!url){
        url = countryFlag(country);
    }

    if(!url){
        return `<div class="flag-placeholder">🌍</div>`;
    }

    return `<img class="flag-img"
        src="${url}"
        alt="${escapeAttr(state||country)}"
        onerror="this.onerror=null;this.src='${countryFlag(country)}';">`;
}

function missionaryPopupHtml(m){const lang=getLanguage(m),pres=getPresidents(m);return `<div class="leaflet-mission-popup single-missionary-popup"><h2>${getTitle(getSex(m),getName(m),lang)}</h2><div class="card-divider"></div><div class="card-location-small">${getFlagImage(getCountry(m),getState(m))}<div><div class="card-mission">${escapeHtml(getMissionName(m)||"")}</div>${missionMetaHtml(m)}</div></div>${assignmentLinksHtml(m)}<div class="card-dates">${formatMissionDates(m)}</div>${pres?`<div class="card-presidents">${formatPresidents(pres)}</div>`:""}${spouseHtml(m)}</div>`;}
function groupPopupHtml(group){const f=group[0];const langs=new Set(group.map(m=>getLanguage(m)).filter(Boolean));return `<div class="leaflet-mission-popup group-mission-popup"><h2>${escapeHtml(getMissionName(f))}</h2><div class="card-divider"></div><div class="card-location-small">${getFlagImage(getCountry(f),getState(f))}<div><div class="card-mission">${group.length} missionaries served here</div>${langs.size?`<div class="popup-language">${Array.from(langs).map(escapeHtml).join(", ")}</div>`:""}</div></div><div class="missionary-list">${group.map((m,i)=>`<button type="button" class="missionary-list-item" data-index="${i}"><strong>${getTitle(getSex(m),getName(m),getLanguage(m))}</strong><span>${formatMissionDate(getStartDate(m))} – ${isCurrentlyServing(m)?"Present":formatMissionDate(getEndDate(m))}${shouldShowMissionType(m)?` • ${escapeHtml(getMissionType(m))}`:""}</span></button>`).join("")}</div></div>`;}
function showDetailPreview(m,anchor){const p=document.getElementById("detailPreview");if(!p||!anchor)return;p.innerHTML=missionaryPopupHtml(m);p.classList.remove("hidden");const r=anchor.getBoundingClientRect();let left=r.right+14,top=r.top;p.style.left=`${left}px`;p.style.top=`${top}px`;const pr=p.getBoundingClientRect();if(pr.right>window.innerWidth-12)left=r.left-pr.width-14;if(pr.bottom>window.innerHeight-12)top=window.innerHeight-pr.height-12;if(top<12)top=12;p.style.left=`${left}px`;p.style.top=`${top}px`;}
function hideDetailPreview(){const p=document.getElementById("detailPreview");if(!p)return;p.classList.add("hidden");p.innerHTML="";document.querySelectorAll(".missionary-list-item.active").forEach(b=>b.classList.remove("active"));}
function handleOutsidePreviewClick(e){const p=document.getElementById("detailPreview");if(!p||p.classList.contains("hidden"))return;if(!p.contains(e.target)&&!e.target.closest(".missionary-list-item")&&!e.target.closest(".mission-jump-link"))hideDetailPreview();}
function setupGroupPopupEvents(popup,group){setTimeout(()=>{const el=popup&&popup.getElement();if(!el)return;el.querySelectorAll(".missionary-list-item").forEach(btn=>{const m=group[Number(btn.dataset.index)];const show=()=>{document.querySelectorAll(".missionary-list-item.active").forEach(b=>b.classList.remove("active"));btn.classList.add("active");showDetailPreview(m,btn);};btn.addEventListener("mouseenter",show);btn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();show();});});document.addEventListener("click",handleOutsidePreviewClick);},0);popup.on("close",()=>{hideDetailPreview();document.removeEventListener("click",handleOutsidePreviewClick);if(currentPopup===popup)currentPopup=null;});}
function openMarkerPopup(marker,group){if(currentPopup){currentPopup.remove();currentPopup=null;}const isPhone=window.matchMedia("(max-width: 700px)").matches;const maxWidth=isPhone?"265px":(group.length===1?"360px":"380px");const html=group.length===1?missionaryPopupHtml(group[0]):groupPopupHtml(group);const popup=new maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth,className:"haag-leaflet-popup globe-popup"}).setLngLat(marker.getLngLat()).setHTML(html).addTo(map);currentPopup=popup;if(group.length>1)setupGroupPopupEvents(popup,group);return popup;}
function bindMarkerPopup(marker,group){marker.missionaryGroup=group;const el=marker.getElement();el.addEventListener("mouseenter",()=>openMarkerPopup(marker,group));el.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openMarkerPopup(marker,group);});}
function createMarkerIcon(group){const count=group.length,hasMale=group.some(m=>getSex(m)!=="Female"),hasFemale=group.some(m=>getSex(m)==="Female"),hasCurrent=group.some(isCurrentlyServing),hasInLaw=group.some(isInLaw);let color=getColor(getSex(group[0]));if(hasMale&&hasFemale)color="#7c3aed";let inner="";if(count>1)inner=`<span class="marker-number">${count}</span>`;const cls=["mission-marker",count>1?"duplicate-marker":"",hasCurrent?"current-marker":"",hasInLaw&&count===1?"heart-marker":"dot-marker"].join(" ");const wrapper=document.createElement("div");wrapper.className="custom-marker";wrapper.innerHTML=`<div class="${cls}" style="--marker-color:${color}">${inner}</div>`;return wrapper;}
function clearMarkers(){allMarkers.forEach(m=>m.remove());allMarkers=[];}

function getFilteredData(){return allMissionaries.filter(m=>matchesFamily(m)&&matchesSex(m)&&matchesCurrent(m)&&matchesInLaw(m)&&matchesSearch(m)&&matchesYears(m));}
function matchesFamily(m){const s=document.getElementById("familyFilter").value;return s==="all"||normalize(getRelation(m)).includes(normalize(s));}
function matchesSex(m){return getSex(m)==="Female"?document.getElementById("showSisters").checked:document.getElementById("showElders").checked;}
function matchesCurrent(m){return document.getElementById("showCurrent").checked||!isCurrentlyServing(m);}
function matchesInLaw(m){return document.getElementById("showInLaws").checked||!isInLaw(m);}
function matchesSearch(m){if(!activeSearch)return true;const h=[getName(m),getMissionName(m),getCity(m),getState(m),getCountry(m),getLanguage(m),getMissionType(m),getPresidents(m),getSpouse(m),getRelation(m)].join(" ");return normalize(h).includes(normalize(activeSearch));}
function matchesYears(m){return selectedYears.size===0||missionaryYears(m).some(y=>selectedYears.has(y));}
function groupByMission(data){const groups={};data.forEach(m=>{if(!m.coords)return;const k=normalize(getMissionName(m));if(!groups[k])groups[k]=[];groups[k].push(m);});return Object.values(groups);}
function drawMarkers(){clearMarkers();hideDetailPreview();if(currentPopup){currentPopup.remove();currentPopup=null;}const data=getFilteredData();updateStats(data);const groups=groupByMission(data);let bounds=null;groups.forEach(g=>{const c=g[0].coords;const marker=new maplibregl.Marker({element:createMarkerIcon(g),anchor:"center"}).setLngLat([c.lng,c.lat]).addTo(map);bindMarkerPopup(marker,g);allMarkers.push(marker);if(!bounds)bounds=new maplibregl.LngLatBounds([c.lng,c.lat],[c.lng,c.lat]);else bounds.extend([c.lng,c.lat]);});if(bounds&&!bounds.isEmpty())map.fitBounds(bounds,{padding:{top:80,bottom:80,left:80,right:80},maxZoom:5,duration:900});}
function countItems(values){const c={};values.filter(Boolean).forEach(v=>{const k=String(v).trim();c[k]=(c[k]||0)+1;});return c;}
function topItem(values){const e=Object.entries(countItems(values));if(!e.length)return"--";e.sort((a,b)=>b[1]-a[1]);return `${e[0][0]} (${e[0][1]})`;}
function getLanguageList(m){return String(getLanguage(m)||"").split(/,|;|\/|&/).map(x=>x.trim()).filter(Boolean);}
function firstServedYear(items){const years=items.flatMap(m=>missionaryYears(m)).filter(Boolean);return years.length?Math.min(...years):"--";}
function latestServedYear(items){const years=items.flatMap(m=>missionaryYears(m)).filter(Boolean);return years.length?Math.max(...years):"--";}
function countryDetailHtml(country,data){if(!country)return "Select a country to see details.";const items=data.filter(m=>getCountry(m)===country);if(!items.length)return "Select a country to see details.";const langs=Object.entries(countItems(items.flatMap(getLanguageList))).sort((a,b)=>b[1]-a[1]).slice(0,4);const missions=new Set(items.map(getMissionName).filter(Boolean));return `<strong>${escapeHtml(country)}</strong><span>${items.length} missionary${items.length===1?"":"ies"} • ${missions.size} mission${missions.size===1?"":"s"}</span><span>First served: ${firstServedYear(items)} • Most recent: ${latestServedYear(items)}</span>${langs.length?`<span>Languages: ${langs.map(([l,n])=>`${escapeHtml(l)} (${n})`).join(", ")}</span>`:""}`;}
function updateCountryStats(data){const list=document.getElementById("countryStatsList");const detail=document.getElementById("countryStatsDetail");if(!list||!detail)return;const entries=Object.entries(countItems(data.map(getCountry))).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));if(selectedCountryForStats&&!entries.some(([c])=>c===selectedCountryForStats))selectedCountryForStats="";list.innerHTML=entries.map(([country,count])=>`<button type="button" class="country-chip ${country===selectedCountryForStats?"active":""}" data-country="${escapeAttr(country)}">${escapeHtml(country)} <span>${count}</span></button>`).join("");detail.innerHTML=countryDetailHtml(selectedCountryForStats,data);}
function updateStats(data){document.getElementById("totalMissionaries").textContent=data.length;document.getElementById("totalElders").textContent=data.filter(m=>getSex(m)!=="Female").length;document.getElementById("totalSisters").textContent=data.filter(m=>getSex(m)==="Female").length;document.getElementById("currentMissionaries").textContent=data.filter(isCurrentlyServing).length;document.getElementById("countriesServed").textContent=new Set(data.map(getCountry).filter(Boolean)).size;document.getElementById("totalContinents").textContent=new Set(data.map(m=>CONTINENTS[getCountry(m)]).filter(Boolean)).size;const langs=new Set();data.forEach(m=>getLanguageList(m).forEach(l=>langs.add(l)));document.getElementById("totalLanguages").textContent=langs.size;const missionCounts=countItems(data.map(getMissionName));document.getElementById("duplicateMissions").textContent=Object.values(missionCounts).filter(n=>n>1).length;document.getElementById("topLanguage").textContent=topItem(data.flatMap(getLanguageList));document.getElementById("topCountry").textContent=topItem(data.map(getCountry));updateCountryStats(data);}

function preferredMissionaryForSearch(value){
  const q=normalize(value);
  if(!q)return null;

  const nameMatches=allMissionaries.filter(m=>normalize(getName(m)).includes(q)&&m.coords);
  if(nameMatches.length){
    const exactNameMatches=nameMatches.filter(m=>normalize(getName(m))===q);
    const candidates=exactNameMatches.length?exactNameMatches:nameMatches;

    const uniqueNames=Array.from(new Set(candidates.map(m=>normalize(getName(m))).filter(Boolean)));
    if(uniqueNames.length===1){
      return candidates.find(isOriginalAssignment)||candidates[0];
    }

    const startsWithMatches=candidates.filter(m=>normalize(getName(m)).startsWith(q));
    const startsWithNames=Array.from(new Set(startsWithMatches.map(m=>normalize(getName(m))).filter(Boolean)));
    if(startsWithNames.length===1){
      return startsWithMatches.find(isOriginalAssignment)||startsWithMatches[0];
    }
  }

  const filtered=getFilteredData().filter(m=>m.coords);
  const names=new Set(filtered.map(m=>normalize(getName(m))).filter(Boolean));
  if(filtered.length===1)return filtered[0];
  if(names.size===1&&filtered.length){return filtered.find(isOriginalAssignment)||filtered[0];}
  return null;
}

function navigateSearchResult({clearSearch=false}={}){
  const search=document.getElementById("searchInput");
  const target=preferredMissionaryForSearch(search?search.value:activeSearch);
  if(!target)return false;
  if(clearSearch){
    activeSearch="";
    if(search)search.value="";
    drawMarkers();
    setTimeout(()=>jumpToMissionary(target),120);
  }else{
    setTimeout(()=>jumpToMissionary(target),120);
  }
  return true;
}

function zoomToCountry(country){
  const key=normalize(country);
  const items=getFilteredData().filter(m=>normalize(getCountry(m))===key&&m.coords);
  if(!items.length)return;
  hideDetailPreview();
  if(currentPopup){currentPopup.remove();currentPopup=null;}

  const view=COUNTRY_VIEWS[key];
  if(view){
    map.flyTo({center:view.center,zoom:view.zoom,duration:1200,essential:true});
    return;
  }

  if(items.length===1){
    const c=items[0].coords;
    map.flyTo({center:[c.lng,c.lat],zoom:5,duration:1200,essential:true});
    return;
  }

  let bounds=new maplibregl.LngLatBounds([items[0].coords.lng,items[0].coords.lat],[items[0].coords.lng,items[0].coords.lat]);
  items.slice(1).forEach(m=>bounds.extend([m.coords.lng,m.coords.lat]));
  map.fitBounds(bounds,{padding:{top:90,bottom:90,left:90,right:90},maxZoom:5,duration:1200});
}

function buildYearCheckboxes(){
  const box=document.getElementById("yearCheckboxes");
  const years=new Set();
  allMissionaries.forEach(m=>missionaryYears(m).forEach(y=>years.add(y)));
  box.innerHTML=Array.from(years).sort((a,b)=>b-a).map(y=>`<label class="year-option"><input type="checkbox" value="${y}"> ${y}</label>`).join("");
  box.querySelectorAll("input").forEach(input=>input.addEventListener("change",()=>{
    const y=Number(input.value);
    input.checked?selectedYears.add(y):selectedYears.delete(y);
    drawMarkers();
  }));
}

function buildSearchSuggestions(){
  const dl=document.getElementById("searchSuggestions");
  if(!dl)return;
  const values=new Set();
  allMissionaries.forEach(m=>[getName(m),getMissionName(m),getCountry(m),getState(m),getCity(m),getLanguage(m),getMissionType(m),getSpouse(m)].forEach(v=>{
    if(v)values.add(String(v).trim());
  }));
  dl.innerHTML=Array.from(values).sort((a,b)=>a.localeCompare(b)).slice(0,350).map(v=>`<option value="${escapeAttr(v)}"></option>`).join("");
}

function resetAllFilters(){
  activeSearch="";
  selectedYears.clear();
  const search=document.getElementById("searchInput");
  if(search)search.value="";
  document.querySelectorAll("#yearCheckboxes input").forEach(i=>i.checked=false);
  document.getElementById("familyFilter").value="all";
  document.getElementById("showElders").checked=true;
  document.getElementById("showSisters").checked=true;
  document.getElementById("showCurrent").checked=true;
  document.getElementById("showInLaws").checked=true;
  drawMarkers();
}

