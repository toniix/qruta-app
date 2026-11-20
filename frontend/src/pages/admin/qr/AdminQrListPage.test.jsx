import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminQrListPage } from './AdminQrListPage';
import { adminQrCodeService } from '../../../services/qrCodeService';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { adminOperatorService } from '../../../services/adminOperatorService';

vi.mock('../../../services/qrCodeService', () => ({
  adminQrCodeService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../../services/adminRouteService', () => ({
  adminRouteService: {
    getAllRoutes: vi.fn(),
  },
}));

vi.mock('../../../services/adminStopService', () => ({
  adminStopService: {
    getAllStops: vi.fn(),
  },
}));

vi.mock('../../../services/adminOperatorService', () => ({
  adminOperatorService: {
    getAllOperators: vi.fn(),
  },
}));

vi.mock('../../../hooks/useAdminToast', () => ({
  useAdminToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockQrCodes = [
  {
    id: 'qr-1',
    code: 'abc12345',
    label: 'Afiche Paradero Bolognesi',
    targetType: 'ROUTE',
    targetTitle: 'Línea 10 - Centro',
    campaignSource: 'afiche',
    campaignMedium: 'print',
    totalScans: 125,
    status: 'ACTIVE',
    canonicalUrl: 'https://qruta.pe/q/abc12345',
  },
  {
    id: 'qr-2',
    code: 'xyz98765',
    label: 'Sticker Micro 05',
    targetType: 'HOME',
    targetTitle: 'Inicio QRuta',
    campaignSource: 'sticker',
    campaignMedium: 'print',
    totalScans: 42,
    status: 'PAUSED',
    canonicalUrl: 'https://qruta.pe/q/xyz98765',
  },
];

describe('AdminQrListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminQrCodeService.getAll.mockResolvedValue(mockQrCodes);
    adminRouteService.getAllRoutes.mockResolvedValue([]);
    adminStopService.getAllStops.mockResolvedValue([]);
    adminOperatorService.getAllOperators.mockResolvedValue([]);
  });

  it('renders the list of QR codes and page header', async () => {
    render(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Códigos QR Inteligentes')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
      expect(screen.getByText('Sticker Micro 05')).toBeInTheDocument();
      expect(screen.getByText('abc12345')).toBeInTheDocument();
      expect(screen.getByText('xyz98765')).toBeInTheDocument();
    });
  });

  it('filters QR codes based on search input', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Buscar por código, etiqueta o campaña...');
    await user.type(searchInput, 'Sticker');

    expect(screen.getByText('Sticker Micro 05')).toBeInTheDocument();
    expect(screen.queryByText('Afiche Paradero Bolognesi')).not.toBeInTheDocument();
  });

  it('opens the create QR modal when clicking the action button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Crear Código QR/i });
    await user.click(createButton);

    expect(screen.getByText('Crear Código QR Inteligente')).toBeInTheDocument();
  });
});
