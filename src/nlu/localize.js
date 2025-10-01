export function pickLang(val, lang) {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val[lang] || val.es || val.ro || val.ca || "";
  return String(val);
}
export function deepClone(obj) { return obj ? JSON.parse(JSON.stringify(obj)) : obj; }

export function localizeIntent(intent, lang) {
  const it = deepClone(intent);
  if (it.response && "text" in it.response) it.response.text = pickLang(it.response.text, lang);
  if (it.not_found && "text" in it.not_found) it.not_found.text = pickLang(it.not_found.text, lang);
  if (it.dialog) {
    if ("ask_text" in it.dialog) it.dialog.ask_text = pickLang(it.dialog.ask_text, lang);
    if ("save_ok" in it.dialog) it.dialog.save_ok = pickLang(it.dialog.save_ok, lang);
    if ("save_err" in it.dialog) it.dialog.save_err = pickLang(it.dialog.save_err, lang);
  }
  return it;
}