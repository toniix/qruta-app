import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGeolocation } from './useGeolocation';

const COORDS = { latitude: -14.06, longitude: -75.72, accuracy: 12 };

/**
 * jsdom ships neither `navigator.geolocation` nor `navigator.permissions`.
 * Each test installs the exact surface it needs and `afterEach` removes it
 * again so the mount effect never auto-requests across tests.
 */
function installGeolocation(getCurrentPosition) {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
}

function removePermissions() {
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: undefined,
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: undefined,
  });
});

describe('useGeolocation status machine', () => {
  it('starts idle with no location and no derived flags set', () => {
    installGeolocation(vi.fn());
    removePermissions();

    const { result } = renderHook(() => useGeolocation());

    expect(result.current.gpsStatus).toBe('idle');
    expect(result.current.gpsReady).toBe(false);
    expect(result.current.isLocating).toBe(false);
    expect(result.current.location).toBeNull();
  });

  it('reports locating while the request is in flight, then ready with the coords', async () => {
    let captured;
    installGeolocation((success) => {
      captured = success;
    });
    removePermissions();

    const { result } = renderHook(() => useGeolocation());

    let pending;
    act(() => {
      pending = result.current.requestLocation();
    });

    expect(result.current.gpsStatus).toBe('locating');
    expect(result.current.isLocating).toBe(true);
    expect(result.current.gpsReady).toBe(false);

    await act(async () => {
      captured({ coords: COORDS });
      await pending;
    });

    expect(result.current.gpsStatus).toBe('ready');
    expect(result.current.gpsReady).toBe(true);
    expect(result.current.isLocating).toBe(false);
    expect(result.current.location).toMatchObject({
      lat: -14.06,
      lng: -75.72,
      accuracy: 12,
    });
  });

  it('resolves with the coords on success', async () => {
    installGeolocation((success) => success({ coords: COORDS }));
    removePermissions();

    const { result } = renderHook(() => useGeolocation());

    let resolved;
    await act(async () => {
      resolved = await result.current.requestLocation();
    });

    expect(resolved).toMatchObject({ lat: -14.06, lng: -75.72, accuracy: 12 });
    expect(result.current.gpsStatus).toBe('ready');
  });

  it('transitions to error and rejects when permission is denied', async () => {
    const denial = {
      code: 1,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };
    installGeolocation((_success, error) => error(denial));
    removePermissions();

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await expect(result.current.requestLocation()).rejects.toBe(
        'Permiso de ubicación denegado por el usuario.',
      );
    });

    expect(result.current.gpsStatus).toBe('error');
    expect(result.current.gpsReady).toBe(false);
  });

  it('transitions to error when geolocation is unsupported', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    removePermissions();

    const { result } = renderHook(() => useGeolocation());

    await act(async () => {
      await expect(result.current.requestLocation()).rejects.toBe(
        'La geolocalización no está soportada en este navegador',
      );
    });

    expect(result.current.gpsStatus).toBe('error');
  });
});
