import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingChild({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Render explosion');
  }
  return <div data-testid="healthy-child">Contenido normal</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('catches render errors and renders an accessible fallback with custom copy', () => {
    render(
      <ErrorBoundary
        fallbackTitle="Error en el mapa"
        fallbackDescription="No se pudo mostrar el módulo del mapa."
      >
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Error en el mapa')).toBeInTheDocument();
    expect(screen.getByText('No se pudo mostrar el módulo del mapa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recargar página/i })).toBeInTheDocument();
  });

  it('resets error state and calls onReset when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    let shouldThrow = true;

    function ToggleThrow() {
      if (shouldThrow) {
        throw new Error('Chunk load failed');
      }
      return <div data-testid="recovered-child">Recuperado</div>;
    }

    render(
      <ErrorBoundary onReset={onReset}>
        <ToggleThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recovered-child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reloads the page when the reload button is clicked', async () => {
    const user = userEvent.setup();
    const reloadSpy = vi.fn();
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    try {
      render(
        <ErrorBoundary>
          <ThrowingChild shouldThrow />
        </ErrorBoundary>
      );

      await user.click(screen.getByRole('button', { name: /recargar página/i }));
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });
});
