/**
 * Map a numeric pollutant value to a colour based on breakpoints. The
 * thresholds differ for pm25 vs pm10/no2. An alpha channel value (e.g.
 * '0.4', '1') can be supplied to control opacity. Colours are returned in
 * rgba() format.
 *
 * TODO: Consider moving the palette/thresholds into config so they can be
 * reused across other dashboards without code changes.
 *
 * @param {number} value The measured pollutant value.
 * @param {string} property The pollutant type (pm25, pm10, no2).
 * @param {string} alpha A string representing the alpha channel (0-1).
 * @returns {string}
 */
export function getColor(value, property, alpha) {
  const thresholds = property === 'pm25' ? [8.3, 16.7, 25, Infinity] : [13.3, 26.6, 40, Infinity];
  const palette = [
    'rgba(30, 144, 255,',
    'rgba(72, 209, 204,',
    'rgba(154, 205, 50,',
    'rgba(218, 165, 32,',
  ];
  const index = thresholds.findIndex((t) => value < t);
  const base = palette[index >= 0 && index < palette.length ? index : palette.length - 1];
  return `${base}${alpha})`;
}
