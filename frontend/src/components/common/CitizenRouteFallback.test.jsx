import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CitizenRouteFallback } from './CitizenRouteFallback';

describe('CitizenRouteFallback', () => {
  it('renders MapSkeleton for /mapa routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/mapa']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    // MapSkeleton has dark background (bg-slate-900)
    expect(container.querySelector('.bg-slate-900')).toBeTruthy();
  });

  it('renders RoutesListSkeleton for /rutas route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/rutas']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    expect(container.querySelector('.bg-slate-50\\/70')).toBeTruthy();
  });

  it('renders SearchSkeleton for /buscar route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/buscar']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    expect(container.querySelector('.max-w-lg')).toBeTruthy();
  });

  it('renders CommunitySkeleton for /comunidad route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/comunidad']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    expect(container.querySelector('.rounded-full.bg-slate-200')).toBeTruthy();
  });

  it('renders HomeSkeleton for root / route', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    expect(container.querySelector('.bg-brand-navy')).toBeTruthy();
  });

  it('renders default fallback for other routes', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/cercanas']}>
        <CitizenRouteFallback />
      </MemoryRouter>
    );
    expect(container.querySelector('.bg-slate-50\\/70')).toBeTruthy();
  });
});
