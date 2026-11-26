import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { STALE_TIMES } from '../lib/queryClient';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createSharedTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: STALE_TIMES.CATALOG,
        gcTime: 10 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithQueryClient(ui, { queryClient, ...renderOptions } = {}) {
  const client = queryClient ?? createTestQueryClient();
  const renderResult = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    renderOptions,
  );

  return {
    ...renderResult,
    queryClient: client,
  };
}
