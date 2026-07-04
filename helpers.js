/* =====================================================
   HELPER DATA
===================================================== */

const TITLE_BY_LANGUAGE = {
  English: { elder: "Elder", sister: "Sister" },
  Spanish: { elder: "Elder", sister: "Hermana" },
  Italian: { elder: "Elder", sister: "Sorella" },
  French: { elder: "Elder", sister: "Sœur" },
  German: { elder: "Elder", sister: "Sister" },
  Portuguese: { elder: "Elder", sister: "Sister" },
  Danish: { elder: "Elder", sister: "Søster" }
};

const CONTINENTS = {
  "United States": "North America",
  USA: "North America",
  US: "North America",
  Brazil: "South America",
  Denmark: "Europe",
  Germany: "Europe",
  Italy: "Europe",
  France: "Europe",
  Spain: "Europe",
  Mexico: "North America",
  Canada: "North America",
  England: "Europe",
  "United Kingdom": "Europe",
  Argentina: "South America",
  Chile: "South America",
  Peru: "South America",
  Colombia: "South America",
  Philippines: "Asia",
  Japan: "Asia",
  Australia: "Oceania",
  "New Zealand": "Oceania"
};

/* =====================================================
   TITLES + COLORS
===================================================== */

function getTitle(sex, name, language) {
  const firstLanguage = String(language || "English").split(",")[0].trim();
  const titles = TITLE_BY_LANGUAGE[firstLanguage] || TITLE_BY_LANGUAGE.English;
  const prefix = sex === "Female" ? titles.sister : titles.elder;

  return `${prefix} ${name || ""}`;
}

function getColor(sex) {
  return sex === "Female" ? "#ec4899" : "#2563eb";
}

function isInLaw(m) {
  return normalize(getRelationshipToElvaDarrell(m)).includes("in-law");
}

/* =====================================================
   DATES
===================================================== */

function parseMonthYear(value) {
  if (!value) return null;

  const parts = String(value).trim().split("/");
  if (parts.length !== 2) return null;

  const month = Number(parts[0]);
  const year = Number(parts[1]);

  if (!month || !year || month < 1 || month > 12) return null;

  return { month, year };
}

function formatMissionDate(value) {
  const parsed = parseMonthYear(value);

  if (!parsed) return value || "";

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return `${months[parsed.month - 1]} ${parsed.year}`;
}

function isCurrentlyServing(m) {
  const parsed = parseMonthYear(getEndDate(m));
  if (!parsed) return false;

  const endDate = new Date(parsed.year, parsed.month, 0);
  return endDate >= new Date();
}

function missionLength(start, end) {
  const s = parseMonthYear(start);
  const e = parseMonthYear(end);

  if (!s || !e) return "";

  const months =
    (e.year - s.year) * 12 +
    (e.month - s.month) + 1;

  return `${months} month${months === 1 ? "" : "s"}`;
}

function formatMissionDates(m) {
  const start = getStartDate(m);
  const end = getEndDate(m);

  if (isCurrentlyServing(m)) {
    return `
      <div class="card-date-main">${formatMissionDate(start)} – Present</div>
      <div class="currently-serving">✓ Currently Serving</div>
    `;
  }

  return `
    <div class="card-date-main">${formatMissionDate(start)} – ${formatMissionDate(end)}</div>
    <div class="mission-length">${missionLength(start, end)}</div>
  `;
}

function servedDuringYear(m, year) {
  if (year === "all") return true;

  const start = parseMonthYear(getStartDate(m));
  const end = parseMonthYear(getEndDate(m));

  if (!start || !end) return true;

  return year >= start.year && year <= end.year;
}

/* =====================================================
   MISSION PRESIDENTS
===================================================== */

function formatPresidents(text) {
  return String(text || "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean)
    .join("<br>");
}

/* =====================================================
   FLAGS
===================================================== */

function getFlagImage(country, state) {
  const cleanCountry = String(country || "").replace(/\s+/g, " ").trim();
  const cleanState = String(state || "").replace(/\s+/g, " ").trim();

  const countryCodes = {
    "United States": "us",
    USA: "us",
    US: "us",
    Brazil: "br",
    Denmark: "dk",
    Germany: "de",
    Italy: "it"
  };

  const usFlags = {
    Maryland: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Flag_of_Maryland.svg",
    Louisiana: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Flag_of_Louisiana.svg",
    Utah: "https://upload.wikimedia.org/wikipedia/commons/f/f6/Flag_of_Utah.svg",
    Ohio: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Flag_of_Ohio.svg",
    Washington: "https://upload.wikimedia.org/wikipedia/commons/5/54/Flag_of_Washington.svg",
    Oregon: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Flag_of_Oregon.svg",
    Connecticut: "https://upload.wikimedia.org/wikipedia/commons/9/96/Flag_of_Connecticut.svg"
  };

  const brazilFlags = {
    "Goiás": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Bandeira_de_Goi%C3%A1s.svg",
    "Goias": "https://upload.wikimedia.org/wikipedia/commons/0/0d/Bandeira_de_Goi%C3%A1s.svg",
    "Rio de Janeiro": "https://upload.wikimedia.org/wikipedia/commons/7/73/Bandeira_do_estado_do_Rio_de_Janeiro.svg"
  };

  if (["United States", "USA", "US"].includes(cleanCountry) && usFlags[cleanState]) {
    return `<img class="flag-img" src="${usFlags[cleanState]}" alt="${cleanState} flag">`;
  }

  if (cleanCountry === "Brazil" && brazilFlags[cleanState]) {
    return `<img class="flag-img" src="${brazilFlags[cleanState]}" alt="${cleanState} flag">`;
  }

  const code = countryCodes[cleanCountry];
  if (!code) return `<div class="flag-placeholder">🌍</div>`;

  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${cleanCountry} flag">`;
}
