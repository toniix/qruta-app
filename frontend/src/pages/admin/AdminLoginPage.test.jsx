import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminLoginPage } from './AdminLoginPage';
import { apiClient } from '../../services/apiClient';

vi.mock('../../services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function renderPage() {
  render(
    <MemoryRouter>
      <AdminLoginPage />
    </MemoryRouter>
  );
}

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('rejects a malformed email without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText(/admin@ejemplo\.com/i), 'not-an-email');
    // fireEvent.submit bypasses native constraint validation so the submit
    // handler (and zod) always runs, even in jsdom.
    fireEvent.submit(screen.getByRole('button', { name: /iniciar sesión/i }).closest('form'));

    expect(await screen.findByText(/correo válido/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits valid credentials and surfaces server errors', async () => {
    const user = userEvent.setup();
    apiClient.post.mockRejectedValueOnce({ response: { data: { message: 'Credenciales inválidas' } } });
    renderPage();

    await user.type(screen.getByPlaceholderText(/admin@ejemplo\.com/i), 'admin@rutasya.pe');
    const passwordInput = document.querySelector('input[type="password"]');
    await user.type(passwordInput, 'secret123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/admin/login',
      { email: 'admin@rutasya.pe', password: 'secret123' }
    );
    expect(await screen.findByText('Credenciales inválidas')).toBeInTheDocument();
  });
});
