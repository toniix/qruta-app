import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent, flushAnalytics } from './analyticsClient';

describe('analyticsClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    flushAnalytics();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('batches an event and flushes it with keepalive after the delay', async () => {
    await trackEvent('route_view', { routeId: 'route-1' });
    expect(fetch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/analytics/events');
    expect(options.method).toBe('POST');
    expect(options.keepalive).toBe(true);

    const body = JSON.parse(options.body);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ category: 'route_view', routeId: 'route-1' });
    // The client sends a digest, never the raw device UUID.
    expect(body.events[0].deviceId).toHaveLength(64);
  });

  it('flushes immediately once the batch reaches fifty events', async () => {
    for (let i = 0; i < 50; i += 1) {
      await trackEvent('qr_scan', { campaign: 'paradero' });
    }

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.events).toHaveLength(50);
  });
});
