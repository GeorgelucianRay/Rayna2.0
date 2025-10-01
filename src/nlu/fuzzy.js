import { normalize } from "./normalize.js";

// Damerau–Levenshtein simplu
function ed(a, b) {
  const al = a.length, bl = b.length;
  const d = Array.from({ length: al + 1 }, (_, i) =>
    Array.from({ length: bl + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + c);
      }
    }
  }
  return d[al][bl];
}

export const fuzzyEq = (a, b) => {
  a = normalize(a); b = normalize(b);
  if (a === b) return true;
  const L = Math.max(a.length, b.length);
  const tol = L <= 4 ? 1 : 2;
  return ed(a, b) <= tol;
};

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function fuzzyPhraseInTokens(textTokens, patternTokens) {
  if (patternTokens.length === 0) return false;
  if (textTokens.length < patternTokens.length) return false;
  for (let i = 0; i <= textTokens.length - patternTokens.length; i++) {
    let all = true;
    for (let j = 0; j < patternTokens.length; j++) {
      if (!fuzzyEq(textTokens[i + j], patternTokens[j])) { all = false; break; }
    }
    if (all) return true;
  }
  return false;
}

export function includesAny(rawText, arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  const n = normalize(rawText);
  const toks = n.split(" ").filter(Boolean);
  return arr.some(p => {
    const np = normalize(p);
    if (!np) return false;
    if (np.includes(" ")) {
      const re = new RegExp(`(?:^|\\s)${esc(np)}(?:\\s|$)`);
      if (re.test(n)) return true;
      const ptoks = np.split(" ").filter(Boolean);
      return fuzzyPhraseInTokens(toks, ptoks);
    } else {
      return toks.some(tk => fuzzyEq(tk, np));
    }
  });
}

export function hasToken(text, list) {
  if (!Array.isArray(list) || !list.length) return false;
  const toks = normalize(text).split(" ").filter(Boolean);
  return list.some(w => toks.some(tk => fuzzyEq(tk, normalize(w))));
}