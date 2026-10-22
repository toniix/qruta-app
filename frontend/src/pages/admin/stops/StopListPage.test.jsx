import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StopListPage } from './StopListPage';
import { ToastProvider } from '../../../components/admin/common/ToastContext';
import { adminStopService } from '../../../services/adminStopService';
import { cityService } from '../../../services/cityService';

vi.mock('../../../services/adminStopService', () => ({
  adminStopService: {
    getAllStops: vi.fn(async () => []),
    createStop: vi.fn(),
    updateStop: vi.fn(),
    deleteStop: vi.fn(),
    uploadStopImage: vi.fn(),
    removeStopImage: vi.fn(),
  },
}));

vi.mock('../../../services/cityService', () => ({
  cityService: { getAdminCities: vi.fn(async () => []) },
}));

vi.mock('../../../components/admin/map/StopLocationPickerModal', () => ({
  StopLocationPickerModal: () => null,
}));

const CITY = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ica',
  department: 'Ica',
};

function renderPage() {
  return render(
    <ToastProvider>
      <StopListPage />
    </ToastProvider>
  );
}

async function openCreateDrawer(user) {
  await user.click(await screen.findByRole('button', { name: /nuevo paradero/i }));
}

async function fillRequiredFields(user, name = 'Paradero Nuevo') {
  await user.type(screen.getByPlaceholderText(/puente blanco/i), name);
  await user.type(screen.getByPlaceholderText('-14.0678'), '-14.06');
  await user.type(screen.getByPlaceholderText('-75.7286'), '-75.72');
}

function selectImage(file) {
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [file] },
  });
}

describe('StopListPage image upload flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    cityService.getAdminCities.mockResolvedValue([CITY]);
    adminStopService.getAllStops.mockResolvedValue([]);
  });

  it('creates the stop without UI-only fields, then uploads the image for the new id', async () => {
    const user = userEvent.setup();
    const created = { id: 'stop-new', name: 'Paradero Nuevo' };
    adminStopService.createStop.mockResolvedValueOnce(created);
    adminStopService.uploadStopImage.mockResolvedValueOnce({
      ...created,
      imageUrl: 'https://cdn.example.com/stops/stop-new.jpg',
    });

    renderPage();
    await openCreateDrawer(user);
    await fillRequiredFields(user);

    const file = new File(['pixels'], 'ok.png', { type: 'image/png' });
    selectImage(file);
    await user.click(screen.getByRole('button', { name: /crear paradero/i }));

    await waitFor(() =>
      expect(adminStopService.uploadStopImage).toHaveBeenCalledWith('stop-new', file)
    );

    const createPayload = adminStopService.createStop.mock.calls[0][0];
    expect(createPayload.name).toBe('Paradero Nuevo');
    expect(createPayload).not.toHaveProperty('imageFile');
    expect(createPayload).not.toHaveProperty('removeImage');
  });

  it('keeps the stop saved and shows a distinct toast when the image upload fails', async () => {
    const user = userEvent.setup();
    adminStopService.createStop.mockResolvedValueOnce({ id: 'stop-new', name: 'Paradero Nuevo' });
    adminStopService.uploadStopImage.mockRejectedValueOnce(new Error('503 storage disabled'));

    renderPage();
    await openCreateDrawer(user);
    await fillRequiredFields(user);

    selectImage(new File(['pixels'], 'ok.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /crear paradero/i }));

    expect(await screen.findByText(/imagen no se pudo subir/i)).toBeInTheDocument();
    expect(adminStopService.createStop).toHaveBeenCalledTimes(1);
  });
});
