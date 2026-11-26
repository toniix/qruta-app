import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Polyfill HTMLDialogElement modal methods when jsdom does not implement them.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!('open' in HTMLDialogElement.prototype)) {
    Object.defineProperty(HTMLDialogElement.prototype, 'open', {
      get() {
        return this.hasAttribute('open');
      },
      set(value) {
        if (value) {
          this.setAttribute('open', '');
        } else {
          this.removeAttribute('open');
        }
      },
      configurable: true,
    });
  }

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      if (!this.hasAttribute('open')) {
        this.setAttribute('open', '');
      }
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(returnValue) {
      this.returnValue = returnValue ?? '';
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

// RTL only auto-registers cleanup when globals are enabled; with
// globals: false we do it explicitly so mounted portals never leak
// from one test into the next.
afterEach(() => {
  cleanup();
});
