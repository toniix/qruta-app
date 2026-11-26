import { describe, expect, it } from 'vitest';
import { decodeBase64Url, isJwtExpired, parseJwtPayload } from './jwtUtils';

function encodeBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('jwtUtils', () => {
  it('decodes base64url strings including multi-byte UTF-8 characters', () => {
    const original = JSON.stringify({ name: 'José María · Perú 🚌', role: 'ROLE_ADMIN' });
    const encoded = encodeBase64Url(original);

    expect(decodeBase64Url(encoded)).toBe(original);
  });

  it('parses valid JWT payloads and returns null for invalid inputs', () => {
    const token = makeJwt({ sub: 'admin@qruta.pe', role: 'ROLE_ADMIN', fullName: 'Sofía Pérez' });

    expect(parseJwtPayload(token)).toEqual({
      sub: 'admin@qruta.pe',
      role: 'ROLE_ADMIN',
      fullName: 'Sofía Pérez',
    });
    expect(parseJwtPayload(null)).toBeNull();
    expect(parseJwtPayload('')).toBeNull();
    expect(parseJwtPayload('not-a-jwt')).toBeNull();
    expect(parseJwtPayload('a.!!!invalid-base64!!!.c')).toBeNull();
  });

  it('detects expired, active, and non-expiring JWT tokens', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const pastExp = Math.floor(Date.now() / 1000) - 60;

    expect(isJwtExpired(makeJwt({ sub: 'a@b.pe', exp: pastExp }))).toBe(true);
    expect(isJwtExpired(makeJwt({ sub: 'a@b.pe', exp: futureExp }))).toBe(false);
    expect(isJwtExpired(makeJwt({ sub: 'a@b.pe' }))).toBe(false);
    expect(isJwtExpired('malformed')).toBe(false);
  });
});
