import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminQrListPage } from './AdminQrListPage';
import { adminQrCodeService } from '../../../services/qrCodeService';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminStopService } from '../../../services/adminStopService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { adminLineService } from '../../../services/adminLineService';
import { cityService } from '../../../services/cityService';
import { renderWithQueryClient } from '../../../test/queryTestUtils';

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../../../services/qrCodeService', () => ({
  adminQrCodeService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

vi.mock('../../../services/adminLineService', () => ({
  adminLineService: {
    getAllLines: vi.fn(),
  },
}));

vi.mock('../../../services/cityService', () => ({
  cityService: {
    getAdminCities: vi.fn(),
  },
}));

vi.mock('../../../hooks/useAdminToast', () => ({
  useAdminToast: () => toastMock,
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
    adminLineService.getAllLines.mockResolvedValue([]);
    cityService.getAdminCities.mockResolvedValue([]);
  });

  it('renders the list of QR codes and page header', async () => {
    renderWithQueryClient(
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
    renderWithQueryClient(
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
    renderWithQueryClient(
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

  it('scopes the route picker to the city chosen in the generator', async () => {
    const user = userEvent.setup();

    cityService.getAdminCities.mockResolvedValue([
      { id: 'city-piura', name: 'Piura' },
      { id: 'city-lima', name: 'Lima' },
    ]);
    adminLineService.getAllLines.mockResolvedValue([
      { id: 'line-piura', cityId: 'city-piura' },
      { id: 'line-lima', cityId: 'city-lima' },
    ]);
    adminRouteService.getAllRoutes.mockResolvedValue([
      {
        id: 'route-piura',
        code: 'P1',
        name: 'Ruta Piura',
        transportLineId: 'line-piura',
      },
      {
        id: 'route-lima',
        code: 'L1',
        name: 'Ruta Lima',
        transportLineId: 'line-lima',
      },
    ]);

    renderWithQueryClient(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Crear Código QR/i }));

    // No city yet: the target picker stays locked.
    expect(screen.getByLabelText(/Seleccionar Ruta/)).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/Ciudad/), 'city-piura');

    expect(screen.getByLabelText(/Seleccionar Ruta/)).toBeEnabled();
    expect(
      screen.getByRole('option', { name: 'P1 - Ruta Piura' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'L1 - Ruta Lima' })
    ).not.toBeInTheDocument();
  });

  it('opens the export modal right after creating a QR code', async () => {
    const user = userEvent.setup();
    adminQrCodeService.create.mockResolvedValue(mockQrCodes[0]);

    renderWithQueryClient(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Crear Código QR/i }));

    await user.type(
      screen.getByPlaceholderText('Ej. Afiche Paradero Plaza Bolognesi'),
      'Afiche Oficina Central'
    );
    await user.selectOptions(screen.getByLabelText(/Tipo de Destino/), 'HOME');
    await user.click(screen.getByRole('button', { name: /Generar QR/i }));

    expect(
      await screen.findByRole('heading', { name: 'Exportar Código QR' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Descargar PNG/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Crear Código QR Inteligente' })
    ).not.toBeInTheDocument();
  });

  it('opens the edit modal and submits updates through the admin service', async () => {
    const user = userEvent.setup();
    const updated = { ...mockQrCodes[1], label: 'Sticker Actualizado' };
    adminQrCodeService.getAll
      .mockResolvedValueOnce(mockQrCodes)
      .mockResolvedValueOnce([mockQrCodes[0], updated]);
    adminQrCodeService.update.mockResolvedValue(updated);

    renderWithQueryClient(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sticker Micro 05')).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Editar código QR Sticker Micro 05' })
    );

    expect(screen.getByRole('heading', { name: 'Editar Código QR' })).toBeInTheDocument();

    const labelInput = screen.getByPlaceholderText('Ej. Afiche Paradero Plaza Bolognesi');
    expect(labelInput).toHaveValue('Sticker Micro 05');
    await user.clear(labelInput);
    await user.type(labelInput, 'Sticker Actualizado');
    await user.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    await waitFor(() => {
      expect(adminQrCodeService.update).toHaveBeenCalledWith(
        'qr-2',
        expect.objectContaining({ label: 'Sticker Actualizado', targetType: 'HOME' })
      );
    });
    expect(await screen.findByText('Sticker Actualizado')).toBeInTheDocument();
  });

  it('deletes a QR code after confirmation', async () => {
    const user = userEvent.setup();
    adminQrCodeService.getAll
      .mockResolvedValueOnce(mockQrCodes)
      .mockResolvedValueOnce([mockQrCodes[1]]);
    adminQrCodeService.delete.mockResolvedValue(undefined);

    renderWithQueryClient(
      <MemoryRouter>
        <AdminQrListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Afiche Paradero Bolognesi')).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: 'Eliminar código QR Afiche Paradero Bolognesi' })
    );

    expect(screen.getByRole('heading', { name: 'Eliminar Código QR' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Eliminar Código' }));

    await waitFor(() => {
      expect(adminQrCodeService.delete).toHaveBeenCalledWith('qr-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Afiche Paradero Bolognesi')).not.toBeInTheDocument();
    });
  });
});
