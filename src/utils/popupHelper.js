/**
 * Build and attach popups for map station features. This keeps DOM templating
 * and event wiring out of the map composable.
 */

/**
 * Escape HTML characters in a string to avoid XSS.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Create a dropdown popup listing multiple stations. When a station is picked,
 * a detail popup is shown.
 *
 * @param {object} options
 * @param {any} options.map
 * @param {any[]} options.features
 * @param {any} options.lngLat
 * @param {(value: number, property: string, alpha: string) => string} options.getColor
 * @param {(props: Record<string, any>) => void} options.onSelect
 * @param {(props: Record<string, any>) => Promise<void> | void} options.onDetail
 * @param {(args: any) => void} options.openDetailPopup
 */
export function createDropdownPopup({
  map,
  features,
  lngLat,
  getColor,
  onSelect,
  onDetail,
  openDetailPopup,
}) {
  if (!map) return null;
  let dropdownHTML = `
    <div class="card text-center border-primary">
      <div class="card-header bg-primary text-white">
        <h6>Selecteer Station <i class="bi bi-search"></i></h6>
      </div>
      <div class="card-body">
        <div class="dropdown">
          <button class="btn btn-outline-primary dropdown-toggle" type="button" id="stationSelect" data-bs-toggle="dropdown" aria-expanded="false">
            Kies een station
          </button>
          <div class="dropdown-menu" aria-labelledby="stationSelect" style="height: 200px; overflow-y: auto;">
  `;
  features.forEach((feature, index) => {
    const props = feature.properties ?? {};
    const station = escapeHtml(props.station_name ?? '');
    const value = props.value;
    const color = getColor(value ?? 0, props.property ?? '', '1');
    dropdownHTML += `
      <a class="dropdown-item" href="#" data-index="${index}">
        <i class="bi bi-geo-alt-fill" style="color: ${color};"></i> ${station}
      </a>`;
  });
  dropdownHTML += `
          </div>
        </div>
      </div>
    </div>
  `;

  const popup = new window.maplibregl.Popup({ className: 'my-popup' })
    .setLngLat(lngLat)
    .setHTML(dropdownHTML)
    .addTo(map);

  const attachListeners = () => {
    const items = Array.from(popup.getElement().querySelectorAll('.dropdown-item'));
    items.forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const index = Number(event.currentTarget?.dataset?.index ?? 0);
        popup.remove();
        openDetailPopup({
          map,
          feature: features[index],
          lngLat,
          getColor,
          onSelect,
          onDetail,
        });
      });
    });
  };

  // Attach listeners after DOM insertion
  requestAnimationFrame(attachListeners);
  return popup;
}

/**
 * Create a detailed popup for a single station.
 *
 * @param {object} options
 * @param {any} options.map
 * @param {any} options.feature
 * @param {any} options.lngLat
 * @param {(value: number, property: string, alpha: string) => string} options.getColor
 * @param {(props: Record<string, any>) => void} options.onSelect
 * @param {(props: Record<string, any>) => Promise<void> | void} options.onDetail
 */
export function createDetailPopup({ map, feature, lngLat, getColor, onSelect, onDetail }) {
  if (!map || !feature) return null;
  const props = feature.properties ?? {};
  onSelect?.(props);
  const stationNameEsc = escapeHtml(props.station_name ?? '');
  const propertyEsc = escapeHtml(props.property ?? '');
  const valueEsc = props.value !== undefined ? props.value.toString() : 'N/A';
  const unitEsc = escapeHtml(props.unit ?? '');
  const gemeenteEsc = escapeHtml(props.Gemeente ?? '');
  const regioEsc = escapeHtml(props.regio ?? '');
  const formattedDate = props.measured_time
    ? new Date(props.measured_time).toLocaleString('nl-NL', {
      timeZone: 'GMT',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    : 'Onbekend';
  const color = getColor(props.value ?? 0, props.property ?? '', '1');
  const popupHtml = `
    <div class="card text-center" style="border-color: ${color};">
      <div class="card-header" style="background-color: ${color}; color: white;">
        <h6>Station naam: ${stationNameEsc}</h6>
      </div>
      <div class="card-body">
        <h6 class="card-title">Component en meetwaarde:<br>${propertyEsc}: ${valueEsc} ${unitEsc}</h6>
        <h6>Beschrijving:<br>Gemeente ${gemeenteEsc} - Regio ${regioEsc}</h6>
        <h6 class="card-text">
          <small class="text-muted">Laatst update: ${formattedDate}</small>
        </h6>
        <button class="btn mt-3" type="button" data-bs-toggle="modal" data-bs-target="#modalWithBothOptions" style="background-color: ${color}; color: white;" data-properties='${encodeURIComponent(
          JSON.stringify(props),
        )}'>
          Informatie over station
        </button>
      </div>
    </div>
  `;

  const popup = new window.maplibregl.Popup({ className: 'my-popup' })
    .setLngLat(lngLat)
    .setHTML(popupHtml)
    .addTo(map);

  const attachListeners = () => {
    const button = popup.getElement().querySelector('button');
    if (!button) return;
    const originalHtml = button.innerHTML;
    button.addEventListener('click', async () => {
      button.innerHTML =
        '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span role="status">Loading...</span>';
      try {
        await onDetail?.(props);
      } finally {
        button.innerHTML = originalHtml;
        popup.remove();
      }
    });
  };

  requestAnimationFrame(attachListeners);
  return popup;
}
