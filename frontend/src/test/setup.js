import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL only auto-registers cleanup when globals are enabled; with
// globals: false we do it explicitly so mounted portals never leak
// from one test into the next.
afterEach(() => {
  cleanup();
});
