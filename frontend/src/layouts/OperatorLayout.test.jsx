import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatorLayout } from './OperatorLayout';
import { operatorPortalService } from '../services/operatorPortalService';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet-stub" />,
  };
});

vi.mock('../components/operator/layout/OperatorSidebar', () => ({
  OperatorSidebar: () => <div data-testid="operator-sidebar-stub" />,
}));

vi.mock('../components/operator/layout/OperatorTopBar', () => ({
  OperatorTopBar: () => <div data-testid="operator-topbar-stub" />,
}));

vi.mock('../components/admin/common/ToastContext', () => ({
  ToastProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('../services/operatorPortalService', () => ({
  operatorPortalService: {
    getSubscription: vi.fn(),
  },
}));

function renderLayout() {
  return render(
    <MemoryRouter>
      <OperatorLayout />
    </MemoryRouter>
  );
}

describe('OperatorLayout subscription banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a payment CTA when the backend reports a past due subscription', async () => {
    operatorPortalService.getSubscription.mockResolvedValue({ status: 'PAST_DUE' });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText(/suscripción está vencida/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /regularizar pago/i })).toHaveAttribute(
      'href',
      '/operador/suscripcion'
    );
  });

  it('hides the banner for active subscriptions and suppresses service errors', async () => {
    operatorPortalService.getSubscription.mockResolvedValue({ status: 'ACTIVE' });

    renderLayout();

    await waitFor(() => {
      expect(operatorPortalService.getSubscription).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    operatorPortalService.getSubscription.mockRejectedValue(new Error('offline'));
    renderLayout();

    await waitFor(() => {
      expect(operatorPortalService.getSubscription).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
