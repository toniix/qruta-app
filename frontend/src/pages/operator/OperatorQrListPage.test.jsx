import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OperatorQrListPage } from './OperatorQrListPage';
import { operatorQrCodeService } from '../../services/qrCodeService';
import { operatorPortalService } from '../../services/operatorPortalService';

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
  useAdminToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
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
    render(
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
  });

  it('opens creation modal on clicking button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OperatorQrListPage />
      </MemoryRouter>
    );

    const newBtn = screen.getByRole('button', { name: /Nuevo Código QR/i });
    await user.click(newBtn);

    expect(screen.getByText('Crear Código QR Inteligente')).toBeInTheDocument();
  });
});
