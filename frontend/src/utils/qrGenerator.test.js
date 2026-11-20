import { describe, it, expect } from 'vitest';
import { encodeQrMatrix, generateQrSvg } from './qrGenerator';

describe('qrGenerator utility', () => {
  it('encodes short text into a valid 2D matrix', () => {
    const matrix = encodeQrMatrix('https://qruta.pe/q/test1234');
    expect(matrix).toBeDefined();
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);
    // Finder pattern check: top-left corner must be 1 (black)
    expect(matrix[0][0]).toBe(1);
    expect(matrix[0][6]).toBe(1);
    expect(matrix[6][0]).toBe(1);
  });

  it('generates a valid SVG string', () => {
    const svg = generateQrSvg('https://qruta.pe/q/abc');
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<rect');
    expect(svg).toContain('<path');
  });
});
