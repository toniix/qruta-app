import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  STALE_TIMES,
  createPortalQueryClient,
  shouldRetryQuery,
} from './queryClient';

describe('shouldRetryQuery', () => {
  it.each([400, 401, 403, 404, 409, 422])(
    'does not retry HTTP %i client errors',
    (status) => {
      const error = { response: { status } };
      expect(shouldRetryQuery(0, error)).toBe(false);
    },
  );

  it('retries 5xx server errors on the first failure', () => {
    expect(shouldRetryQuery(0, { response: { status: 500 } })).toBe(true);
    expect(shouldRetryQuery(0, { response: { status: 503 } })).toBe(true);
  });

  it('retries network errors without an HTTP response on the first failure', () => {
    expect(shouldRetryQuery(0, new Error('Network Error'))).toBe(true);
    expect(shouldRetryQuery(0, undefined)).toBe(true);
  });

  it('stops retrying once failureCount reaches 1', () => {
    expect(shouldRetryQuery(1, { response: { status: 500 } })).toBe(false);
    expect(shouldRetryQuery(1, new Error('Network Error'))).toBe(false);
    expect(shouldRetryQuery(2, { response: { status: 503 } })).toBe(false);
  });
});

describe('createPortalQueryClient', () => {
  it('configures portal default options for queries and mutations', () => {
    const client = createPortalQueryClient();
    expect(client).toBeInstanceOf(QueryClient);

    const defaults = client.getDefaultOptions();
    expect(defaults.queries).toMatchObject({
      staleTime: STALE_TIMES.OPERATIONAL,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    });
    expect(defaults.mutations).toMatchObject({
      retry: false,
    });
  });

  it('creates an isolated QueryClient instance on each call', () => {
    const first = createPortalQueryClient();
    const second = createPortalQueryClient();
    expect(first).not.toBe(second);
  });
});
