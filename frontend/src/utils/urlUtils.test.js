import { describe, expect, it } from 'vitest';
import { isSafeHttpsUrl } from './urlUtils';

describe('isSafeHttpsUrl', () => {
  it('accepts valid https URLs', () => {
    expect(isSafeHttpsUrl('https://pay.qruta.pe/checkout/123')).toBe(true);
    expect(isSafeHttpsUrl('  https://example.com:8443/path?foo=bar#hash  ')).toBe(true);
  });

  it('rejects dangerous protocols and non-https schemes', () => {
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('JAVASCRIPT:alert(1)')).toBe(false);
    expect(isSafeHttpsUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpsUrl('http://pay.qruta.pe/checkout/123')).toBe(false);
    expect(isSafeHttpsUrl('ftp://files.example.com/file.pdf')).toBe(false);
    expect(isSafeHttpsUrl('mailto:soporte@qruta.pe')).toBe(false);
  });

  it('rejects relative paths, protocol-relative URLs, and invalid inputs', () => {
    expect(isSafeHttpsUrl('/checkout/123')).toBe(false);
    expect(isSafeHttpsUrl('//pay.qruta.pe/checkout/123')).toBe(false);
    expect(isSafeHttpsUrl('pay.qruta.pe/checkout/123')).toBe(false);
    expect(isSafeHttpsUrl('')).toBe(false);
    expect(isSafeHttpsUrl('   ')).toBe(false);
    expect(isSafeHttpsUrl(null)).toBe(false);
    expect(isSafeHttpsUrl(undefined)).toBe(false);
    expect(isSafeHttpsUrl(42)).toBe(false);
    expect(isSafeHttpsUrl({})).toBe(false);
  });
});
