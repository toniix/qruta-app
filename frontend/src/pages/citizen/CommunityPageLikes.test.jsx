import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CommunityPage } from './CommunityPage';
import { invalidateFeedCache } from '../../services/communityFeedCache';
import { communityService } from '../../services/communityService';

const mockRoutesState = vi.hoisted(() => ({
  routes: [],
  selectRoute: vi.fn(),
}));

vi.mock('../../contexts/RouteContext', () => ({
  useRoutes: () => mockRoutesState,
}));

vi.mock('../../hooks/useCommunityIdentity', () => ({
  useCommunityIdentity: () => ({
    deviceId: 'test-device-uuid',
    alias: 'UsuarioTest',
    setAlias: vi.fn(),
    hasAlias: true,
  }),
  getOrCreateDeviceId: () => 'test-device-uuid',
}));

vi.mock('../../services/communityService', () => ({
  communityService: {
    getPosts: vi.fn(),
    toggleLike: vi.fn(),
    getComments: vi.fn().mockResolvedValue([]),
    createPost: vi.fn(),
    deleteOwnPost: vi.fn(),
    addComment: vi.fn(),
    deleteOwnComment: vi.fn(),
  },
  COMMUNITY_CATEGORIES: [
    { id: 'ALERTA', label: 'Alerta / Tráfico', shortLabel: 'Alertas', badgeClass: '', activeChipClass: '' },
    { id: 'PREGUNTA', label: '¿Cómo llego?', shortLabel: 'Preguntas', badgeClass: '', activeChipClass: '' },
  ],
  getCategoryMeta: () => ({ label: 'Alerta', badgeClass: '' }),
}));

const mockPost = {
  id: 'post-123',
  authorAlias: 'ViajeroIca',
  category: 'ALERTA',
  content: 'Tráfico pesado en el óvalo',
  likesCount: 2,
  commentsCount: 0,
  likedByMe: false,
  ownedByMe: false,
  createdAt: new Date().toISOString(),
};

describe('CommunityPage - Optimistic Like Updates and Rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateFeedCache();
    localStorage.clear();
    communityService.getPosts.mockResolvedValue([mockPost]);
  });

  it('updates like state immediately before server responds (Optimistic Update)', async () => {
    const user = userEvent.setup();
    // Resolve with delay to verify immediate optimistic render
    let resolveServerPromise;
    const serverPromise = new Promise((resolve) => {
      resolveServerPromise = resolve;
    });
    communityService.toggleLike.mockReturnValue(serverPromise);

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    // Initial state: 2 likes, not liked
    const likeBtn = await screen.findByRole('button', { name: /Marcar como útil \(2\)/i });
    expect(likeBtn).toHaveAttribute('aria-pressed', 'false');

    // Click like
    await user.click(likeBtn);

    // OPTIMISTIC: immediately changes to pressed and count 3, even before server responds
    expect(screen.getByRole('button', { name: /Quitar reacción útil \(3\)/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Server responds with authoritative data
    resolveServerPromise({
      ...mockPost,
      likesCount: 3,
      likedByMe: true,
    });

    await waitFor(() => {
      expect(communityService.toggleLike).toHaveBeenCalledWith('post-123');
    });
  });

  it('prevents spam-click while request is in-flight', async () => {
    const user = userEvent.setup();
    let resolveServerPromise;
    const serverPromise = new Promise((resolve) => {
      resolveServerPromise = resolve;
    });
    communityService.toggleLike.mockReturnValue(serverPromise);

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    const likeBtn = await screen.findByRole('button', { name: /Marcar como útil \(2\)/i });

    // Spam multiple clicks rapidly
    await user.click(likeBtn);
    await user.click(likeBtn);
    await user.click(likeBtn);

    // Only 1 network request was initiated
    expect(communityService.toggleLike).toHaveBeenCalledTimes(1);

    resolveServerPromise({ ...mockPost, likesCount: 3, likedByMe: true });
  });

  it('performs rollback to previous state and displays error if network request fails', async () => {
    const user = userEvent.setup();
    communityService.toggleLike.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    );

    const likeBtn = await screen.findByRole('button', { name: /Marcar como útil \(2\)/i });

    await user.click(likeBtn);

    // Waits for failure and verifies rollback back to 2 and not pressed
    await waitFor(() => {
      const rolledBackBtn = screen.getByRole('button', { name: /Marcar como útil \(2\)/i });
      expect(rolledBackBtn).toHaveAttribute('aria-pressed', 'false');
    });

    // Error banner is displayed to user
    expect(
      screen.getByText(/No se pudo registrar tu reacción\. Se restableció el estado anterior\./i)
    ).toBeInTheDocument();
  });
});

