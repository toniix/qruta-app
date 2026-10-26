import { describe, it, expect, beforeEach } from "vitest";
import {
  readCachedCities,
  saveCachedCities,
  readInitialCity,
  persistSelectedCity,
  clearSelectedCityId,
  CITIES_CACHE_KEY,
  CACHED_CITY_KEY,
  SELECTED_CITY_KEY,
  CITIES_CACHE_TTL_MS,
} from "./cityCache";

describe("cityCache utility", () => {
  const MOCK_CITIES = [
    { id: "c1", name: "Ica" },
    { id: "c2", name: "Lima" },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  describe("readCachedCities / saveCachedCities", () => {
    it("returns null when cache is empty", () => {
      expect(readCachedCities()).toBeNull();
    });

    it("saves and reads valid cache within TTL", () => {
      saveCachedCities(MOCK_CITIES);
      const result = readCachedCities();
      expect(result).toEqual(MOCK_CITIES);
    });

    it("returns null and ignores expired cache exceeding TTL", () => {
      const expiredPayload = {
        timestamp: Date.now() - (CITIES_CACHE_TTL_MS + 1000),
        cities: MOCK_CITIES,
      };
      localStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(expiredPayload));
      expect(readCachedCities()).toBeNull();
    });

    it("handles corrupted JSON gracefully", () => {
      localStorage.setItem(CITIES_CACHE_KEY, "{invalid-json");
      expect(readCachedCities()).toBeNull();
    });
  });

  describe("readInitialCity", () => {
    it("returns null city when nothing is stored and no cached cities exist", () => {
      expect(readInitialCity(null)).toEqual({ city: null, isManual: false });
    });

    it("selects manual city if saved ID matches a cached city", () => {
      localStorage.setItem(SELECTED_CITY_KEY, "c2");
      const result = readInitialCity(MOCK_CITIES);
      expect(result).toEqual({ city: MOCK_CITIES[1], isManual: true });
    });

    it("falls back to Ica when no manual selection exists", () => {
      const result = readInitialCity(MOCK_CITIES);
      expect(result).toEqual({ city: MOCK_CITIES[0], isManual: false });
    });

    it("reads cached city object if present in localStorage", () => {
      localStorage.setItem(CACHED_CITY_KEY, JSON.stringify(MOCK_CITIES[1]));
      const result = readInitialCity([]);
      expect(result).toEqual({ city: MOCK_CITIES[1], isManual: false });
    });
  });

  describe("persistSelectedCity / clearSelectedCityId", () => {
    it("persists manual selection with ID and cached object", () => {
      persistSelectedCity(MOCK_CITIES[0], true);
      expect(localStorage.getItem(SELECTED_CITY_KEY)).toBe("c1");
      expect(JSON.parse(localStorage.getItem(CACHED_CITY_KEY))).toEqual(
        MOCK_CITIES[0],
      );
    });

    it("clears selection ID when clearing or auto-detecting", () => {
      localStorage.setItem(SELECTED_CITY_KEY, "c1");
      clearSelectedCityId();
      expect(localStorage.getItem(SELECTED_CITY_KEY)).toBeNull();
    });
  });
});
