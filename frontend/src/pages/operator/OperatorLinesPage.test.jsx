import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorLinesPage } from './OperatorLinesPage';
import { ToastProvider } from '../../components/admin/common/ToastContext';
import { operatorPortalService } from '../../services/operatorPortalService';
import { renderWithQueryClient } from '../../test/queryTestUtils';

vi.mock('../../services/operatorPortalService', () => ({
  operatorPortalService: {
    getLines: vi.fn(),
    updateLine: vi.fn(),
  },
}));

const SAMPLE_LINES = [
  {
    id: 'line-1',
    company: 'Empresa Santa Rosa',
    color: '#3B82F6',
    contact: '999111222',
    description: 'Flota 20 buses',
    status: 'ACTIVE',
    routeCount: 4,
  },
  {
    id: 'line-2',
    company: 'Consorcio Trans Sur',
    color: '#EF4444',
    contact: '',
    description: '',
    status: 'INACTIVE',
    routeCount: 1,
  },
];

function renderPage() {
  return renderWithQueryClient(
    <ToastProvider>
      <OperatorLinesPage />
    </ToastProvider>
  );
}

describe('OperatorLinesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operatorPortalService.getLines.mockResolvedValue(SAMPLE_LINES);
    operatorPortalService.updateLine.mockImplementation(async (id, data) => ({
      ...SAMPLE_LINES.find((l) => l.id === id),
      ...data,
    }));
  });

  it('renders line companies in the table without name or code columns', async () => {
    renderPage();

    expect(await screen.findByText('Empresa Santa Rosa')).toBeTruthy();
    expect(await screen.findByText('Consorcio Trans Sur')).toBeTruthy();
    expect(screen.queryByText('Código')).toBeNull();
    expect(screen.queryByText('Nombre')).toBeNull();
  });

  it('filters lines by company', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa Santa Rosa');
    const searchInput = screen.getByPlaceholderText(/buscar línea/i);

    await user.type(searchInput, 'Santa Rosa');
    expect(screen.getByText('Empresa Santa Rosa')).toBeTruthy();
    expect(screen.queryByText('Consorcio Trans Sur')).toBeNull();
  });

  it('displays company as read-only in the edit drawer and updates operational fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Empresa Santa Rosa');
    const editButton = screen.getByLabelText('Editar Empresa Santa Rosa');
    await user.click(editButton);

    const companyInput = screen.getByDisplayValue('Empresa Santa Rosa');
    expect(companyInput).toHaveAttribute('readonly');

    const contactInput = screen.getByDisplayValue('999111222');
    await user.clear(contactInput);
    await user.type(contactInput, '987654321');

    const saveButton = screen.getByRole('button', { name: /^guardar$/i });
    await user.click(saveButton);

    await vi.waitFor(() => {
      expect(operatorPortalService.updateLine).toHaveBeenCalledWith('line-1', {
        color: '#3B82F6',
        contact: '987654321',
        description: 'Flota 20 buses',
        status: 'ACTIVE',
      });
    });
  });
});
