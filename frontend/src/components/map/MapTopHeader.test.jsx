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
      selectedRoute={props.selectedRoute !== undefined ? props.selectedRoute : route}
      selectedStop={props.selectedStop !== undefined ? props.selectedStop : stop}
      onCloseDetail={props.onCloseDetail ?? (() => {})}
      onClearStop={props.onClearStop ?? (() => {})}
      onBack={props.onBack}
      destinationActive={props.destinationActive}
      onCloseDestination={props.onCloseDestination}
    />
  );
}

describe('MapTopHeader focused stop pill and back navigation', () => {
  it('renders a back button to return to route detail when a stop is focused inside route', () => {
    renderHeader();

    expect(
      screen.getByRole('button', { name: 'Volver al detalle de ruta' }),
    ).toBeInTheDocument();
  });

  it('clicking back button clears the focused stop', () => {
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

  it('hierarchical navigation: back button clears focused stop before calling external onBack', () => {
    const onBack = vi.fn();
    const onClearStop = vi.fn();
    renderHeader({ onBack, onClearStop, selectedStop: stop });

    const backBtn = screen.getByRole('button', { name: 'Volver al detalle de ruta' });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(onClearStop).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();
  });
});

describe('MapTopHeader contextual back button behavior', () => {
  it('does NOT render back button when onBack is omitted in route detail (no stop focused)', () => {
    renderHeader({ onBack: null, selectedStop: null });

    expect(
      screen.queryByRole('button', { name: 'Volver' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Volver al detalle de ruta' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cerrar vista de detalle' }),
    ).toBeInTheDocument();
  });

  it('renders back button and calls onBack when onBack is provided in route detail (no stop focused)', () => {
    const onBack = vi.fn();
    renderHeader({ onBack, selectedStop: null });

    const backBtn = screen.getByRole('button', { name: 'Volver' });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders contextual back and close buttons correctly for standalone stop', () => {
    const onBack = vi.fn();
    const onClearStop = vi.fn();

    renderHeader({
      selectedRoute: null,
      selectedStop: stop,
      onBack,
      onClearStop,
    });

    const backBtn = screen.getByRole('button', { name: 'Volver' });
    const closeBtn = screen.getByRole('button', { name: 'Cerrar paradero' });

    expect(backBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(onClearStop).toHaveBeenCalledTimes(1);
  });

  it('does not render back button for standalone stop if onBack is omitted', () => {
    renderHeader({
      selectedRoute: null,
      selectedStop: stop,
      onBack: null,
    });

    expect(
      screen.queryByRole('button', { name: 'Volver' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cerrar paradero' }),
    ).toBeInTheDocument();
  });
});
