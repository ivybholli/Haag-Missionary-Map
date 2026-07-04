/* =====================================================
   POPUP HTML
===================================================== */

function missionaryPopupHtml(m) {
  const name = getName(m);
  const sex = getSex(m);
  const language = getLanguage(m);
  const mission = getMissionName(m);
  const country = getCountry(m);
  const state = getState(m);
  const presidents = getPresidents(m);
  const spouse = getSpouse(m);

  return `
    <div class="leaflet-mission-popup single-missionary-popup">
      <h2>${getTitle(sex, name, language)}</h2>

      <div class="card-divider"></div>

      <div class="card-location-small">
        ${getFlagImage(country, state)}
        <div>
          <div class="card-mission">${mission || ""}</div>
          ${language ? `<div class="popup-language">${language}</div>` : ""}
        </div>
      </div>

      <div class="card-dates">
        ${formatMissionDates(m)}
      </div>

      ${presidents ? `<div class="card-presidents">${formatPresidents(presidents)}</div>` : ""}

      ${spouse ? `<div class="card-spouse">Married to ${spouse}</div>` : ""}
    </div>
  `;
}

function groupPopupHtml(group) {
  const first = group[0];
  const mission = getMissionName(first);
  const country = getCountry(first);
  const state = getState(first);

  const languageSet = new Set(
    group.map(m => getLanguage(m)).filter(Boolean)
  );

  return `
    <div class="leaflet-mission-popup group-mission-popup">
      <h2>${mission}</h2>

      <div class="card-divider"></div>

      <div class="card-location-small">
        ${getFlagImage(country, state)}
        <div>
          <div class="card-mission">${group.length} missionaries served here</div>
          ${
            languageSet.size
              ? `<div class="popup-language">${Array.from(languageSet).join(", ")}</div>`
              : ""
          }
        </div>
      </div>

      <div class="missionary-list">
        ${group.map((m, index) => `
          <button
            type="button"
            class="missionary-list-item"
            data-index="${index}"
          >
            <strong>${getTitle(getSex(m), getName(m), getLanguage(m))}</strong>
            <span>
              ${formatMissionDate(getStartDate(m))}
              –
              ${isCurrentlyServing(m) ? "Present" : formatMissionDate(getEndDate(m))}
            </span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

/* =====================================================
   SIDE DETAIL PREVIEW
===================================================== */

function showDetailPreview(m, anchorElement = null) {
  const preview = document.getElementById("detailPreview");
  if (!preview) return;

  preview.innerHTML = missionaryPopupHtml(m);
  preview.classList.remove("hidden");

  if (anchorElement) {
    const rect = anchorElement.getBoundingClientRect();

    preview.style.left = `${rect.right + 14}px`;
    preview.style.top = `${rect.top}px`;

    const previewRect = preview.getBoundingClientRect();

    if (previewRect.right > window.innerWidth - 10) {
      preview.style.left = `${rect.left - previewRect.width - 14}px`;
    }

    if (previewRect.bottom > window.innerHeight - 10) {
      preview.style.top = `${window.innerHeight - previewRect.height - 10}px`;
    }

    if (previewRect.top < 10) {
      preview.style.top = "10px";
    }
  }
}

function hideDetailPreview() {
  const preview = document.getElementById("detailPreview");
  if (!preview) return;

  preview.classList.add("hidden");
  preview.innerHTML = "";
}

/* =====================================================
   POPUP EVENTS
===================================================== */

function attachGroupPopupEvents(marker, group) {
  marker.on("popupopen", event => {
    const popupEl = event.popup.getElement();
    if (!popupEl) return;

    popupEl.querySelectorAll(".missionary-list-item").forEach(button => {
      const index = Number(button.dataset.index);
      const missionary = group[index];

      button.addEventListener("mouseenter", () => {
        showDetailPreview(missionary, button);
      });

      button.addEventListener("click", event => {
        event.stopPropagation();
        showDetailPreview(missionary, button);
      });
    });
  });

  marker.on("popupclose", () => {
    hideDetailPreview();
  });
}

function bindMarkerPopup(marker, group) {
  if (group.length === 1) {
    marker.bindPopup(missionaryPopupHtml(group[0]), {
      closeButton: true,
      autoPan: true,
      maxWidth: 360,
      className: "haag-leaflet-popup"
    });
  } else {
    marker.bindPopup(groupPopupHtml(group), {
      closeButton: true,
      autoPan: true,
      maxWidth: 380,
      className: "haag-leaflet-popup"
    });

    attachGroupPopupEvents(marker, group);
  }

  marker.on("mouseover", () => marker.openPopup());
  marker.on("click", () => marker.openPopup());
}
