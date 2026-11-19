import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OperatorSubscriptionPage } from './OperatorSubscriptionPage';
import { operatorAuthService } from '../../services/operatorAuthService';
import { operatorPortalService } from '../../services/operatorPortalService';

vi.mock('../../services/operatorPortalService', () => ({
  operatorPortalService: {
    getSubscription: vi.fn(),
    createCheckout: vi.fn(),
  },
}));

vi.mock('../../services/operatorAuthService', () => ({
  operatorAuthService: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../../hooks/useAdminToast', () => ({
  useAdminToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

describe('OperatorSubscriptionPage', () => {
  let openSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    operatorAuthService.getCurrentUser.mockReturnValue({ operatorName: 'Transportes Ica' });
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('renders the subscription state returned by the backend', async () => {
    operatorPortalService.getSubscription.mockResolvedValue({
      plan: 'PRO',
      status: 'PAST_DUE',
      startsAt: '2026-11-01T08:00:00',
      renewsAt: '2026-11-30T08:00:00',
      graceUntil: '2026-12-05T08:00:00',
      periods: [
        {
          id: 'period-1',
          fromAt: '2026-11-01T08:00:00',
          toAt: '2026-11-30T08:00:00',
          amount: '49.00',
          currency: 'PEN',
          method: 'QR',
          status: 'FAILED',
          providerReference: 'ref-1',
        },
      ],
    });

    render(<OperatorSubscriptionPage />);

    await waitFor(() => {
      expect(screen.getByText(/Vencida \(PAST_DUE\)/)).toBeInTheDocument();
    });
    expect(operatorPortalService.getSubscription).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Transportes Ica')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText(/49\.00|PEN/)).toBeInTheDocument();
    expect(screen.getByText('Fallido')).toBeInTheDocument();
    expect(screen.getByText('ref-1')).toBeInTheDocument();
  });

  it('starts checkout and opens the returned payment URL', async () => {
    operatorPortalService.getSubscription.mockResolvedValue({
      plan: 'PRO',
      status: 'ACTIVE',
      periods: [],
    });
    operatorPortalService.createCheckout.mockResolvedValue({
      checkoutUrl: 'https://pay.simulado.test/checkout/ref-1',
      status: 'PENDING',
    });

    render(<OperatorSubscriptionPage />);

    const payButton = await screen.findByRole('button', { name: /pagar ahora/i });
    await waitFor(() => expect(payButton).toBeEnabled());
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(operatorPortalService.createCheckout).toHaveBeenCalledWith({
        plan: 'PRO',
        method: 'QR',
      });
    });
    expect(openSpy).toHaveBeenCalledWith(
      'https://pay.simulado.test/checkout/ref-1',
      '_self'
    );
  });
});
