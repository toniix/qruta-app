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

  it('exposes slug from raw.slug and falls back to null', () => {
    const stopWithSlug = normalizeStop({ id: 'stop-4', name: 'El Quinde', slug: 'el-quinde' });
    expect(stopWithSlug.slug).toBe('el-quinde');

    const stopWithoutSlug = normalizeStop({ id: 'stop-5', name: 'Sin Slug' });
    expect(stopWithoutSlug.slug).toBeNull();
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

  it('populates transportLineName from transportLine.company fallback', () => {
    const route = normalizeRoute({
      id: 'route-3',
      code: 'R103',
      name: 'Ruta 103',
      transportLine: { company: 'Empresa San Jerónimo' },
    });

    expect(route.transportLineName).toBe('Empresa San Jerónimo');
  });

  it('populates transportLineName and transportLineId from RouteDetailResponse transportLine.name', () => {
    const route = normalizeRoute({
      id: 'route-3b',
      code: 'R103B',
      name: 'Ruta 103B',
      transportLine: { id: 'line-9', name: 'Empresa Detalle' },
    });

    expect(route.transportLineId).toBe('line-9');
    expect(route.transportLineName).toBe('Empresa Detalle');
  });

  it('prefers raw transportLineName over transportLine.company', () => {
    const route = normalizeRoute({
      id: 'route-4',
      code: 'R104',
      name: 'Ruta 104',
      transportLineName: 'Empresa Principal',
      transportLine: { company: 'Empresa Secundaria' },
    });

    expect(route.transportLineName).toBe('Empresa Principal');
  });
});
