import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Copies text to the clipboard and tracks a temporary "copied" state.
 * Cleans up any pending reset timer on unmount.
 */
export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copiedKey, setCopiedKey] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text, key = true) => {
      if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setCopiedKey(null);
          timeoutRef.current = null;
        }, resetDelayMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetDelayMs],
  );

  return {
    copied: copiedKey !== null,
    copiedKey,
    copy,
  };
}
