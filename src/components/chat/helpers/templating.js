// src/components/chat/helpers/templating.js
export function tpl(str, ctx) {
  return (str || "").replace(/\{\{([^}]+)\}\}/g, (_, k) => {
    const path = k.trim().split(".");
    return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : ""), ctx);
  });
}