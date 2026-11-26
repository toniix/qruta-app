import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LineListPage } from './LineListPage';
import { ToastProvider } from '../../../components/admin/common/ToastContext';
import { adminLineService } from '../../../services/adminLineService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { cityService } from '../../../services/cityService';
import { adminKeys } from '../../../lib/queryKeys';
import {
  createSharedTestQueryClient,
  renderWithQueryClient,
} from '../../../test/queryTestUtils';

vi.mock('../../../services/adminLineService', () => ({
  adminLineService: {
    getAllLines: vi.fn(async () => []),
    createLine: vi.fn(),
    updateLine: vi.fn(),
    deleteLine: vi.fn(),
  },
}));

vi.mock('../../../services/adminOperatorService', () => ({
  adminOperatorService: { getAllOperators: vi.fn(async () => []) },
}));

vi.mock('../../../services/cityService', () => ({
  cityService: { getAdminCities: vi.fn(async () => []) },
}));

const CITY = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ica',
  department: 'Ica',
};

const OPERATOR = {
  id: '223e4567-e89b-42d3-a456-426614174000',
  name: 'Expreso Ica',
};

function renderPage(options) {
  return renderWithQueryClient(
    <ToastProvider>
      <LineListPage />
    </ToastProvider>,
    options,
  );
}

describe('LineListPage operator column', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cityService.getAdminCities.mockResolvedValue([CITY]);
    adminOperatorService.getAllOperators.mockResolvedValue([OPERATOR]);
    adminLineService.getAllLines.mockResolvedValue([
      {
        id: 'line-1',
        company: 'Expreso Ica S.A.',
        cityId: CITY.id,
        operatorId: OPERATOR.id,
        status: 'ACTIVE',
      },
    ]);
  });

  it('resolves the operator name for assigned lines and displays company', async () => {
    renderPage();

    expect(await screen.findByText('Expreso Ica')).toBeTruthy();
    expect(await screen.findByText('Expreso Ica S.A.')).toBeTruthy();
    expect(adminOperatorService.getAllOperators).toHaveBeenCalledTimes(1);
  });

  it('renders lines even when secondary catalog queries fail', async () => {
    cityService.getAdminCities.mockRejectedValueOnce(new Error('cities failed'));
    adminOperatorService.getAllOperators.mockRejectedValueOnce(new Error('operators failed'));

    renderPage();

    expect(await screen.findByText('Expreso Ica S.A.')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Plataforma')).toBeInTheDocument();
  });

  it('deletes a line and invalidates lines, routes, and overview queries', async () => {
    const user = userEvent.setup();
    adminLineService.deleteLine.mockResolvedValueOnce();
    const sharedQueryClient = createSharedTestQueryClient();
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    renderPage({ queryClient: sharedQueryClient });

    expect(await screen.findByText('Expreso Ica S.A.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /eliminar línea/i }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /eliminar línea/i }));

    await waitFor(() => {
      expect(adminLineService.deleteLine).toHaveBeenCalledWith('line-1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.lines() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.routes() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: adminKeys.overview() });
  });
});
