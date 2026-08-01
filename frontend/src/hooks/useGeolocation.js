import { useState, useCallback } from 'react';

// Default centered on Ica, Perú
const ICA_DEFAULT = { lat: -14.0678, lng: -75.7286 };

export function useGeolocation(defaultLocation = ICA_DEFAULT) {
  const [location, setLocation] = useState(defaultLocation);
  const [isLocating, setIsLocating] = useState(false);
  const [hasCustomLocation, setHasCustomLocation] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está soportada en este navegador');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setHasCustomLocation(true);
        setIsLocating(false);
      },
      (err) => {
        let msg = 'No se pudo obtener tu ubicación actual.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permiso de ubicación denegado por el usuario.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Información de ubicación no disponible.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'La solicitud de ubicación expiró.';
        }
        setError(msg);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  return {
    location,
    isLocating,
    hasCustomLocation,
    error,
    requestLocation,
    setLocation,
  };
}
