import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouteCreateWizard } from './RouteCreateWizard';
import { ToastProvider } from '../../../components/admin/common/ToastContext';
import { apiClient } from '../../../services/apiClient';

vi.mock('../../../services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const CITY = { id: '11111111-1111-4111-8111-111111111111', name: 'Ica', department: 'Ica' };
const LINE = { id: '22222222-2222-4222-8222-222222222222', name: 'Línea 1', code: 'L01', cityId: CITY.id };
const STOP = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Paradero Mercado',
  latitude: -14.06,
  longitude: -75.72,
  cityId: CITY.id,
};
const FOREIGN_STOP = {
  id: '44444444-4444-4434-8434-444444444444',
  name: 'Paradero Lejano',
  latitude: -12.0,
  longitude: -77.0,
  cityId: '99999999-9999-4999-8999-999999999999',
};

function renderWizard() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const utils = render(
    <ToastProvider>
      <RouteCreateWizard open lines={[LINE]} cities={[CITY]} onClose={onClose} onCreated={onCreated} />
    </ToastProvider>
  );
  return { onClose, onCreated, ...utils };
}

describe('RouteCreateWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [STOP, FOREIGN_STOP] });
  });

  it('blocks step 1 with validation errors and advances once basics are valid', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    expect(await screen.findByText(/código de ruta es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/nombre de la ruta es obligatorio/i)).toBeInTheDocument();
    // Still on step 1
    expect(screen.getByPlaceholderText('Ej: R101')).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText('Ej: R101'), 'R101');
    await user.type(screen.getByPlaceholderText(/huacachina/i), 'Huacachina - Centro');
    await user.click(screen.getByRole('button', { name: /siguiente/i }));

    // Step 2: direction details
    expect(await screen.findByText(/tiempo estimado/i)).toBeInTheDocument();
  });

  it('filters stops by city and creates the route with a single POST', async () => {
    const user = userEvent.setup();
    apiClient.post.mockResolvedValueOnce({ data: { id: 'r1', code: 'R101' } });
    const { onCreated, onClose } = renderWizard();

    // Step 1 -> 2 -> 3
    await user.type(screen.getByPlaceholderText('Ej: R101'), 'R101');
    await user.type(screen.getByPlaceholderText(/huacachina/i), 'Huacachina - Centro');
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    await screen.findByText(/tiempo estimado/i);
    await user.click(screen.getByRole('button', { name: /siguiente/i }));
    await screen.findByText(/secuencia de paraderos/i);

    // Only the city stop is offered
    await screen.findByRole('option', { name: /paradero mercado/i });
    expect(screen.queryByRole('option', { name: /paradero lejano/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: STOP.id } });
    await user.click(screen.getByRole('button', { name: /^agregar$/i }));
    expect(await screen.findByText(/lat: -14\.0600/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /crear ruta completa/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/routes',
      expect.objectContaining({
        code: 'R101',
        transportLineId: LINE.id,
        directions: [
          expect.objectContaining({
            direction: 'IDA',
            stops: [expect.objectContaining({ stopId: STOP.id, stopOrder: 1 })],
            routePoints: [
              expect.objectContaining({ pointOrder: 1, latitude: -14.06, longitude: -75.72 }),
            ],
          }),
        ],
      })
    );
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
