import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StopQuickCreateModal } from './StopQuickCreateModal';
import { ToastProvider } from '../common/ToastContext';
import { apiClient } from '../../../services/apiClient';

vi.mock('../../../services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const CITY_ID = '123e4567-e89b-42d3-a456-426614174000';
const CITY = { id: CITY_ID, name: 'Ica', latitude: -14.0678, longitude: -75.7286 };

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  render(
    <ToastProvider>
      <StopQuickCreateModal
        open
        onClose={onClose}
        cityId={CITY_ID}
        city={CITY}
        onCreated={onCreated}
        {...props}
      />
    </ToastProvider>
  );
  return { onClose, onCreated };
}

describe('StopQuickCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the fixed city and blocks empty submit without calling the API', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByText(/Se crea en/)).toBeInTheDocument();
    expect(screen.getByText('Ica')).toBeInTheDocument();

    // Whitespace-only passes native `required` so submit reaches zod,
    // which trims and rejects it.
    await user.type(screen.getByPlaceholderText(/puente blanco/i), '   ');
    await user.click(screen.getByRole('button', { name: /crear paradero/i }));

    expect(await screen.findByText(/nombre del paradero es obligatorio/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('creates the stop with coerced coordinates and notifies the parent', async () => {
    const user = userEvent.setup();
    const created = { id: 'stop-1', name: 'Paradero Mercado', latitude: -14.06, longitude: -75.72 };
    apiClient.post.mockResolvedValueOnce({ data: created });
    const { onClose, onCreated } = renderModal();

    await user.type(screen.getByPlaceholderText(/puente blanco/i), 'Paradero Mercado');
    await user.clear(screen.getByPlaceholderText('-14.0678'));
    await user.type(screen.getByPlaceholderText('-14.0678'), '-14.06');
    await user.clear(screen.getByPlaceholderText('-75.7286'));
    await user.type(screen.getByPlaceholderText('-75.7286'), '-75.72');
    await user.click(screen.getByRole('button', { name: /crear paradero/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/stops',
      expect.objectContaining({
        cityId: CITY_ID,
        name: 'Paradero Mercado',
        latitude: -14.06,
        longitude: -75.72,
      })
    );
    expect(onCreated).toHaveBeenCalledWith(created);
    expect(onClose).toHaveBeenCalled();
  });

  it('rejects out-of-range coordinates', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText(/puente blanco/i), 'Paradero X');
    await user.clear(screen.getByPlaceholderText('-14.0678'));
    await user.type(screen.getByPlaceholderText('-14.0678'), '200');
    await user.click(screen.getByRole('button', { name: /crear paradero/i }));

    expect(await screen.findByText(/-90/)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
