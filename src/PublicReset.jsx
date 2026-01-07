import { useEffect } from 'react';
import { useAuth } from './AuthContext';

export default function PublicReset({ children }) {
  const { setLoading } = useAuth();

  useEffect(() => {
    // 1) Oprește orice overlay de loading global
    try { setLoading(false); } catch {}

    // 2) Resetează stilurile care blochează tap pe iOS
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = 'auto';
    body.style.overflow = 'auto';
    body.style.position = 'static';
    body.style.pointerEvents = 'auto';
    body.style.touchAction = 'manipulation';

    // 3) Dacă ai rămas cu un "focus trap" / backdrop, îl omorâm (safe)
    // (nu ștergem elemente, doar le dezactivăm)
    const killers = [
      '.navMenuOverlay',
      '.modalOverlay',
      '.overlay',
      '[data-overlay="true"]',
    ];

    killers.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        try { el.style.pointerEvents = 'none'; } catch {}
      });
    });
  }, [setLoading]);

  return children;
}