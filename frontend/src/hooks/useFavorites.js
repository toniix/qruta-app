import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rutasya:favoritos';

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

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => readStore());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* storage full or unavailable — state already reflects the intent */
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (routeId) => favorites.some((f) => String(f.id) === String(routeId)),
    [favorites],
  );

  const toggleFavorite = useCallback((route) => {
    if (!route?.id) return;
    setFavorites((prev) => {
      const exists = prev.some((f) => String(f.id) === String(route.id));
      if (exists) {
        return prev.filter((f) => String(f.id) !== String(route.id));
      }
      return [
        {
          id: route.id,
          code: route.code || null,
          name: route.name || '',
          color: route.color || null,
          fare: route.fare || null,
          transportLineName: route.transportLineName || null,
          savedAt: Date.now(),
        },
        ...prev,
      ];
    });
  }, []);

  const removeFavorite = useCallback((routeId) => {
    setFavorites((prev) => prev.filter((f) => String(f.id) !== String(routeId)));
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}
