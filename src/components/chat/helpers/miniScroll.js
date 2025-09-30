// src/components/chat/helpers/miniScroll.js
export function scrollToBottom(endRef) {
  endRef.current?.scrollIntoView({ behavior: "smooth" });
}