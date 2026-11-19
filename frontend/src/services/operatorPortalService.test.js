import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { operatorPortalService } from './operatorPortalService';

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('operatorPortalService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the operator profile endpoint', async () => {
    const profile = { operatorId: 'operator-1', cityName: 'Ica' };
    apiClient.get.mockResolvedValueOnce({ data: profile });

    const result = await operatorPortalService.getProfile();

    expect(apiClient.get).toHaveBeenCalledWith('/operator/profile');
    expect(result).toEqual(profile);
  });

  it('uses PUT for operator line, route and stop updates', async () => {
    apiClient.put.mockResolvedValue({ data: { ok: true } });

    await operatorPortalService.updateLine('line-1', { name: 'Línea 1' });
    await operatorPortalService.updateRoute('route-1', { name: 'Ruta 1' });
    await operatorPortalService.updateStop('stop-1', { name: 'Paradero 1' });

    expect(apiClient.put.mock.calls.map(([url]) => url)).toEqual([
      '/operator/lines/line-1',
      '/operator/routes/route-1',
      '/operator/stops/stop-1',
    ]);
  });

  it('loads one operator route detail', async () => {
    const detail = { id: 'route-1', directions: [] };
    apiClient.get.mockResolvedValueOnce({ data: detail });

    const result = await operatorPortalService.getRouteById('route-1');

    expect(apiClient.get).toHaveBeenCalledWith('/operator/routes/route-1');
    expect(result).toEqual(detail);
  });

  it('sends operator route directions to the dedicated PUT endpoint', async () => {
    const payload = { directions: [{ direction: 'IDA' }] };
    apiClient.put.mockResolvedValueOnce({ data: { id: 'route-1' } });

    await operatorPortalService.updateRouteDirections('route-1', payload);

    expect(apiClient.put).toHaveBeenCalledWith('/operator/routes/route-1/directions', payload);
  });

  it('loads analytics with the requested date range', async () => {
    const summary = { lines: [], days: [], routes: [], qrCampaigns: [] };
    apiClient.get.mockResolvedValueOnce({ data: summary });

    const result = await operatorPortalService.getAnalyticsSummary('2026-11-01', '2026-11-07');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/operator/analytics/summary?from=2026-11-01&to=2026-11-07'
    );
    expect(result).toEqual(summary);
  });

  it('loads a single route analytics series', async () => {
    const series = { routeId: 'route-1', series: [] };
    apiClient.get.mockResolvedValueOnce({ data: series });

    const result = await operatorPortalService.getRouteAnalytics(
      'route-1',
      '2026-11-01',
      '2026-11-07'
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      '/operator/analytics/routes/route-1?from=2026-11-01&to=2026-11-07'
    );
    expect(result).toEqual(series);
  });

  it('normalizes paginated operator route and stop lists', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { content: [{ id: 'route-1' }] } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'stop-1' }] } });

    await expect(operatorPortalService.getRoutes()).resolves.toEqual([{ id: 'route-1' }]);
    await expect(operatorPortalService.getStops()).resolves.toEqual([{ id: 'stop-1' }]);
  });

  it('loads the operator subscription', async () => {
    const subscription = { plan: 'PRO', status: 'ACTIVE', periods: [] };
    apiClient.get.mockResolvedValueOnce({ data: subscription });

    const result = await operatorPortalService.getSubscription();

    expect(apiClient.get).toHaveBeenCalledWith('/operator/subscription');
    expect(result).toEqual(subscription);
  });

  it('starts checkout through the billing endpoint', async () => {
    const payload = { plan: 'PRO', method: 'QR' };
    const checkout = { checkoutUrl: 'https://pay.simulado.test/checkout/ref-1', status: 'PENDING' };
    apiClient.post.mockResolvedValueOnce({ data: checkout });

    const result = await operatorPortalService.createCheckout(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/billing/checkout', payload);
    expect(result).toEqual(checkout);
  });
});
