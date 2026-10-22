import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StopFormDrawer } from './StopFormDrawer';

vi.mock('../../../components/admin/map/StopLocationPickerModal', () => ({
  StopLocationPickerModal: () => null,
}));

const CITY = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Ica',
  department: 'Ica',
  latitude: -14.06,
  longitude: -75.72,
};

const EDIT_DATA = {
  id: 'stop-1',
  cityId: CITY.id,
  name: 'Paradero Mercado',
  latitude: '-14.06',
  longitude: '-75.72',
  reference: '',
  address: '',
  accessible: true,
};

function renderDrawer(props = {}) {
  const onSubmit = vi.fn();
  const utils = render(
    <StopFormDrawer
      open
      onClose={() => {}}
      cities={[CITY]}
      onSubmit={onSubmit}
      initialData={EDIT_DATA}
      {...props}
    />
  );
  return { onSubmit, ...utils };
}

function selectFile(file) {
  // AdminDrawer renders through a portal into document.body, so query there.
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('StopFormDrawer reference image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('rejects a non JPEG/PNG file with an inline error', () => {
    renderDrawer();

    selectFile(new File(['x'], 'anim.gif', { type: 'image/gif' }));

    expect(screen.getByText(/formato no permitido/i)).toBeInTheDocument();
  });

  it('rejects a file larger than 2 MB with an inline error', () => {
    renderDrawer();

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    selectFile(big);

    expect(screen.getByText(/supera el tamaño máximo/i)).toBeInTheDocument();
  });

  it('clears the image error when a valid file is selected afterwards', () => {
    renderDrawer();

    selectFile(new File(['x'], 'anim.gif', { type: 'image/gif' }));
    expect(screen.getByText(/formato no permitido/i)).toBeInTheDocument();

    selectFile(new File(['y'], 'ok.jpg', { type: 'image/jpeg' }));
    expect(screen.queryByText(/formato no permitido/i)).not.toBeInTheDocument();
  });

  it('does not submit while an image validation error is active', () => {
    renderDrawer();

    // A valid selection activates the file step; an invalid replacement must
    // then keep the submit blocked instead of sending the stale previous file.
    selectFile(new File(['pixels'], 'ok.png', { type: 'image/png' }));
    selectFile(new File(['x'], 'anim.gif', { type: 'image/gif' }));
    expect(screen.getByText(/formato no permitido/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /actualizar paradero/i }));

    expect(screen.getByText(/formato no permitido/i)).toBeInTheDocument();
  });

  it('hides the preview when the existing image fails to load', async () => {
    renderDrawer({
      initialData: { ...EDIT_DATA, imageUrl: 'https://cdn.example.com/stops/stop-1.jpg' },
    });

    const img = screen.getByAltText(/vista previa/i);
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.queryByAltText(/vista previa/i)).not.toBeInTheDocument()
    );
  });

  it('passes the selected file up as imageFile (and not removeImage) on submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDrawer();
    const file = new File(['pixels'], 'ok.png', { type: 'image/png' });

    selectFile(file);
    await user.click(screen.getByRole('button', { name: /actualizar paradero/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.imageFile).toBe(file);
    expect(payload.removeImage).toBe(false);
  });

  it('flags removal of the existing image on submit', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDrawer({
      initialData: { ...EDIT_DATA, imageUrl: 'https://cdn.example.com/stops/stop-1.jpg' },
    });

    await user.click(screen.getByRole('button', { name: /quitar imagen/i }));
    await user.click(screen.getByRole('button', { name: /actualizar paradero/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.removeImage).toBe(true);
    expect(payload.imageFile).toBeUndefined();
  });
});
