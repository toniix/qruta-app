import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StopDetailDrawer } from './StopDetailDrawer';

vi.mock('../../services/stopService', () => ({
  stopService: { getStopRoutes: vi.fn(async () => []) },
}));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => ({
    routes: [],
    selectRoute: vi.fn(),
    selectStop: vi.fn(),
    userLocation: null,
  }),
}));

function renderDrawer(stop) {
  return render(
    <MemoryRouter>
      <StopDetailDrawer stop={stop} onClose={() => {}} />
    </MemoryRouter>
  );
}

describe('StopDetailDrawer reference image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reference image when stop.imageUrl is present', async () => {
    renderDrawer({
      id: 'stop-1',
      name: 'Paradero Mercado',
      imageUrl: 'https://cdn.example.com/stops/stop-1.jpg',
    });

    const img = await screen.findByRole('img', { name: /paradero mercado/i });
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/stops/stop-1.jpg');
  });

  it('renders no image when imageUrl is null', async () => {
    renderDrawer({ id: 'stop-2', name: 'Paradero Centro', imageUrl: null });

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero centro/i })).not.toBeInTheDocument()
    );
  });

  it('renders no image when imageUrl is absent', async () => {
    renderDrawer({ id: 'stop-3', name: 'Paradero Sur' });

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero sur/i })).not.toBeInTheDocument()
    );
  });

  it('hides the image gracefully when it fails to load', async () => {
    renderDrawer({
      id: 'stop-4',
      name: 'Paradero Roto',
      imageUrl: 'https://cdn.example.com/stops/broken.jpg',
    });

    const img = await screen.findByRole('img', { name: /paradero roto/i });
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero roto/i })).not.toBeInTheDocument()
    );
  });

  it('hides the reference image while the routes list is expanded and restores it when collapsed', async () => {
    renderDrawer({
      id: 'stop-5',
      name: 'Paradero Expandible',
      imageUrl: 'https://cdn.example.com/stops/stop-5.jpg',
    });

    // Visible by default (routes list collapsed)
    const img = await screen.findByRole('img', { name: /paradero expandible/i });
    expect(img).toBeInTheDocument();

    // Expanding the routes list hides the image to keep the drawer compact
    // (the name matches both the header toggle and the collapsed CTA; use the first toggle)
    const [expandToggle] = screen.getAllByRole('button', {
      name: /ver rutas de este paradero/i,
    });
    fireEvent.click(expandToggle);
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: /paradero expandible/i })).not.toBeInTheDocument()
    );

    // Collapsing again restores it
    fireEvent.click(screen.getByRole('button', { name: /ocultar rutas/i }));
    await waitFor(() =>
      expect(screen.getByRole('img', { name: /paradero expandible/i })).toBeInTheDocument()
    );
  });
});
