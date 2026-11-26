import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PortalLoginPage } from './PortalLoginPage';

function renderLogin(props = {}) {
  const onLogin = vi.fn().mockResolvedValue(undefined);
  render(
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
    </MemoryRouter>,
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
});
