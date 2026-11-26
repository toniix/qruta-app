import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OperatorQrListPage } from './OperatorQrListPage';
import { operatorQrCodeService } from '../../services/qrCodeService';
import { operatorPortalService } from '../../services/operatorPortalService';
import { renderWithQueryClient } from '../../test/queryTestUtils';

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../services/qrCodeService', () => ({
  operatorQrCodeService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../services/operatorPortalService', () => ({
  operatorPortalService: {
    getRoutes: vi.fn(),
    getStops: vi.fn(),
  },
}));

vi.mock('../../hooks/useAdminToast', () => ({
  useAdminToast: () => toastMock,
}));

const mockQrCodes = [
  {
    id: 'op-qr-1',
    code: 'op123456',
    label: 'QR Bus 101',
    targetType: 'ROUTE',
    targetTitle: 'Ruta 1 - Troncal',
    campaignSource: 'bus_sticker',
    totalScans: 88,
    status: 'ACTIVE',
    canonicalUrl: 'https://qruta.pe/q/op123456',
  },
];

describe('OperatorQrListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operatorQrCodeService.getAll.mockResolvedValue(mockQrCodes);
    operatorPortalService.getRoutes.mockResolvedValue([]);
    operatorPortalService.getStops.mockResolvedValue([]);
  });

  it('renders operator QR list and title', async () => {
    renderWithQueryClient(
      <MemoryRouter>
        <OperatorQrListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Códigos QR de la Empresa')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('QR Bus 101')).toBeInTheDocument();
      expect(screen.getByText('op123456')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /Eliminar código QR/i })
    ).not.toBeInTheDocument();
  });

  it('opens creation modal on clicking button', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <MemoryRouter>
        <OperatorQrListPage />
      </MemoryRouter>
    );

    const newBtn = screen.getByRole('button', { name: /Nuevo Código QR/i });
    await user.click(newBtn);

    expect(screen.getByText('Crear Código QR Inteligente')).toBeInTheDocument();
  });

  it('opens the edit modal and submits updates through the operator service', async () => {
    const user = userEvent.setup();
    operatorQrCodeService.getAll.mockResolvedValue([
      { ...mockQrCodes[0], targetType: 'HOME' },
    ]);
    operatorQrCodeService.update.mockResolvedValue({
      ...mockQrCodes[0],
      targetType: 'HOME',
      label: 'QR Bus 101 Actualizado',
    });

    renderWithQueryClient(
      <MemoryRouter>
        <OperatorQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('QR Bus 101')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Editar código QR QR Bus 101' }));

    expect(screen.getByRole('heading', { name: 'Editar Código QR' })).toBeInTheDocument();

    const labelInput = screen.getByPlaceholderText('Ej. Afiche Paradero Plaza Bolognesi');
    expect(labelInput).toHaveValue('QR Bus 101');
    await user.clear(labelInput);
    await user.type(labelInput, 'QR Bus 101 Actualizado');
    await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(operatorQrCodeService.update).toHaveBeenCalledWith(
        'op-qr-1',
        expect.objectContaining({ label: 'QR Bus 101 Actualizado', targetType: 'HOME' })
      );
    });
  });
});
