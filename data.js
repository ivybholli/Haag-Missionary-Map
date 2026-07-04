/* =====================================================
   DATA SETTINGS + GOOGLE SHEET LOADER
===================================================== */

const SHEET_ID = "15BJwH_54gL9fWGCtg0FOwF_qYy4mAm7KWN1LVnSBl5w";

const MISSIONARY_SHEET_NAME = "Form Responses 1";
const COORDINATES_SHEET_NAME = "Coordinates";

let allMissionaries = [];
let allMarkers = [];
let activeYear = "all";
let activeSearch = "";
let allYearsMode = true;

/* =====================================================
   GOOGLE SHEET FUNCTIONS
===================================================== */

function cleanHeader(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function loadSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

  const res = await fetch(url);
  const text = await res.text();

  const json = JSON.parse(text.substring(47).slice(0, -2));
  const cols = json.table.cols.map(c => cleanHeader(c.label));

  return json.table.rows.map(row => {
    const obj = {};

    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });

    return obj;
  });
}

function getValue(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== "") {
      return row[name];
    }
  }

  const keys = Object.keys(row);

  for (const name of possibleNames) {
    const foundKey = keys.find(key => normalize(key) === normalize(name));
    if (foundKey && row[foundKey] !== "") {
      return row[foundKey];
    }
  }

  return "";
}

/* =====================================================
   COLUMN GETTERS
===================================================== */

function getName(m) {
  return getValue(m, [
    "Missionary Name (First Last) (e.g., Dawn Hollingsworth)",
    "Missionary Name (First Last)",
    "Missionary Name",
    "Name"
  ]);
}

function getSex(m) {
  return getValue(m, ["Biological Sex", "Sex", "Gender"]);
}

function getRelation(m) {
  return getValue(m, [
    "Who is your Haag relation?",
    "Haag relation",
    "Relation"
  ]);
}

function getRelationshipToElvaDarrell(m) {
  return getValue(m, [
    "What is your relationship to Elva and Darrell?",
    "Relationship to Elva and Darrell"
  ]);
}

function getMissionName(m) {
  return getValue(m, [
    "Official Mission name (Ex: Maryland Baltimore)",
    "Official Mission Name",
    "Official Mission name",
    "Mission Name"
  ]);
}

function getCity(m) {
  return getValue(m, ["City", "Mission City"]);
}

function getState(m) {
  return getValue(m, ["State/Region", "State", "Mission State"]);
}

function getCountry(m) {
  return getValue(m, ["Country", "Mission Country"]);
}

function getLanguage(m) {
  return getValue(m, [
    "Assigned Language(s)",
    "Assigned Languages",
    "Language",
    "Languages"
  ]);
}

function getStartDate(m) {
  return getValue(m, ["Start Date (MM/YYYY)", "Start Date"]);
}

function getEndDate(m) {
  return getValue(m, ["End Date (MM/YYYY)", "End Date"]);
}

function getPresidents(m) {
  return getValue(m, [
    "Mission President Names (Ex: President and Sister Piros; President and Sister Varner)",
    "Mission President Names",
    "Mission Presidents"
  ]);
}

function getSpouse(m) {
  return getValue(m, [
    "Your Spouse's Name (If Applicable)",
    "Spouse",
    "Spouse Name"
  ]);
}
