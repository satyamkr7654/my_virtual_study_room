import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom does not implement these
HTMLDialogElement.prototype.showModal ??= function showModal() { this.open = true; };
HTMLDialogElement.prototype.close ??= function close() { this.open = false; };

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});
