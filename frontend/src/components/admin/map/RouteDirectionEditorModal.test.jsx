import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  escapeHtml,
  createNumberedStopIcon,
  RouteDirectionEditorModal,
} from './RouteDirectionEditorModal';
import { ToastProvider } from '../common/ToastContext';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => children,
  TileLayer: () => null,
  Marker: () => null,
  Polyline: () => null,
  Popup: ({ children }) => children,
  useMap: () => ({ fitBounds: () => {}, setView: () => {} }),
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
});
