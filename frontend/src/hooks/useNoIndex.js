import { useEffect } from 'react';

/**
 * Sets `<meta name="robots" content="noindex, nofollow">` while mounted and
 * restores the previous metadata on unmount. Optionally sets `document.title`.
 */
export function useNoIndex(title) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) {
      document.title = title;
    }

    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }

    const prevContent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      if (created) {
        meta.remove();
      } else if (prevContent !== null) {
        meta.setAttribute('content', prevContent);
      } else {
        meta.removeAttribute('content');
      }

      if (title) {
        document.title = prevTitle;
      }
    };
  }, [title]);
}

export default useNoIndex;
