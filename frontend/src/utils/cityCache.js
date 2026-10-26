export const CITIES_CACHE_KEY = "rutasya_cities_cache";
export const CACHED_CITY_KEY = "rutasya_cached_city";
export const SELECTED_CITY_KEY = "rutasya_selected_city_id";
export const CITIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Reads the cached cities list from localStorage if still valid under the TTL.
 *
 * @returns {Array|null} Array of cities or null if missing/expired.
 */
export function readCachedCities() {
  try {
    const raw = localStorage.getItem(CITIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.cities) || parsed.cities.length === 0) {
      return null;
    }
    if (
      typeof parsed.timestamp !== "number" ||
      Date.now() - parsed.timestamp > CITIES_CACHE_TTL_MS
    ) {
      return null;
    }
    return parsed.cities;
  } catch {
    return null;
  }
}

/**
 * Persists the cities list with a current timestamp to localStorage.
 *
 * @param {Array} citiesList - Array of city objects.
 */
export function saveCachedCities(citiesList) {
  try {
    if (!Array.isArray(citiesList) || citiesList.length === 0) return;
    localStorage.setItem(
      CITIES_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), cities: citiesList }),
    );
  } catch {
    // ignore storage quota / private mode issues
  }
}

/**
 * Reads the manually selected city ID from localStorage.
 *
 * @returns {string|null} City UUID or null.
 */
export function getSelectedCityId() {
  try {
    return localStorage.getItem(SELECTED_CITY_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolves the initial city and manual selection state synchronously on mount.
 *
 * @param {Array|null} cachedCities - Currently cached cities.
 * @returns {{ city: Object|null, isManual: boolean }}
 */
export function readInitialCity(cachedCities) {
  try {
    const savedCityId = getSelectedCityId();
    if (savedCityId && cachedCities?.length) {
      const matched = cachedCities.find((c) => c.id === savedCityId);
      if (matched) return { city: matched, isManual: true };
    }
    const rawCachedCity = localStorage.getItem(CACHED_CITY_KEY);
    if (rawCachedCity) {
      const parsed = JSON.parse(rawCachedCity);
      if (parsed?.id) return { city: parsed, isManual: Boolean(savedCityId) };
    }
    if (cachedCities?.length) {
      const fallback =
        cachedCities.find((c) => c.name === "Ica") || cachedCities[0];
      if (fallback) return { city: fallback, isManual: false };
    }
  } catch {
    // ignore parse error
  }
  return { city: null, isManual: false };
}

/**
 * Persists the currently selected city object and updates the selected ID key.
 *
 * @param {Object} city - City object.
 * @param {boolean} [isManual=true] - Whether selection was manual or automated.
 */
export function persistSelectedCity(city, isManual = true) {
  if (!city) return;
  try {
    if (isManual && city.id) {
      localStorage.setItem(SELECTED_CITY_KEY, city.id);
    } else {
      localStorage.removeItem(SELECTED_CITY_KEY);
    }
    localStorage.setItem(CACHED_CITY_KEY, JSON.stringify(city));
  } catch {
    // ignore
  }
}

/**
 * Clears the manual city selection ID from localStorage.
 */
export function clearSelectedCityId() {
  try {
    localStorage.removeItem(SELECTED_CITY_KEY);
  } catch {
    // ignore
  }
}
