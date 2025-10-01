// ——— Normalize: minuscul, fără diacritice, doar [a-z0-9 spațiu]
export function normalize(s) {
  if (s == null) return "";
  const DIAC = {
    // ES
    "á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u","ñ":"n",
    "Á":"a","É":"e","Í":"i","Ó":"o","Ú":"u","Ü":"u","Ñ":"n",
    // RO
    "ă":"a","â":"a","î":"i","ș":"s","ş":"s","ț":"t","ţ":"t",
    "Ă":"a","Â":"a","Î":"i","Ș":"s","Ş":"s","Ț":"t","Ţ":"t",
    // CA
    "ò":"o","ó":"o","à":"a","è":"e","é":"e","ï":"i","ü":"u",
    "Ò":"o","Ó":"o","À":"a","È":"e","É":"e","Ï":"i","Ü":"u"
  };
  let out = String(s).replace(/[\s\S]/g, c => DIAC[c] ?? c);
  out = out.toLowerCase();
  out = out.replace(/[^a-z0-9\s]/g, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}