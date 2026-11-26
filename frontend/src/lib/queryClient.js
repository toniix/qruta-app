import { QueryClient } from '@tanstack/react-query';

export const STALE_TIMES = {
  CATALOG: 5 * 60 * 1000,
  OPERATIONAL: 2 * 60 * 1000,
  METRICS: 60 * 1000,
};

export function shouldRetryQuery(failureCount, error) {
  if (failureCount >= 1) return false;
  const status = error?.response?.status;
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 422 ||
    (status >= 400 && status < 500)
  ) {
    return false;
  }
  return true;
}

export function createPortalQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.OPERATIONAL,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
