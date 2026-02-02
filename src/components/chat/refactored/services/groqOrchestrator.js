// src/components/chat/refactored/services/groqOrchestrator.js

async function postToGroq(body) {
  try {
    const res = await fetch("/api/rayna-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const raw = await res.text().catch(() => "");
    if (!res.ok) {
      try {
        window.__raynaLog?.("GROQ:HTTP_ERROR", { status: res.status, raw }, "error");
      } catch { }
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (e) {
      try {
        window.__raynaLog?.("GROQ:BAD_JSON", { raw }, "error");
      } catch { }
      return null;
    }
  } catch (e) {
    try {
      window.__raynaLog?.("GROQ:ERROR", { message: e?.message || String(e) }, "error");
    } catch { }
    return null;
  }
}

/**
 * Normalize size from various formats to "20" | "40" | "45"
 * Accepts: "20", "20ft", "20 pies", "40hc", "40'", "40 HQ", "45ft", etc.
 */
function normalizeSize(sizeRaw) {
  const s = String(sizeRaw || "").trim().toLowerCase();
  if (!s) return null;

  // Direct match
  if (s === "20" || s === "40" || s === "45") return s;

  // Extract number from formats like "20ft", "40hc", "45'", "40 pies", etc.
  const match = s.match(/\b(20|40|45)\b/);
  return match ? match[1] : null;
}

/**
 * groqExtract: Strict JSON-only data extractor
 * 
 * Returns:
 * {
 *   intent: "pick_container_for_load" | "unknown",
 *   confidence: 0..1,
 *   slots: { size: "20"|"40"|"45", naviera: string } | null,
 *   missing: string[] (if data incomplete)
 * }
 */
export async function groqExtract({ text, lang }) {
  const body = {
    mode: "extract_pick_container",
    text,
    lang,
    instructions: `You are a JSON-only data extractor. Return ONLY valid JSON, no extra text.

Extract from user text:
- intent: "pick_container_for_load" if user requests container "para cargar" / "cargar" / "para carga" / "pick" / "alege" / "pentru încărcare"
- slots.size: extract size and normalize to "20" | "40" | "45" (from "20ft", "40hc", "40'", "45 pies", "20 pes", etc.)
- slots.naviera: shipping company name (Maersk, MSC, CMA CGM, Hapag-Lloyd, ONE, etc.) - case-insensitive, extract as-is
- confidence: 0..1 (how confident you are in the extraction)

If user does NOT request "para cargar/pick/alege", set intent to "unknown".
If size or naviera missing, include in "missing" array.

Example outputs:

Input: "buenas, dame un contenedor de 20 maersk para cargar"
Output: {"intent":"pick_container_for_load","confidence":0.9,"slots":{"size":"20","naviera":"MAERSK"}}

Input: "necesito 40hc msc para cargar"
Output: {"intent":"pick_container_for_load","confidence":0.85,"slots":{"size":"40","naviera":"MSC"}}

Input: "dame un contenedor para cargar"
Output: {"intent":"pick_container_for_load","confidence":0.7,"missing":["size","naviera"]}

Input: "hola"
Output: {"intent":"unknown","confidence":0.95}

Return ONLY the JSON object, nothing else.`,
  };

  const json = await postToGroq(body);
  if (!json) {
    return { intent: null, confidence: 0, slots: null, missing: null };
  }

  // Extract and normalize
  const intent = json?.intent || json?.suggested_intent || json?.suggestedIntent || null;
  const confidence = typeof json?.confidence === "number" ? json.confidence : 0.5;
  const slots = json?.slots || json?.Slots || null;
  const missing = json?.missing || json?.Missing || null;

  // Normalize size if present
  let normalizedSlots = null;
  if (slots && typeof slots === "object") {
    const size = normalizeSize(slots.size || slots.tamano || slots.tipo || slots.SIZE);
    const naviera = slots.naviera || slots.carrier || slots.nav || slots.linea || null;

    if (size || naviera) {
      normalizedSlots = {
        size: size || null,
        naviera: naviera ? String(naviera).trim().toUpperCase() : null,
      };
    }
  }

  return {
    intent,
    confidence,
    slots: normalizedSlots,
    missing: Array.isArray(missing) ? missing : null,
    raw: json,
  };
}

/**
 * groqAnswer: Format response with context (AFTER DB selection)
 */
export async function groqAnswer({ text, lang, context }) {
  const body = { mode: "answer", text, lang, context };
  const json = await postToGroq(body);
  if (!json) return { answerText: null, raw: null };

  return { answerText: json?.answer || json?.text || json?.message || null, raw: json };
}

export default { groqExtract, groqAnswer };
