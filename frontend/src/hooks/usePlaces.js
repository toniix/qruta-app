import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rutasya:lugares';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function usePlaces() {
  const [places, setPlaces] = useState(() => readStore());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
    } catch {
      /* storage full or unavailable — state already reflects the intent */
    }
  }, [places]);

  const isSaved = useCallback(
    (id) => places.some((p) => String(p.id) === String(id)),
    [places],
  );

  const addPlace = useCallback((place) => {
    if (!place?.id || !place?.name) return;
    setPlaces((prev) => {
      if (prev.some((p) => String(p.id) === String(place.id))) return prev;
      return [
        {
          id: place.id,
          name: place.name,
          address: place.address || null,
          latitude: place.latitude ?? null,
          longitude: place.longitude ?? null,
          isAccessible: place.isAccessible ?? false,
          savedAt: Date.now(),
        },
        ...prev,
      ];
    });
  }, []);

  const removePlace = useCallback((id) => {
    setPlaces((prev) => prev.filter((p) => String(p.id) !== String(id)));
  }, []);

  const togglePlace = useCallback((place) => {
    if (!place?.id) return;
    setPlaces((prev) => {
      const exists = prev.some((p) => String(p.id) === String(place.id));
      if (exists) {
        return prev.filter((p) => String(p.id) !== String(place.id));
      }
      return [
        {
          id: place.id,
          name: place.name,
          address: place.address || null,
          latitude: place.latitude ?? null,
          longitude: place.longitude ?? null,
          isAccessible: place.isAccessible ?? false,
          savedAt: Date.now(),
        },
        ...prev,
      ];
    });
  }, []);

  return { places, isSaved, addPlace, removePlace, togglePlace };
}
