import { useEffect, useRef } from 'react';

/** Closes only the topmost modal marked with data-modal-overlay. */
export function useEscapeToClose(onClose: () => void, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      const overlays = Array.from(
        document.querySelectorAll<HTMLElement>('[data-modal-overlay]'),
      );
      const top = overlays[overlays.length - 1];
      if (!ref.current || top !== ref.current) return;

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, enabled]);

  return ref;
}
