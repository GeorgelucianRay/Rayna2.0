// src/components/chat/ai/raynaAiBridge.js
import { normalizeLang } from "../nlu/lang";

/* ─────────────────────────────────────────────
   API calls: /api/rayna-chat
   - mode: normalize
   - mode: answer
   ───────────────────────────────────────────── */

async function postRaynaChat(payload) {
  const r = await fetch("/api/rayna-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await r.text().catch(() => "");
  if (!r.ok) {
    const err = new Error(`rayna-chat failed (${r.status})`);
    err.status = r.status;
    err.raw = raw;
    throw err;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error("rayna-chat returned invalid JSON");
    err.raw = raw;
    throw err;
  }
}

/* shrink intents for AI normalize */
export function serializeIntentsForAi(intentsData, { maxIntents = 80, maxExamples = 6 } = {}) {
  const arr = Array.isArray(intentsData) ? intentsData : [];

  const pickExamples = (it) => {
    const ex = it?.examples || it?.training || it?.utterances || it?.phrases || it?.samples || [];
    return Array.isArray(ex) ? ex : [];
  };

  return arr
    .slice(0, maxIntents)
    .map((it) => ({
      type: it?.type || it?.intent || it?.name || "",
      examples: pickExamples(it)
        .filter((x) => typeof x === "string" && x.trim())
        .slice(0, maxExamples),
      slots: it?.slots || it?.slot_schema || it?.entities || undefined,
      tags: it?.tags || undefined,
    }))
    .filter((x) => x.type);
}

/* ─────────────────────────────────────────────
   Public API (bridge)
   ───────────────────────────────────────────── */

export function createRaynaAiBridge({ intentsData, langRef, logger }) {
  const log = logger || (() => {});
  let lastDbContext = null;

  return {
    getLastContext() {
      return lastDbContext;
    },

    captureContext(result) {
      // Acceptă orice acțiune care returnează { context: {...} }
      if (result?.context) {
        lastDbContext = result.context;
        log("DB/Context:Set", lastDbContext, "info");
      }
      return lastDbContext;
    },

    clearContext() {
      lastDbContext = null;
    },

    async normalize({ text, lang }) {
      const intents = serializeIntentsForAi(intentsData);

      log("AI/Normalize:START", { lang, text }, "info");

      const json = await postRaynaChat({
        mode: "normalize",
        text,
        lang,
        intents,
      });

      const detected_lang = json?.detected_lang ? normalizeLang(json.detected_lang) : null;

      const out = {
        normalized_text: json?.normalized_text || "",
        suggested_intent: json?.suggested_intent ?? null,
        slots: json?.slots && typeof json.slots === "object" ? json.slots : null,
        detected_lang,
        raw: json,
      };

      log("AI/Normalize:OK", out, "info");
      return out;
    },

    async answer({ text, lang, context = null, maxTokens = 240 }) {
      const ctx =
        context ??
        lastDbContext ??
        {
          found: false,
          intent: null,
          data: null,
          meta: { note: "no_db_context_available" },
        };

      log("AI/Answer:START", { lang, hasContext: !!ctx }, "info");

      const json = await postRaynaChat({
        mode: "answer",
        text,
        lang,
        context: ctx,
        maxTokens,
      });

      log("AI/Answer:OK", { model: json?.model, usage: json?.usage }, "info");
      return json;
    },
  };
}