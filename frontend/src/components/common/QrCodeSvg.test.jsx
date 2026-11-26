import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QrCodeSvg } from './QrCodeSvg';

describe('QrCodeSvg', () => {
  it('renders a declarative accessible SVG with rect and path', () => {
    const { container } = render(
      <QrCodeSvg value="https://qruta.pe/q/abc123" label="Código QR de prueba" />,
    );

    const svg = screen.getByRole('img', { name: 'Código QR de prueba' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('shape-rendering', 'crispEdges');
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 \d+ \d+$/);

    const rect = container.querySelector('rect');
    const path = container.querySelector('path');
    expect(rect).toHaveAttribute('fill', '#ffffff');
    expect(path).toHaveAttribute('fill', '#0f172a');
    expect(path?.getAttribute('d')).toBeTruthy();
  });

  it('respects custom colors and margin', () => {
    const { container } = render(
      <QrCodeSvg
        value="https://qruta.pe/q/abc123"
        margin={3}
        darkColor="#111b2e"
        lightColor="#f7f9fc"
      />,
    );

    const svg = screen.getByRole('img', { name: 'Código QR' });
    const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    expect(w).toBe(h);
    expect(w).toBeGreaterThanOrEqual(27);

    expect(container.querySelector('rect')).toHaveAttribute('fill', '#f7f9fc');
    expect(container.querySelector('path')).toHaveAttribute('fill', '#111b2e');
  });
});
