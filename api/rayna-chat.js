// api/rayna-chat.js
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export const config = { runtime: "nodejs" };

const MODEL_ANSWER = "llama-3.1-8b-instant";
const MODEL_NORMALIZE = "llama-3.1-8b-instant"; // poți schimba cu alt model dacă vrei

function systemPromptAnswer(lang = "es") {
  if (lang === "ro") {
    return "Ești Rayna, asistent logistic. Răspunde foarte scurt și la obiect (2-4 propoziții). Dacă lipsesc date, pune o singură întrebare clară.";
  }
  if (lang === "ca") {
    return "Ets Rayna, assistent de logística. Respon molt curt i directe (2-4 frases). Si falten dades, fes una sola pregunta clara.";
  }
  return "Eres Rayna, asistente de logística. Responde muy corto y directo (2-4 frases). Si faltan datos, haz una sola pregunta clara.";
}

/* ─────────────────────────────────────────────────────────────
   NORMALIZE SYSTEM PROMPT (după cerințele tale)
   - întoarce DOAR JSON valid, fără text extra
   ───────────────────────────────────────────────────────────── */
function systemPromptNormalize() {
  return `
Rolul tău: Ești un translator între limbaj natural și comenzi sistem pentru Rayna Hub, un asistent logistic.

Intents disponibile:

1. PROFIL ȘOFER
   Intent: "profile_info"
   Trigger words: "cine sunt", "quien soy", "mi perfil", "datele mele", "informații despre mine"
   Slots: topic (opțional: "cap", "carnet", "adr", "itv_camion", "itv_remolque")
   Exemple normalizate:
   - "cine sunt" → "quien soy"
   - "când îmi expiră CAP-ul" → "CAP expirare"
   - "ITV camion" → "itv camion"

2. COMPLETARE PROFIL
   Intent: "profile_complete"
   Trigger words: "completar perfil", "actualizar datos", "añadir información", "wizard"
   Exemple:
   - "vreau să completez profilul" → "completar perfil"
   - "actualizează-mi datele" → "completar perfil wizard"

3. VEHICULE
   Intent: "vehicle_info"
   Slots: vehicle_type ("camion"|"remolque"), info_type ("itv"|"aceite"|"adblue")
   Trigger words: "mi camión", "camionul meu", "ITV", "ulei", "AdBlue"
   Exemple:
   - "arată-mi camionul" → "mi camion"
   - "când e ITV-ul la remorcă" → "itv remolque"

4. SELECȚIE CONTAINER PENTRU ÎNCĂRCARE
   Intent: "pick_container_load"
   Slots: size_base ("20"|"40"|"45"), size_special ("hc"|"ot"|"bajo"), naviera (string)
   Trigger words: "contenedor para cargar", "container de încărcat", "pick", "alege", "sugerează container"
   Variante dimensiuni:
   - "20", "20 pies", "20 OT", "20 Open Top"
   - "40", "40 bajo", "40 normal", "40 HC", "40 alto", "40 high cube", "40 OT"
   - "45"
   Variante naviere: Maersk, MSC, Evergreen, Hapag, ONE, COSCO, CMA, HMM, ZIM, Yang Ming, Messina
   Exemple:
   - "necesito un 40 alto de Maersk" → "pick container 40 alto Maersk"
   - "container 20 OT MSC pentru încărcare" → "pick container 20 ot MSC"
   - "sugerează-mi unde să iau un 45" → "pick container 45"

5. DEPOZIT / CONTAINERE (din alte module)
   Intent: "depot_query"
   Trigger words: "containere", "contenedores", "depot", "patio", "terminal"
   Slots: location, terminal, code
   Exemple:
   - "ce marfă am în Barcelona" → "containere Barcelona"
   - "lista containerelor TCB" → "depot TCB lista"

6. PARKING
   Intent: "parking_search"
   Slots: location, radius
   Trigger words: "parking", "parcare", "estacionamiento", "dónde aparcar"

7. SALUT
   Intent: "greeting"
   Trigger words: "hola", "salut", "bună", "buenos días", "hey"

8. AJUTOR / ÎNVĂȚARE
   Intent: "help" | "aprender"
   Trigger words: "ayuda", "ajutor", "aprender", "învață", "tutorial", "cómo funciona"

Instrucțiuni stricte:
- NU inventa informații
- Extrage DOAR entitățile menționate explicit
- Dacă nu înțelegi, returnează null pentru intent
- Păstrează codurile de containere exacte (ex: ABCD1234567)
- Normalizează la minimum necesar pentru NLU
- Identifică limba (ro/es/ca) din text

Format răspuns JSON:
{
  "normalized_text": "text simplificat pentru NLU",
  "suggested_intent": "intent_name_or_null",
  "slots": { "slot_name": "value" },
  "detected_lang": "es|ro|ca"
}

IMPORTANT:
- Răspunde DOAR cu JSON valid (fără explicații, fără markdown, fără backticks).
`.trim();
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function clampUserText(s, maxChars = 700) {
  const t = String(s || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(-maxChars);
}

function clampIntents(intents, maxChars = 6000) {
  // payload control: serializăm și tăiem din capăt dacă e prea mare
  const raw = JSON.stringify(intents || []);
  if (raw.length <= maxChars) return raw;
  return raw.slice(0, maxChars);
}

function stripJsonFences(s = "") {
  const t = String(s || "").trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  }
  return t;
}

function extractFirstJsonObject(text = "") {
  const raw = stripJsonFences(text);
  const m = raw.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

function parseNormalizeJson(aiText) {
  const raw = stripJsonFences(aiText);
  try {
    return JSON.parse(raw);
  } catch {
    const obj = extractFirstJsonObject(raw);
    if (!obj) return null;
    try {
      return JSON.parse(obj);
    } catch {
      return null;
    }
  }
}

function normalizeDetectedLang(x) {
  const t = String(x || "").toLowerCase();
  if (t.startsWith("ro")) return "ro";
  if (t.startsWith("ca")) return "ca";
  return "es";
}

function coerceNormalizeShape(obj) {
  const normalized_text = String(obj?.normalized_text || "").trim();
  const suggested_intent =
    obj?.suggested_intent === null || obj?.suggested_intent === undefined
      ? null
      : String(obj.suggested_intent).trim() || null;

  const slots = obj?.slots && typeof obj.slots === "object" ? obj.slots : {};
  const detected_lang = normalizeDetectedLang(obj?.detected_lang);

  return { normalized_text, suggested_intent, slots, detected_lang };
}

/* ─────────────────────────────────────────────────────────────
   Handler
   ───────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // sanity: cheia există?
    const key = (process.env.GROQ_API_KEY || "").trim();
    if (!key) {
      return res.status(500).json({
        error: "Missing GROQ_API_KEY",
        hint: "Set GROQ_API_KEY in Vercel env (prod) or in .env.local (vercel dev). Restart dev server.",
      });
    }
    // Verificare corectă pentru Groq (cheile încep cu gsk_):
    if (!key.startsWith("gsk_")) {
      return res.status(500).json({
        error: "GROQ_API_KEY looks invalid",
        hint: "Groq keys start with gsk_ (not sk_gsk_)",
      });
    }

    const { mode = "answer", text, lang, intents, maxTokens } = req.body || {};
    const userText = clampUserText(text);

    if (!userText) return res.status(400).json({ error: "Missing text" });

    const t0 = Date.now();

    // ─────────────────────────────────────────────
    // MODE: NORMALIZE
    // ─────────────────────────────────────────────
    if (String(mode) === "normalize") {
      // intents vine din RaynaHub (scurtat). Totuși, îl “clamp”-uim.
      const intentsRaw = clampIntents(intents || []);

      const prompt =
        `TEXT USER:\n${userText}\n\n` +
        `LANG (hint): ${String(lang || "es")}\n\n` +
        `INTENTS (JSON, may be truncated):\n${intentsRaw}\n\n` +
        `Răspunde acum DOAR cu JSON valid conform formatului cerut.`;

      const result = await generateText({
        model: groq(MODEL_NORMALIZE),
        system: systemPromptNormalize(),
        prompt,
        maxTokens: 260,
        temperature: 0.0, // 🔒 pentru JSON stabil
        topP: 0.9,
      });

      const latency_ms = Date.now() - t0;

      const parsed = parseNormalizeJson(result.text || "");
      if (!parsed) {
        return res.status(502).json({
          error: "normalize_bad_json",
          hint: "Model did not return valid JSON",
          raw: (result.text || "").slice(0, 2000),
          model: MODEL_NORMALIZE,
          latency_ms,
        });
      }

      const out = coerceNormalizeShape(parsed);

      return res.status(200).json({
        ...out,
        usage: result.usage || null,
        model: MODEL_NORMALIZE,
        latency_ms,
      });
    }

    // ─────────────────────────────────────────────
    // MODE: ANSWER (comportamentul tău existent)
    // ─────────────────────────────────────────────
    const result = await generateText({
      model: groq(MODEL_ANSWER),
      system: systemPromptAnswer(lang || "es"),
      prompt: userText,
      maxTokens: Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : 180,
      temperature: 0.2,
      topP: 0.9,
    });

    const latency_ms = Date.now() - t0;

    return res.status(200).json({
      text: result.text || "",
      usage: result.usage || null,
      model: MODEL_ANSWER,
      latency_ms,
    });
  } catch (err) {
    // aici vei vedea mesajul real (inclusiv 401 invalid_api_key)
    return res.status(500).json({
      error: "AI failed",
      message: err?.message || String(err),
      name: err?.name || null,
      cause: err?.cause || null,
    });
  }
}
