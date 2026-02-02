import { detectLanguage, normalizeLang } from "./nlu/lang";
import { shortenForNLU } from "./nlu/shorten";

function extractContainerCode(text) {
  if (!text) return null;
  const re = /\b([A-Z]{4})\s?(\d{7})\b/i;
  const m = String(text || "").toUpperCase().match(re);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

function countContainerLikeTokens(s) {
  const re = /\b[A-Z]{4}\s?\d{7}\b/g;
  const hits = String(s || "").toUpperCase().match(re);
  return hits ? hits.length : 0;
}

function looksLikePickContainerLoad(text) {
  const t = String(text || "").toLowerCase();
  const wantsPick =
    t.includes("para cargar") ||
    t.includes("cargar") ||
    t.includes("pick") ||
    t.includes("alege") ||
    t.includes("suger") ||
    t.includes("sugere") ||
    t.includes("pentru");
  const hasSize = /\b(20|40|45)\b/.test(t);
  const hasContainerWord = t.includes("container") || t.includes("contenedor") || t.includes("conten");
  return wantsPick && hasContainerWord && hasSize;
}

function isDepotRequest(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("container") ||
    t.includes("contenedor") ||
    t.includes("conten") ||
    t.includes("depot") ||
    t.includes("patio") ||
    t.includes("terminal")
  );
}

function isGreeting(text) {
  const t = String(text || "").toLowerCase();
  return /\b(hola|hello|hi|salut|buenas)\b/.test(t);
}

/**
 * Analyze user text and return a JSON object with:
 * - raw_text
 * - normalized_text
 * - detected_lang
 * - container_code (if found)
 * - intent: { type, confidence, slots }
 *
 * This service does NOT call Supabase and only returns JSON.
 */
export async function analyze(text) {
  const raw = String(text || "").trim();

  // language detection
  const detected = normalizeLang(detectLanguage(raw) || "");

  // normalized text for NLU (reuse shorten logic)
  const normalized_text = shortenForNLU(raw || "");

  // container code extraction
  const container_code = extractContainerCode(raw);

  // simple heuristic intent extraction
  let intent = { type: null, confidence: 0, slots: {} };

  if (container_code) {
    intent = { type: "depot_lookup", confidence: 0.99, slots: { container_code } };
  } else if (looksLikePickContainerLoad(raw)) {
    intent = { type: "pick_container_for_load", confidence: 0.88, slots: {} };
  } else if (isDepotRequest(raw)) {
    // if many container-like tokens present, treat as list request
    const total = countContainerLikeTokens(raw);
    intent = { type: total ? "depot_list" : "depot_lookup", confidence: 0.75, slots: {} };
  } else if (isGreeting(raw)) {
    intent = { type: "greeting", confidence: 0.9, slots: {} };
  } else {
    // fallback: return normalized text and leave intent null for downstream NLU
    intent = { type: null, confidence: 0, slots: {} };
  }

  return {
    raw_text: raw,
    normalized_text,
    detected_lang: detected || null,
    container_code: container_code || null,
    intent,
  };
}

export { extractContainerCode };

export default { analyze, extractContainerCode };
