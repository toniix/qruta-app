import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteShareModal } from './RouteShareModal';
import * as shareUtils from '../../utils/shareUtils';

describe('RouteShareModal', () => {
  const mockRoute = {
    id: 'route-77',
    code: 'R77',
    name: 'Ruta 77: Centro - Terminal',
    color: '#0284c7',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    route: mockRoute,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<RouteShareModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders accessible modal dialog with route info when open', () => {
    render(<RouteShareModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'share-modal-title');

    expect(screen.getByText('R77')).toBeInTheDocument();
    expect(screen.getByText('Compartir ruta')).toBeInTheDocument();
    expect(screen.getByText('Centro - Terminal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<RouteShareModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /cerrar modal de compartir/i });
    await userEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<RouteShareModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<RouteShareModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByTestId('share-modal-backdrop');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders valid WhatsApp and Telegram share links', () => {
    render(<RouteShareModal {...defaultProps} />);

    const whatsappLink = screen.getByRole('link', { name: /compartir en whatsapp/i });
    expect(whatsappLink).toHaveAttribute('target', '_blank');
    expect(whatsappLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(whatsappLink.getAttribute('href')).toContain('api.whatsapp.com/send');

    const telegramLink = screen.getByRole('link', { name: /compartir en telegram/i });
    expect(telegramLink).toHaveAttribute('target', '_blank');
    expect(telegramLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(telegramLink.getAttribute('href')).toContain('t.me/share/url');
  });

  it('copies route link to clipboard when copy button is clicked and shows success feedback', async () => {
    vi.spyOn(shareUtils, 'copyToClipboard').mockResolvedValue(true);

    render(<RouteShareModal {...defaultProps} />);

    const copyBtn = screen.getByRole('button', { name: /copiar enlace de la ruta/i });
    await userEvent.click(copyBtn);

    expect(shareUtils.copyToClipboard).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('¡Enlace copiado!')).toBeInTheDocument();
    });
  });
});

