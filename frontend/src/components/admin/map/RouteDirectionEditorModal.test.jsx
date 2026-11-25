import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteDirectionEditorModal } from './RouteDirectionEditorModal';
import { escapeHtml, createNumberedStopIcon } from './routeGeometryUtils';
import { ToastProvider } from '../common/ToastContext';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';

const mapEvents = vi.hoisted(() => ({ handlers: {} }));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  Marker: () => null,
  Polyline: () => null,
  Popup: ({ children }) => children,
  useMap: () => ({ fitBounds: () => {}, setView: () => {} }),
  useMapEvents: (handlers) => {
    mapEvents.handlers = handlers;
  },
}));

vi.mock('../../../services/adminRouteService', () => ({
  adminRouteService: { getRouteById: vi.fn(), updateRouteDirections: vi.fn() },
}));

vi.mock('../../../services/adminStopService', () => ({
  adminStopService: { getAllStops: vi.fn() },
}));

function renderEditor(props = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const routeService = {
    getRouteById: vi.fn().mockResolvedValue({ directions: [] }),
    updateRouteDirections: vi.fn().mockResolvedValue({}),
  };
  const stopService = {
    getAllStops: vi.fn().mockResolvedValue([]),
  };

  render(
    <ToastProvider>
      <RouteDirectionEditorModal
        open
        route={{ id: 'route-1', code: 'R1' }}
        onClose={onClose}
        onSaved={onSaved}
        routeService={routeService}
        stopService={stopService}
        allowQuickCreate={false}
        {...props}
      />
    </ToastProvider>
  );

  return { onClose, onSaved, routeService, stopService };
}

describe('RouteDirectionEditorModal Security & DOM Rendering', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      const malicious = '<script>alert("XSS")</script>&\'';
      expect(escapeHtml(malicious)).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&#39;'
      );
    });

    it('handles null, undefined and empty values safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml('')).toBe('');
    });

    it('converts non-string inputs to string before escaping', () => {
      expect(escapeHtml(12345)).toBe('12345');
      expect(escapeHtml(0)).toBe('0');
    });
  });

  describe('createNumberedStopIcon', () => {
    it('creates a Leaflet divIcon with escaped stop name preventing DOM injection', () => {
      const maliciousStopName = 'Paradero Central <img src="x" onerror="window.__xss_executed=true">';
      const icon = createNumberedStopIcon(1, maliciousStopName);

      expect(icon).toBeDefined();
      expect(icon.options).toBeDefined();
      expect(icon.options.html).toBeDefined();

      // Simulate browser rendering into DOM container
      const container = document.createElement('div');
      container.innerHTML = icon.options.html;

      // Invariant: no active image or script element should be instantiated in the DOM
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('script')).toBeNull();

      // Invariant: text content contains the sanitized representation
      expect(container.textContent).toContain('Paradero Central <img src="x" onerror="window.__xss_executed=true">');
      expect(container.textContent).toContain('1');
    });

    it('renders normal stop names accurately', () => {
      const icon = createNumberedStopIcon(4, 'Plaza de Armas');
      const container = document.createElement('div');
      container.innerHTML = icon.options.html;

      expect(container.textContent).toContain('4');
      expect(container.textContent).toContain('Plaza de Armas');
    });

    it('handles empty stop names without rendering undefined or null text', () => {
      const icon = createNumberedStopIcon(2, null);
      const container = document.createElement('div');
      container.innerHTML = icon.options.html;

      expect(container.textContent).toContain('2');
      expect(container.textContent).not.toContain('null');
      expect(container.textContent).not.toContain('undefined');
    });
  });
});

describe('RouteDirectionEditorModal service injection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads through injected services and hides quick-create for operator mode', async () => {
    const { routeService, stopService } = renderEditor();

    await waitFor(() => expect(routeService.getRouteById).toHaveBeenCalledWith('route-1'));
    expect(stopService.getAllStops).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Nuevo paradero en esta ciudad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Crear el primer paradero de esta ciudad/i)).not.toBeInTheDocument();
    expect(adminRouteService.getRouteById).not.toHaveBeenCalled();
    expect(adminStopService.getAllStops).not.toHaveBeenCalled();
  });

  it('saves through the injected route service', async () => {
    const user = userEvent.setup();
    const { routeService, onSaved } = renderEditor();

    await waitFor(() => expect(routeService.getRouteById).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: /Guardar Sentidos y Trazado/i }));

    await waitFor(() => expect(routeService.updateRouteDirections).toHaveBeenCalledTimes(1));
    expect(routeService.updateRouteDirections).toHaveBeenCalledWith(
      'route-1',
      expect.objectContaining({ directions: expect.any(Array) })
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(adminRouteService.updateRouteDirections).not.toHaveBeenCalled();
  });

  it('falls back to getStops when stopService omits getAllStops', async () => {
    const stopService = {
      getStops: vi.fn().mockResolvedValue([{ id: 's-op', name: 'Paradero Operador' }]),
    };

    renderEditor({ stopService });

    await waitFor(() => expect(stopService.getStops).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Paradero Operador/)).toBeInTheDocument();
  });
});

describe('RouteDirectionEditorModal geometry editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapEvents.handlers = {};
  });

  const detailWith = (routePoints, stops = [{ id: 's1', stopOrder: 1, latitude: -14.01, longitude: -75.70 }]) => ({
    directions: [{ id: 'd1', direction: 'IDA', stops, routePoints }],
  });

  it('draws stored geometry instead of falling back to stops', async () => {
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(
        detailWith([[-14.10, -75.80], [-14.11, -75.81]])
      ),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });

    await waitFor(() => expect(screen.getByText(/2 puntos de trazado/)).toBeInTheDocument());
    expect(screen.queryByText(/fallback de paraderos/)).not.toBeInTheDocument();
  });

  it('adds a custom point when the map is clicked in edit mode', async () => {
    const user = userEvent.setup();
    const { routeService } = renderEditor();

    await waitFor(() => expect(screen.getByRole('button', { name: /Editar trazado/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Editar trazado/i }));
    await act(async () => {
      mapEvents.handlers.click({ latlng: { lat: -14.2, lng: -75.9 } });
    });

    expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Guardar Sentidos y Trazado/i }));
    await waitFor(() => expect(routeService.updateRouteDirections).toHaveBeenCalledTimes(1));
    expect(routeService.updateRouteDirections.mock.calls[0][1].directions[0].routePoints).toEqual([
      { pointOrder: 1, latitude: -14.2, longitude: -75.9 },
    ]);
  });

  it('initializes geometry from stops only when there are no points', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([])),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });

    await waitFor(() => expect(screen.getByText(/fallback de paraderos/)).toBeInTheDocument());
    const initButton = screen.getByRole('button', { name: /Inicializar desde paradas/i });
    expect(initButton).not.toBeDisabled();
    await user.click(initButton);
    expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument();
    expect(initButton).toBeDisabled();
  });

  it('saves the edited geometry and never regenerates it from stops', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([[-14.30, -76.00]])),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });
    await waitFor(() => expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Guardar Sentidos y Trazado/i }));

    await waitFor(() => expect(routeService.updateRouteDirections).toHaveBeenCalledTimes(1));
    expect(routeService.updateRouteDirections.mock.calls[0][1].directions[0].routePoints).toEqual([
      { pointOrder: 1, latitude: -14.30, longitude: -76.00 },
    ]);
  });

  it('locks a point that belongs to a stop', async () => {
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([[-14.01, -75.70]])),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });

    await waitFor(() => expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument());
    expect(screen.getByText('paradero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Eliminar punto/i })).toBeDisabled();
  });

  it('removes the linked point when its stop is removed', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([[-14.01, -75.70]])),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });
    await waitFor(() => expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Eliminar paradero/i }));

    expect(screen.getByText(/0 puntos de trazado/)).toBeInTheDocument();
    expect(screen.getByText(/No hay paraderos agregados/i)).toBeInTheDocument();
  });

  it('keeps custom points deletable', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([[-14.55, -76.45]])),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };

    renderEditor({ routeService });
    await waitFor(() => expect(screen.getByText(/1 puntos de trazado/)).toBeInTheDocument());
    const deleteButton = screen.getByRole('button', { name: /Eliminar punto/i });
    expect(deleteButton).not.toBeDisabled();
    await user.click(deleteButton);
    expect(screen.getByText(/0 puntos de trazado/)).toBeInTheDocument();
  });

  it('preserves zero totalDistanceKm and disables duplicate stop selection', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue({
        directions: [
          {
            id: 'd1',
            direction: 'IDA',
            totalDistanceKm: 0,
            estimatedMinutes: 20,
            stops: [{ id: 's1', name: 'Paradero Uno', stopOrder: 1, latitude: -14.01, longitude: -75.70 }],
            routePoints: [],
          },
        ],
      }),
      updateRouteDirections: vi.fn().mockResolvedValue({}),
    };
    const stopService = {
      getAllStops: vi.fn().mockResolvedValue([
        { id: 's1', name: 'Paradero Uno', latitude: -14.01, longitude: -75.70 },
        { id: 's2', name: 'Paradero Dos', latitude: -14.02, longitude: -75.71 },
      ]),
    };

    renderEditor({ routeService, stopService });
    await waitFor(() => expect(screen.getByRole('option', { name: /Paradero Uno.*Ya agregado/i })).toBeDisabled());
    expect(screen.getByRole('option', { name: /Paradero Dos/i })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Guardar Sentidos y Trazado/i }));
    await waitFor(() => expect(routeService.updateRouteDirections).toHaveBeenCalledTimes(1));
    expect(routeService.updateRouteDirections.mock.calls[0][1].directions[0].totalDistanceKm).toBe(0);
  });

  it('surfaces backend field errors when save returns 400 without message', async () => {
    const user = userEvent.setup();
    const routeService = {
      getRouteById: vi.fn().mockResolvedValue(detailWith([])),
      updateRouteDirections: vi.fn().mockRejectedValue({
        response: { data: { errors: { 'directions[0].stopIdUnique': 'Paradero repetido' } } },
      }),
    };

    renderEditor({ routeService });
    await waitFor(() => expect(routeService.getRouteById).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: /Guardar Sentidos y Trazado/i }));

    await waitFor(() => expect(screen.getByText('Paradero repetido')).toBeInTheDocument());
  });
});
