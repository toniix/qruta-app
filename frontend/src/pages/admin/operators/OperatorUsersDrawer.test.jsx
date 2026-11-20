import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorUsersDrawer } from './OperatorUsersDrawer';
import { adminOperatorService } from '../../../services/adminOperatorService';

vi.mock('../../../services/adminOperatorService', () => ({
  adminOperatorService: {
    getOperatorUsers: vi.fn(async () => []),
    createOperatorUser: vi.fn(),
    updateOperatorUser: vi.fn(),
    resetOperatorUserPassword: vi.fn(),
    setOperatorUserActive: vi.fn(),
  },
}));

const OPERATOR = {
  id: 'operator-1',
  name: 'Expreso Ica',
};

const USER = {
  id: 'user-1',
  email: 'ana@expreso.pe',
  fullName: 'Ana Owner',
  role: 'OWNER',
  active: true,
};

function renderDrawer() {
  return render(
    <OperatorUsersDrawer
      open
      operator={OPERATOR}
      onClose={() => {}}
      onChanged={() => {}}
    />
  );
}

describe('OperatorUsersDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminOperatorService.getOperatorUsers.mockResolvedValue([USER]);
    adminOperatorService.createOperatorUser.mockResolvedValue({});
    adminOperatorService.resetOperatorUserPassword.mockResolvedValue({});
    adminOperatorService.setOperatorUserActive.mockResolvedValue({});
  });

  it('creates a portal user with the operator id', async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(await screen.findByText('ana@expreso.pe')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }));
    await user.type(screen.getByPlaceholderText('usuario@empresa.pe'), 'nuevo@expreso.pe');
    await user.type(screen.getByPlaceholderText(/ana owner/i), 'Nuevo Editor');
    await user.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'temporal123');
    await user.selectOptions(screen.getByRole('combobox'), 'EDITOR');
    await user.click(screen.getByRole('button', { name: 'Crear Usuario' }));

    await vi.waitFor(() =>
      expect(adminOperatorService.createOperatorUser).toHaveBeenCalledWith('operator-1', {
        email: 'nuevo@expreso.pe',
        fullName: 'Nuevo Editor',
        role: 'EDITOR',
        password: 'temporal123',
      })
    );
  });

  it('resets a user password', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(
      await screen.findByRole('button', {
        name: 'Restablecer contraseña de ana@expreso.pe',
      })
    );
    await user.type(screen.getByPlaceholderText(/mínimo 8 caracteres/i), 'nuevaClave123');
    await user.click(screen.getByRole('button', { name: 'Restablecer Contraseña' }));

    await vi.waitFor(() =>
      expect(adminOperatorService.resetOperatorUserPassword).toHaveBeenCalledWith(
        'operator-1',
        'user-1',
        'nuevaClave123'
      )
    );
  });

  it('deactivates a user from the list', async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(
      await screen.findByRole('button', { name: 'Desactivar ana@expreso.pe' })
    );

    await vi.waitFor(() =>
      expect(adminOperatorService.setOperatorUserActive).toHaveBeenCalledWith(
        'operator-1',
        'user-1',
        false
      )
    );
  });
});
