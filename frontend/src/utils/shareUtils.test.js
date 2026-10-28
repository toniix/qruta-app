import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildRouteShareData,
  canUseNativeShare,
  getShareLinks,
  copyToClipboard,
  shareRoute,
} from './shareUtils';

describe('shareUtils', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('buildRouteShareData', () => {
    it('returns default fallback data when route is null or undefined', () => {
      const data = buildRouteShareData(null);
      expect(data.title).toBe('QRuta');
      expect(data.text).toBe('Descubrí el recorrido de las rutas en QRuta');
      expect(data.url).toBe('');
    });

    it('formats route information prioritizing code when present', () => {
      const mockRoute = {
        id: 'route-123',
        code: 'R101',
        name: 'Ruta 101: Huancayo - El Tambo',
      };

      const data = buildRouteShareData(mockRoute);
      expect(data.title).toBe('Recorrido de la ruta R101 | QRuta');
      expect(data.text).toBe('Mira el recorrido de la ruta R101 en QRuta');
      expect(data.url).toContain('/mapa/ruta/R101');
    });

    it('falls back to route name when code is generic or missing', () => {
      const mockRoute = {
        id: 'route-456',
        code: 'Ruta',
        name: 'Línea Verde: Terminal - Centro',
      };

      const data = buildRouteShareData(mockRoute);
      expect(data.title).toBe('Recorrido de la ruta Terminal - Centro | QRuta');
      expect(data.text).toBe('Mira el recorrido de la ruta Terminal - Centro en QRuta');
      expect(data.url).toContain('/mapa/ruta/route-456');
    });
  });

  describe('canUseNativeShare', () => {
    it('returns true when navigator.share is a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { share: vi.fn() },
        writable: true,
        configurable: true,
      });
      expect(canUseNativeShare()).toBe(true);
    });

    it('returns false when navigator.share is not available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(canUseNativeShare()).toBe(false);
    });
  });

  describe('getShareLinks', () => {
    it('constructs WhatsApp and Telegram URLs correctly', () => {
      const shareData = {
        text: '¡Mirá esta ruta!',
        url: 'https://rutasya.com/mapa/ruta/123',
      };

      const links = getShareLinks(shareData);
      expect(links.whatsapp).toContain('https://api.whatsapp.com/send?text=');
      expect(links.whatsapp).toContain(encodeURIComponent('https://rutasya.com/mapa/ruta/123'));
      expect(links.telegram).toContain('https://t.me/share/url?url=');
      expect(links.telegram).toContain(encodeURIComponent('https://rutasya.com/mapa/ruta/123'));
    });
  });

  describe('copyToClipboard', () => {
    it('uses navigator.clipboard when available', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'navigator', {
        value: { clipboard: { writeText } },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard('https://rutasya.com/mapa/ruta/123');
      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith('https://rutasya.com/mapa/ruta/123');
    });

    it('returns false when text is empty', async () => {
      const result = await copyToClipboard('');
      expect(result).toBe(false);
    });
  });

  describe('shareRoute', () => {
    it('calls navigator.share when available', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis, 'navigator', {
        value: { share },
        writable: true,
        configurable: true,
      });

      const res = await shareRoute({ id: '1', code: 'A1' });
      expect(res.success).toBe(true);
      expect(res.method).toBe('native');
      expect(share).toHaveBeenCalledTimes(1);
    });

    it('returns aborted: true when user dismisses native share dialog', async () => {
      const abortError = new Error('Share canceled');
      abortError.name = 'AbortError';
      const share = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(globalThis, 'navigator', {
        value: { share },
        writable: true,
        configurable: true,
      });

      const res = await shareRoute({ id: '1', code: 'A1' });
      expect(res.success).toBe(false);
      expect(res.aborted).toBe(true);
    });

    it('returns fallback: true when native share is unsupported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const res = await shareRoute({ id: '1', code: 'A1' });
      expect(res.success).toBe(false);
      expect(res.fallback).toBe(true);
    });
  });
});
