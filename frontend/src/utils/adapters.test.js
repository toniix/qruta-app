import { describe, it, expect } from 'vitest';
import { normalizeStop, normalizeRoute } from './adapters';

describe('normalizeStop imageUrl', () => {
  it('exposes imageUrl from raw.imageUrl', () => {
    const stop = normalizeStop({
      id: 'stop-1',
      name: 'Paradero X',
      imageUrl: 'https://cdn.example.com/stops/stop-1.jpg',
    });

    expect(stop.imageUrl).toBe('https://cdn.example.com/stops/stop-1.jpg');
  });

  it('defaults imageUrl to null when it is absent', () => {
    const stop = normalizeStop({ id: 'stop-2', name: 'Paradero Y' });

    expect(stop.imageUrl).toBeNull();
  });

  it('defaults imageUrl to null when the backend sends null', () => {
    const stop = normalizeStop({ id: 'stop-3', name: 'Paradero Z', imageUrl: null });

    expect(stop.imageUrl).toBeNull();
  });
});

describe('normalizeRoute category', () => {
  it('preserves category when provided', () => {
    const route = normalizeRoute({
      id: 'route-1',
      code: 'R101',
      name: 'Ruta Combi',
      category: 'COMBI',
    });

    expect(route.category).toBe('COMBI');
  });

  it('defaults category to MICRO when absent', () => {
    const route = normalizeRoute({
      id: 'route-2',
      code: 'R102',
      name: 'Ruta Micro',
    });

    expect(route.category).toBe('MICRO');
  });

  it('returns null when input is null or undefined', () => {
    expect(normalizeRoute(null)).toBeNull();
    expect(normalizeRoute(undefined)).toBeNull();
  });
});
