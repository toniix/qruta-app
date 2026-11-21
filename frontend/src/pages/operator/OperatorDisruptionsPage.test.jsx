import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorDisruptionsPage, DISRUPTION_TYPES } from './OperatorDisruptionsPage';
import { ToastProvider } from '../../components/admin/common/ToastContext';
import { operatorPortalService } from '../../services/operatorPortalService';

vi.mock('../../services/operatorPortalService', () => ({
  operatorPortalService: {
    getDisruptions: vi.fn(),
    getRoutes: vi.fn(),
    createDisruption: vi.fn(),
    updateDisruption: vi.fn(),
    deleteDisruption: vi.fn(),
  },
}));

const SAMPLE_ROUTES = [
  { id: 'route-1', code: 'R-01', name: 'Ruta 1' },
  { id: 'route-2', code: 'R-02', name: 'Ruta 2' },
];

const SAMPLE_DISRUPTIONS = [
  {
    id: 'disruption-1',
    routeId: 'route-1',
    routeName: 'Ruta 1',
    routeCode: 'R-01',
    type: 'DESVIO',
    description: 'Desvío por obras en Av. Principal',
    startsAt: '2026-11-20T10:00:00.000Z',
    endsAt: '2026-11-20T18:00:00.000Z',
    active: true,
  },
  {
    id: 'disruption-2',
    routeId: 'route-2',
    routeName: 'Ruta 2',
    routeCode: 'R-02',
    type: 'CORTE',
    description: 'Corte por maratón',
    startsAt: '2026-11-21T06:00:00.000Z',
    endsAt: '2026-11-21T12:00:00.000Z',
    active: false,
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <OperatorDisruptionsPage />
    </ToastProvider>
  );
}

describe('OperatorDisruptionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operatorPortalService.getDisruptions.mockResolvedValue(SAMPLE_DISRUPTIONS);
    operatorPortalService.getRoutes.mockResolvedValue(SAMPLE_ROUTES);
    operatorPortalService.createDisruption.mockImplementation(async (payload) => ({
      id: 'disruption-new',
      routeName: 'Ruta 1',
      routeCode: 'R-01',
      ...payload,
    }));
    operatorPortalService.updateDisruption.mockImplementation(async (id, payload) => ({
      ...SAMPLE_DISRUPTIONS.find((d) => d.id === id),
      ...payload,
    }));
  });

  it('exports DISRUPTION_TYPES with the standard types', () => {
    expect(DISRUPTION_TYPES).toEqual([
      { value: 'DESVIO', label: 'Desvío de ruta' },
      { value: 'CORTE', label: 'Corte de vía / tránsito' },
      { value: 'HORARIO', label: 'Cambio de horario' },
      { value: 'PARADERO', label: 'Paradero inhabilitado' },
      { value: 'OTRO', label: 'Otro comunicado' },
    ]);
  });

  it('renders disruptions in the table with friendly type labels', async () => {
    renderPage();

    expect(await screen.findByText('Desvío de ruta')).toBeTruthy();
    expect(await screen.findByText('Corte de vía / tránsito')).toBeTruthy();
    expect(screen.getByText('Desvío por obras en Av. Principal')).toBeTruthy();
    expect(screen.getByText('Corte por maratón')).toBeTruthy();
  });

  it('opens the create drawer with type select set to DESVIO by default', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Desvío de ruta');

    const newButton = screen.getByRole('button', { name: /nuevo desvío/i });
    await user.click(newButton);

    const typeSelect = screen.getByLabelText(/tipo/i);
    expect(typeSelect).toHaveValue('DESVIO');
  });

  it('submits create form calling operatorPortalService.createDisruption with DESVIO type', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Desvío de ruta');

    const newButton = screen.getByRole('button', { name: /nuevo desvío/i });
    await user.click(newButton);

    const descriptionInput = screen.getByRole('textbox', { name: /descripción/i });
    await user.type(descriptionInput, 'Desvío por repavimentación');

    const startsAtInput = screen.getByLabelText(/inicio/i);
    await user.type(startsAtInput, '2026-11-25T08:00');

    const saveButton = screen.getByRole('button', { name: /^guardar$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(operatorPortalService.createDisruption).toHaveBeenCalledWith({
        routeId: 'route-1',
        type: 'DESVIO',
        description: 'Desvío por repavimentación',
        startsAt: '2026-11-25T08:00',
        endsAt: null,
        active: true,
      });
    });
  });

  it('edits an existing disruption and updates via operatorPortalService.updateDisruption', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Desvío de ruta');

    const editButtons = screen.getAllByLabelText('Editar desvío');
    await user.click(editButtons[0]);

    const typeSelect = screen.getByLabelText(/tipo/i);
    expect(typeSelect).toHaveValue('DESVIO');

    await user.selectOptions(typeSelect, 'HORARIO');
    expect(typeSelect).toHaveValue('HORARIO');

    const descriptionInput = screen.getByRole('textbox', { name: /descripción/i });
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Nuevo horario de verano');

    const saveButton = screen.getByRole('button', { name: /^guardar$/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(operatorPortalService.updateDisruption).toHaveBeenCalledWith('disruption-1', {
        type: 'HORARIO',
        description: 'Nuevo horario de verano',
        startsAt: '2026-11-20T10:00',
        endsAt: '2026-11-20T18:00',
        active: true,
      });
    });
  });
});
