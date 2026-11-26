import { useEffect, useRef } from 'react';

/**
 * Fires a single error toast when a TanStack Query transitions into a fresh
 * settled error state, without replaying stale cached errors on mount or
 * duplicating toasts across re-renders.
 */
export function useQueryErrorToast({
  isError,
  isFetching = false,
  errorUpdatedAt = 0,
  error,
  message,
  toast,
  logLabel,
}) {
  const lastToastedAtRef = useRef(errorUpdatedAt || 0);

  useEffect(() => {
    if (isError && !isFetching && errorUpdatedAt > lastToastedAtRef.current) {
      lastToastedAtRef.current = errorUpdatedAt;
      if (logLabel) {
        console.error(logLabel, error);
      }
      toast.error(message);
    }
  }, [isError, isFetching, errorUpdatedAt, error, message, toast, logLabel]);
}
