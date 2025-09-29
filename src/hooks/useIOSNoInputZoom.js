import { useEffect } from 'react';

export default function useIOSNoInputZoom() {
  useEffect(() => {
    const isiOS = /iP(ad|hone|od)/.test(navigator.userAgent);
    if (!isiOS) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const original = meta.getAttribute('content') ||
      'width=device-width, initial-scale=1, viewport-fit=cover';

    const onFocusIn = (e) => {
      const t = e.target;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (!/maximum-scale=1/.test(meta.content)) {
          meta.setAttribute('content', `${original}, maximum-scale=1`);
        }
      }
    };

    const onFocusOut = () => {
      meta.setAttribute('content', original);
    };

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    return () => {
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      meta.setAttribute('content', original);
    };
  }, []);
}