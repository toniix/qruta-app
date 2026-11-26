import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../admin/common/ToastContext';
import { PortalLoginPage } from './PortalLoginPage';

function renderLogin(props = {}) {
  const onLogin = vi.fn().mockResolvedValue(undefined);
  render(
    <ToastProvider>
      <MemoryRouter>
        <PortalLoginPage
          pageTitle="Acceso · QRuta"
          heading="Portal de Acceso"
          subtitle="Ingresa tus credenciales"
          emailPlaceholder="correo@ejemplo.com"
          onLogin={onLogin}
          redirectTo="/dashboard"
          {...props}
        />
      </MemoryRouter>
    </ToastProvider>,
  );
  return { onLogin };
}

describe('PortalLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders labeled email and password inputs with autofill attributes', () => {
    renderLogin();

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña');

    expect(emailInput).toHaveAttribute('id', 'login-email');
    expect(emailInput).toHaveAttribute('name', 'email');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'username');
    expect(emailInput).toHaveAttribute('spellcheck', 'false');
    expect(emailInput).toHaveAttribute('enterkeyhint', 'next');
    expect(emailInput).toBeRequired();

    expect(passwordInput).toHaveAttribute('id', 'login-password');
    expect(passwordInput).toHaveAttribute('name', 'password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordInput).toHaveAttribute('enterkeyhint', 'done');
    expect(passwordInput).toBeRequired();
  });

  it('toggles password visibility with an accessible aria-pressed button', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText('Contraseña');
    const toggleBtn = screen.getByRole('button', { name: 'Mostrar contraseña' });

    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(toggleBtn).toHaveAccessibleName('Ocultar contraseña');
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleBtn);

    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('routes focus to the first invalid field and links error text via aria-describedby', async () => {
    const user = userEvent.setup();
    const { onLogin } = renderLogin();

    const emailInput = screen.getByLabelText('Correo electrónico');
    const passwordInput = screen.getByLabelText('Contraseña');
    const form = emailInput.closest('form');

    // Invalid email -> focuses email input
    await user.type(emailInput, 'bad-email');
    fireEvent.submit(form);

    expect(emailInput).toHaveFocus();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    const emailErrorId = emailInput.getAttribute('aria-describedby');
    expect(emailErrorId).toBeTruthy();
    expect(document.getElementById(emailErrorId)).toHaveTextContent(/correo válido/i);
    expect(onLogin).not.toHaveBeenCalled();

    // Valid email, empty password -> focuses password input
    await user.clear(emailInput);
    await user.type(emailInput, 'admin@rutasya.pe');
    fireEvent.submit(form);

    expect(passwordInput).toHaveFocus();
    expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
    const passwordErrorId = passwordInput.getAttribute('aria-describedby');
    expect(passwordErrorId).toBeTruthy();
    expect(document.getElementById(passwordErrorId)).toBeInTheDocument();
  });

  it('shows inline alert and toast notification for invalid credentials (401)', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid credentials' } },
    });
    renderLogin({ onLogin });

    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@rutasya.pe');
    await user.type(screen.getByLabelText('Contraseña'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(screen.getByRole('status')).toHaveTextContent('Correo o contraseña incorrectos.');
  });

  it('shows toast and alert for inactive account (403), server error (500), and network error', async () => {
    const user = userEvent.setup();
    const onLogin = vi
      .fn()
      .mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Operator account is inactive' } },
      })
      .mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Internal server error' } },
      })
      .mockRejectedValueOnce({ message: 'Network Error' });

    renderLogin({ onLogin });

    await user.type(screen.getByLabelText('Correo electrónico'), 'op@rutasya.pe');
    await user.type(screen.getByLabelText('Contraseña'), 'secret123');

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cuenta está inactiva/i);

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/error interno del servidor/i);

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no se pudo conectar con el servidor/i);
  });
});
