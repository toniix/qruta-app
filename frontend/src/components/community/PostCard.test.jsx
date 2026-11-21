import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';

describe('PostCard Component', () => {
  const basePost = {
    id: 'post-1',
    authorAlias: 'Pasajero123',
    content: 'El bus pasó puntual por el paradero central.',
    createdAt: new Date().toISOString(),
    likesCount: 3,
    commentsCount: 1,
    likedByMe: false,
    ownedByMe: false,
    isOfficial: false,
  };

  const defaultCatMeta = {
    label: 'Información',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  it('renders standard posts without official badge', () => {
    render(
      <PostCard
        post={basePost}
        catMeta={defaultCatMeta}
        commentState={{ open: false, items: [], text: '', loading: false, sending: false }}
      />
    );

    expect(screen.getByText('Pasajero123')).toBeInTheDocument();
    expect(screen.getByText('El bus pasó puntual por el paradero central.')).toBeInTheDocument();
    expect(screen.queryByText('Comunicado Oficial')).not.toBeInTheDocument();
  });

  it('renders official announcement badge and gradient styling when isOfficial or official is true', () => {
    const officialPost = {
      ...basePost,
      id: 'post-official-1',
      authorAlias: 'Empresa San Jerónimo',
      isOfficial: true,
      content: 'Estimados usuarios, el servicio operará con normalidad hoy.',
    };

    const { container } = render(
      <PostCard
        post={officialPost}
        catMeta={defaultCatMeta}
        commentState={{ open: false, items: [], text: '', loading: false, sending: false }}
      />
    );

    expect(screen.getByText('Empresa San Jerónimo')).toBeInTheDocument();
    expect(screen.getByText('Comunicado Oficial')).toBeInTheDocument();
    expect(screen.getByText('Empresa Verificada')).toBeInTheDocument();

    const article = container.querySelector('article');
    expect(article).toHaveClass('border-blue-400/80');
    expect(article).toHaveClass('bg-gradient-to-br');
  });

  it('renders official announcement badge when post has official property (Jackson fallback)', () => {
    const officialFallbackPost = {
      ...basePost,
      id: 'post-official-2',
      authorAlias: 'Empresa Santa Rosa',
      official: true,
      content: 'Corte temporal de vía.',
    };

    render(
      <PostCard
        post={officialFallbackPost}
        catMeta={defaultCatMeta}
        commentState={{ open: false, items: [], text: '', loading: false, sending: false }}
      />
    );

    expect(screen.getByText('Empresa Santa Rosa')).toBeInTheDocument();
    expect(screen.getByText('Comunicado Oficial')).toBeInTheDocument();
  });

  it('triggers onToggleLike callback when clicking the useful/like button', async () => {
    const user = userEvent.setup();
    const handleToggleLike = vi.fn();

    render(
      <PostCard
        post={basePost}
        catMeta={defaultCatMeta}
        commentState={{ open: false, items: [], text: '', loading: false, sending: false }}
        onToggleLike={handleToggleLike}
      />
    );

    const likeButton = screen.getByRole('button', { name: /marcar como útil/i });
    await user.click(likeButton);

    expect(handleToggleLike).toHaveBeenCalledTimes(1);
    expect(handleToggleLike).toHaveBeenCalledWith('post-1');
  });

  it('triggers onToggleComments callback when clicking the comment button', async () => {
    const user = userEvent.setup();
    const handleToggleComments = vi.fn();

    render(
      <PostCard
        post={basePost}
        catMeta={defaultCatMeta}
        commentState={{ open: false, items: [], text: '', loading: false, sending: false }}
        onToggleComments={handleToggleComments}
      />
    );

    const commentButton = screen.getByRole('button', { name: /1 comentario/i });
    await user.click(commentButton);

    expect(handleToggleComments).toHaveBeenCalledTimes(1);
    expect(handleToggleComments).toHaveBeenCalledWith('post-1');
  });
});
