import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorListPage } from './OperatorListPage';
import { ToastProvider } from '../../../components/admin/common/ToastContext';
import { adminOperatorService } from '../../../services/adminOperatorService';

vi.mock('../../../services/adminOperatorService', () => ({
  adminOperatorService: {
    getAllOperators: vi.fn(async () => []),
    getOperator: vi.fn(),
    createOperator: vi.fn(),
    updateOperator: vi.fn(),
    setOperatorActive: vi.fn(),
    getOperatorUsers: vi.fn(async () => []),
    createOperatorUser: vi.fn(),
    updateOperatorUser: vi.fn(),
    resetOperatorUserPassword: vi.fn(),
    setOperatorUserActive: vi.fn(),
  },
}));

vi.mock('./OperatorFormDrawer', () => ({
  OperatorFormDrawer: ({ open, onSubmit }) =>
    open ? (
      <div data-testid="operator-form-stub">
        <button
          type="button"
          onClick={() =>
            onSubmit({
              name: 'Operador Duplicado',
              ruc: '20512345678',
              cityId: '11111111-1111-4111-8111-111111111111',
              plan: 'PRO',
              contactName: '',
              contactEmail: '',
              contactPhone: '',
              active: true,
            })
          }
        >
          Enviar formulario
        </button>
      </div>
    ) : null,
}));

vi.mock('./OperatorUsersDrawer', () => ({
  OperatorUsersDrawer: ({ open }) =>
    open ? <div data-testid="operator-users-stub" /> : null,
}));

const OPERATORS = [
  {
    id: 'operator-1',
    name: 'Expreso Ica',
    ruc: '20512345678',
    cityName: 'Ica',
    plan: 'PRO',
    active: true,
  },
  {
    id: 'operator-2',
    name: 'Transportes Pisco',
    ruc: '20598765432',
    cityName: 'Pisco',
    plan: 'BASIC',
    active: false,
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <OperatorListPage />
    </ToastProvider>
  );
}

describe('OperatorListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminOperatorService.getAllOperators.mockResolvedValue(OPERATORS);
    adminOperatorService.setOperatorActive.mockResolvedValue({});
  });

  it('renders operators and filters them by name', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Expreso Ica')).toBeTruthy();
    expect(screen.getByText('Transportes Pisco')).toBeTruthy();
    expect(screen.getByText(/RUC 20512345678/)).toBeTruthy();

    await user.type(
      screen.getByPlaceholderText(/buscar por nombre, ruc o ciudad/i),
      'Pisco'
    );

    expect(screen.queryByText('Expreso Ica')).not.toBeInTheDocument();
    expect(screen.getByText('Transportes Pisco')).toBeTruthy();
  });

  it('reactivates an inactive operator through the warning confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Reactivar Transportes Pisco' }));

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('Reactivar Operador')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    await vi.waitFor(() =>
      expect(adminOperatorService.setOperatorActive).toHaveBeenCalledWith('operator-2', true)
    );
  });

  it('opens the nested user manager for an operator', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Usuarios de Expreso Ica' }));

    expect(screen.getByTestId('operator-users-stub')).toBeTruthy();
  });

  it('surfaces the backend message when the RUC is already registered', async () => {
    const user = userEvent.setup();
    adminOperatorService.createOperator.mockRejectedValueOnce({
      response: { data: { message: 'Ya existe un operador con ese RUC.' } },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /nuevo operador/i }));
    await user.click(screen.getByRole('button', { name: 'Enviar formulario' }));

    expect(await screen.findByText('Ya existe un operador con ese RUC.')).toBeTruthy();
  });
});
