// src/hooks/useIOSNoInputZoom.js
import { useEffect } from "react";

export default function useIOSNoInputZoom() {
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const isiOS = /iP(hone|ad|od)/.test(ua);
    if (!isiOS) return;

    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    // setarea de bază (ai “viewport-fit=cover” pentru notch)
    const original =
      meta.getAttribute("content") ||
      "width=device-width, initial-scale=1, viewport-fit=cover";

    // Prevenim pinch/double-tap zoom când focusăm un input
    const onFocusIn = (e) => {
      const t = e.target;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) {
        if (!/maximum-scale=1/.test(meta.content)) {
          meta.setAttribute("content", `${original}, maximum-scale=1, user-scalable=no`);
        }
      }
    };
    const onFocusOut = () => {
      // revenim ca să nu stricăm zoom-ul în restul aplicației
      meta.setAttribute("content", original);
    };

    const preventGesture = (ev) => ev.preventDefault(); // pinch zoom
    const preventDoubleTap = (() => {
      let last = 0;
      return (ev) => {
        const now = Date.now();
        if (now - last < 350) ev.preventDefault();
        last = now;
      };
    })();

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("dblclick", preventDoubleTap, { passive: false });

    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("dblclick", preventDoubleTap);
      meta.setAttribute("content", original);
    };
  }, []);
}