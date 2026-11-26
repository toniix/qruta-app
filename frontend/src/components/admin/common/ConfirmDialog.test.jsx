import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders a native modal alertdialog with accessible labelling and initial focus on cancel', () => {
    render(
      <ConfirmDialog
        open
        title="Eliminar elemento"
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Eliminar elemento' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('Esta acción no se puede deshacer.');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  it('calls onCancel on native cancel event and backdrop click when not loading', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Eliminar elemento"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Eliminar elemento' });

    const cancelEvent = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    // Clicking the dialog element itself represents clicking its backdrop
    fireEvent.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('blocks cancel event and backdrop click while loading', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        loading
        title="Eliminando..."
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Eliminando...' });

    const cancelEvent = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancelEvent);
    fireEvent.click(dialog);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('restores focus to the triggering element after closing and invokes onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Abrir confirmación
          </button>
          <ConfirmDialog
            open={open}
            title="Confirmar acción"
            confirmLabel="Confirmar"
            cancelLabel="Cancelar"
            onCancel={() => setOpen(false)}
            onConfirm={() => {
              onConfirm();
              setOpen(false);
            }}
          />
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Abrir confirmación' });
    await user.click(trigger);

    expect(screen.getByRole('alertdialog', { name: 'Confirmar acción' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
