import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StopLocationPickerModal } from './StopLocationPickerModal';

const leafletMocks = vi.hoisted(() => ({
  handlers: {},
  map: {
    setView: vi.fn(),
    getZoom: vi.fn(() => 15),
    invalidateSize: vi.fn(),
    getContainer: vi.fn(() => document.createElement('div')),
  },
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn((options) => ({ options })),
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="leaflet-map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMap: () => leafletMocks.map,
  useMapEvents: (handlers) => {
    leafletMocks.handlers = handlers;
  },
}));

vi.mock('../../../services/geocodingService', () => ({
  geocodingService: {
    reverseGeocode: vi.fn(),
  },
}));

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onSelectLocation = vi.fn();

  const view = render(
    <StopLocationPickerModal
      open
      onClose={onClose}
      onSelectLocation={onSelectLocation}
      initialCoords={{ latitude: -14.0678, longitude: -75.7286 }}
      {...props}
    />
  );

  return { ...view, onClose, onSelectLocation };
}

describe('StopLocationPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leafletMocks.handlers = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when open is false', () => {
    render(
      <StopLocationPickerModal
        open={false}
        onClose={vi.fn()}
        onSelectLocation={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a native modal dialog with aria-labelledby and closedby="any" without redundant ARIA attributes', () => {
    const showModalSpy = vi.spyOn(HTMLDialogElement.prototype, 'showModal');

    renderModal();

    const dialog = screen.getByRole('dialog', {
      name: 'Seleccionar Ubicación del Paradero',
    });

    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAttribute('closedby', 'any');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).not.toHaveAttribute('role');
    expect(dialog).not.toHaveAttribute('aria-modal');
    expect(showModalSpy).toHaveBeenCalledTimes(1);

    const heading = screen.getByRole('heading', {
      name: 'Seleccionar Ubicación del Paradero',
    });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('invalidates Leaflet map size after opening in the modal dialog', () => {
    const rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    renderModal();

    expect(leafletMocks.map.invalidateSize).not.toHaveBeenCalled();

    act(() => {
      rafCallbacks.forEach((cb) => cb(0));
    });

    expect(leafletMocks.map.invalidateSize).toHaveBeenCalledTimes(1);
    expect(leafletMocks.map.setView).toHaveBeenCalledWith([-14.0678, -75.7286], 15);
  });

  it('calls onClose on native cancel event and close/cancel buttons', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    const dialog = screen.getByRole('dialog', {
      name: 'Seleccionar Ubicación del Paradero',
    });

    const cancelEvent = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cerrar mapa' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('notifies React on native dialog close without double-firing on unmount cleanup', () => {
    const { onClose, rerender } = renderModal();

    const dialog = screen.getByRole('dialog', {
      name: 'Seleccionar Ubicación del Paradero',
    });

    // Simulate browser-initiated native close (e.g. closedby="any" light-dismiss)
    act(() => {
      dialog.close();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Unmounting via open={false} must not call onClose again
    rerender(
      <StopLocationPickerModal
        open={false}
        onClose={onClose}
        onSelectLocation={vi.fn()}
      />
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles light-dismiss fallback only when pointer press and release are both outside the dialog rect', () => {
    const { onClose } = renderModal();

    const dialog = screen.getByRole('dialog', {
      name: 'Seleccionar Ubicación del Paradero',
    });

    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 500,
      top: 100,
      bottom: 500,
      width: 400,
      height: 400,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });

    // Dragging inside the map and releasing outside must NOT dismiss the modal
    fireEvent.pointerDown(dialog, { clientX: 250, clientY: 250 });
    fireEvent.pointerUp(dialog, { clientX: 20, clientY: 20 });
    expect(onClose).not.toHaveBeenCalled();

    // Pressing and releasing outside the dialog rect dismisses in fallback browsers
    fireEvent.pointerDown(dialog, { clientX: 20, clientY: 20 });
    fireEvent.pointerUp(dialog, { clientX: 25, clientY: 25 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectLocation with selected coordinates and closes when confirmed', async () => {
    const user = userEvent.setup();
    const { onClose, onSelectLocation } = renderModal();

    act(() => {
      leafletMocks.handlers.click({ latlng: { lat: -14.123456, lng: -75.654321 } });
    });

    await user.click(screen.getByRole('button', { name: /Confirmar Ubicación/i }));

    expect(onSelectLocation).toHaveBeenCalledTimes(1);
    expect(onSelectLocation).toHaveBeenCalledWith({
      latitude: -14.123456,
      longitude: -75.654321,
      address: undefined,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
