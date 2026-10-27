import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prefetchRoute,
  scheduleIdlePrefetch,
  ROUTE_LOADERS,
  _resetPrefetchCache,
} from './routePrefetch';

describe('routePrefetch utility', () => {
  beforeEach(() => {
    _resetPrefetchCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetPrefetchCache();
  });

  it('triggers the corresponding loader when prefetching a route', () => {
    const mockLoader = vi.fn().mockResolvedValue({});
    ROUTE_LOADERS['/rutas'] = mockLoader;

    prefetchRoute('/rutas');

    expect(mockLoader).toHaveBeenCalledTimes(1);
  });

  it('does not re-trigger loader if already prefetched', () => {
    const mockLoader = vi.fn().mockResolvedValue({});
    ROUTE_LOADERS['/rutas'] = mockLoader;

    prefetchRoute('/rutas');
    prefetchRoute('/rutas');

    expect(mockLoader).toHaveBeenCalledTimes(1);
  });

  it('matches sub-paths to base loader', () => {
    const mockLoader = vi.fn().mockResolvedValue({});
    ROUTE_LOADERS['/mapa'] = mockLoader;

    prefetchRoute('/mapa/ruta/route-123');

    expect(mockLoader).toHaveBeenCalledTimes(1);
  });

  it('does not crash if path does not exist in loaders', () => {
    expect(() => prefetchRoute('/unknown-path')).not.toThrow();
  });

  it('schedules idle prefetch for specified routes', () => {
    const mockRutas = vi.fn().mockResolvedValue({});
    const mockMapa = vi.fn().mockResolvedValue({});
    ROUTE_LOADERS['/rutas'] = mockRutas;
    ROUTE_LOADERS['/mapa'] = mockMapa;

    vi.useFakeTimers();
    scheduleIdlePrefetch(['/rutas', '/mapa'], 1000);
    vi.runAllTimers();

    expect(mockRutas).toHaveBeenCalledTimes(1);
    expect(mockMapa).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('skips prefetching if navigator.connection.saveData is enabled', () => {
    const mockLoader = vi.fn().mockResolvedValue({});
    ROUTE_LOADERS['/rutas'] = mockLoader;

    const originalConnection = navigator.connection;
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      configurable: true,
    });

    vi.useFakeTimers();
    scheduleIdlePrefetch(['/rutas'], 1000);
    vi.runAllTimers();

    expect(mockLoader).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'connection', {
      value: originalConnection,
      configurable: true,
    });
    vi.useRealTimers();
  });
});
