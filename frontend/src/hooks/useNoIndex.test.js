import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNoIndex } from './useNoIndex';

describe('useNoIndex', () => {
  afterEach(() => {
    document.querySelectorAll('meta[name="robots"]').forEach((node) => node.remove());
    document.title = 'QRuta';
  });

  it('creates meta[name="robots"] with noindex, nofollow and removes it on unmount', () => {
    expect(document.querySelector('meta[name="robots"]')).toBeNull();

    const { unmount } = renderHook(() => useNoIndex());

    const meta = document.querySelector('meta[name="robots"]');
    expect(meta).not.toBeNull();
    expect(meta.getAttribute('content')).toBe('noindex, nofollow');

    unmount();

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('preserves and restores an existing meta[name="robots"] tag on unmount', () => {
    const existing = document.createElement('meta');
    existing.setAttribute('name', 'robots');
    existing.setAttribute('content', 'index, follow');
    document.head.appendChild(existing);

    const { unmount } = renderHook(() => useNoIndex());

    expect(existing.getAttribute('content')).toBe('noindex, nofollow');

    unmount();

    expect(document.querySelector('meta[name="robots"]')).toBe(existing);
    expect(existing.getAttribute('content')).toBe('index, follow');
  });

  it('updates document.title when provided and restores it on unmount', () => {
    document.title = 'QRuta · Inicio';

    const { unmount } = renderHook(() => useNoIndex('Administración · QRuta'));
    expect(document.title).toBe('Administración · QRuta');

    unmount();
    expect(document.title).toBe('QRuta · Inicio');
  });
});
