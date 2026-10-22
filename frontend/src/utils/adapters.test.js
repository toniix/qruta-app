import { describe, it, expect } from 'vitest';
import { normalizeStop } from './adapters';

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
