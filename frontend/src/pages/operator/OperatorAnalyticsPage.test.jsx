import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { OperatorAnalyticsPage } from './OperatorAnalyticsPage';
import { operatorPortalService } from '../../services/operatorPortalService';
import { renderWithQueryClient } from '../../test/queryTestUtils';

vi.mock('../../services/operatorPortalService', () => ({
  operatorPortalService: {
    getAnalyticsSummary: vi.fn(),
    getRouteAnalytics: vi.fn(),
  },
}));

describe('OperatorAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operatorPortalService.getAnalyticsSummary.mockResolvedValue({
      lines: [
        {
          lineId: 'line-1',
          lineName: 'Empresa San Jerónimo',
          views: 30,
          searches: 15,
          qrScans: 5,
          uniqueDevices: 20,
        },
      ],
      days: [{ date: '2026-11-17', views: 10, searches: 5, qrScans: 2 }],
      routes: [
        {
          routeId: 'route-1',
          routeName: 'Ruta 1',
          routeCode: 'R1',
          interactions: 45,
        },
      ],
    });
    operatorPortalService.getRouteAnalytics.mockResolvedValue({
      routeId: 'route-1',
      series: [{ date: '2026-11-17', views: 10, searches: 5, qrScans: 2 }],
    });
  });

  it('renders the operator analytics summary and a selected route series', async () => {
    renderWithQueryClient(<OperatorAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Resumen de la red')).toBeInTheDocument();
    });

    expect(operatorPortalService.getAnalyticsSummary).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    );
    expect(screen.getByText('Ruta 1')).toBeInTheDocument();
    expect(screen.getByText('2026-11-17')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ruta 1/ }));

    await waitFor(() => {
      expect(screen.getByText('Serie diaria de la ruta')).toBeInTheDocument();
    });
    expect(operatorPortalService.getRouteAnalytics).toHaveBeenCalledWith(
      'route-1',
      expect.any(String),
      expect.any(String)
    );
  });
});
