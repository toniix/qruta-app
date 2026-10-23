import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapTopHeader } from './MapTopHeader';

// SearchBar transitively imports services/hooks that are irrelevant to the
// route branch under test; stub it to keep jsdom light.
vi.mock('../search/SearchBar', () => ({
  SearchBar: () => <div data-testid="search-bar-stub" />,
}));

const route = {
  id: 'route-1',
  code: '12A',
  name: 'Ruta 12A: Centro',
  color: '#3b82f6',
};
const stop = { id: 'stop-1', name: 'Paradero Central' };

function renderHeader(props = {}) {
  return render(
    <MapTopHeader
      selectedRoute={route}
      selectedStop={stop}
      onCloseDetail={props.onCloseDetail ?? (() => {})}
      onClearStop={props.onClearStop ?? (() => {})}
    />
  );
}

describe('MapTopHeader focused stop pill', () => {
  it('renders a back-to-route-detail arrow on the focused-stop pill', () => {
    renderHeader();

    expect(
      screen.getByRole('button', { name: 'Volver al detalle de ruta' }),
    ).toBeInTheDocument();
  });

  it('clicking the pill arrow clears the focused stop', () => {
    const onClearStop = vi.fn();
    renderHeader({ onClearStop });

    fireEvent.click(
      screen.getByRole('button', { name: 'Volver al detalle de ruta' }),
    );
    expect(onClearStop).toHaveBeenCalledTimes(1);
  });

  it('route main-row close button still closes the route detail', () => {
    const onCloseDetail = vi.fn();
    renderHeader({ onCloseDetail });

    fireEvent.click(
      screen.getByRole('button', { name: 'Cerrar vista de detalle' }),
    );
    expect(onCloseDetail).toHaveBeenCalledTimes(1);
  });
});
