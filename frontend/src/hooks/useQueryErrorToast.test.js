import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQueryErrorToast } from './useQueryErrorToast';

describe('useQueryErrorToast', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires once when a fresh error occurs and fetching settles', () => {
    const toast = { error: vi.fn() };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Network failure');

    const { rerender } = renderHook((props) => useQueryErrorToast(props), {
      initialProps: {
        isError: false,
        isFetching: true,
        errorUpdatedAt: 0,
        error: null,
        message: 'Error al cargar datos.',
        toast,
        logLabel: 'Error cargando datos:',
      },
    });

    expect(toast.error).not.toHaveBeenCalled();

    // Still fetching with error timestamp updated -> should wait until settled
    rerender({
      isError: true,
      isFetching: true,
      errorUpdatedAt: 1000,
      error: err,
      message: 'Error al cargar datos.',
      toast,
      logLabel: 'Error cargando datos:',
    });

    expect(toast.error).not.toHaveBeenCalled();

    // Fetching settles with error -> fires once
    rerender({
      isError: true,
      isFetching: false,
      errorUpdatedAt: 1000,
      error: err,
      message: 'Error al cargar datos.',
      toast,
      logLabel: 'Error cargando datos:',
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Error al cargar datos.');
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('Error cargando datos:', err);
  });

  it('does not replay a stale cached error on initial mount', () => {
    const toast = { error: vi.fn() };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() =>
      useQueryErrorToast({
        isError: true,
        isFetching: false,
        errorUpdatedAt: 5000,
        error: new Error('Stale error'),
        message: 'Error al cargar datos.',
        toast,
        logLabel: 'Error cargando datos:',
      }),
    );

    expect(toast.error).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('does not fire duplicate toasts on re-renders with the same errorUpdatedAt', () => {
    const toast = { error: vi.fn() };
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Server error');

    const { rerender } = renderHook((props) => useQueryErrorToast(props), {
      initialProps: {
        isError: false,
        isFetching: false,
        errorUpdatedAt: 0,
        error: null,
        message: 'Error al cargar datos.',
        toast,
      },
    });

    rerender({
      isError: true,
      isFetching: false,
      errorUpdatedAt: 2000,
      error: err,
      message: 'Error al cargar datos.',
      toast,
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();

    // Re-render with identical errorUpdatedAt
    rerender({
      isError: true,
      isFetching: false,
      errorUpdatedAt: 2000,
      error: err,
      message: 'Error al cargar datos.',
      toast,
    });

    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
