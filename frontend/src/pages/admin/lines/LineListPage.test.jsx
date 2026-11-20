import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineListPage } from './LineListPage';
import { ToastProvider } from '../../../components/admin/common/ToastContext';
import { adminLineService } from '../../../services/adminLineService';
import { adminOperatorService } from '../../../services/adminOperatorService';
import { cityService } from '../../../services/cityService';

vi.mock('../../../services/adminLineService', () => ({
  adminLineService: { getAllLines: vi.fn(async () => []) },
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

function renderPage() {
  return render(
    <ToastProvider>
      <LineListPage />
    </ToastProvider>
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
});
