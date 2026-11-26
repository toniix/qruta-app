import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createPortalQueryClient } from '../../lib/queryClient';

export function PortalQueryProvider({ children }) {
  const [queryClient] = useState(() => createPortalQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
