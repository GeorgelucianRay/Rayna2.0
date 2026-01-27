// api/rayna-chat.js
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export const config = { runtime: "nodejs" };

const MODEL_ANSWER = "llama-3.1-8b-instant";
const MODEL_NORMALIZE = "llama-3.1-8b-instant";

/* ─────────────────────────────────────────────────────────────
   1) SYSTEM PROMPTS
   ───────────────────────────────────────────────────────────── */

function systemPromptAnswer(lang = "es") {
  // Pass 2 (humanize): STRICT pe baza CONTEXTULUI din DB
  if (lang === "ro") {
    return `
Ești Rayna (componenta AI de formulare), asistent logistic.
REGULI CRITICE:
- NU inventa absolut nimic. Nu inventa coduri, locații, stocuri, numere, "almacén", "serie".
- Folosește STRICT datele din CONTEXT_DB_JSON (care vin din baza de date).
- Dacă CONTEXT_DB_JSON nu are informația cerută, spune clar: "Nu am găsit în sistem" și pune O SINGURĂ întrebare de clarificare.
- Răspunde scurt (2-4 propoziții), clar, prietenos.
`.trim();
  }
  if (lang === "ca") {
    return `
Ets Rayna (component d'IA de redacció), assistent de logística.
REGLES CRÍTIQUES:
- No inventis res. No inventis codis, ubicacions, estocs, números.
- Fes servir NOMÉS dades del CONTEXT_DB_JSON (venen de la base de dades).
- Si el CONTEXT_DB_JSON no té la info, digues: "No ho trobo al sistema" i fes UNA sola pregunta de clarificació.
- Resposta curta (2-4 frases).
`.trim();
  }
  return `
Eres Rayna (componente IA de redacción), asistente de logística.
REGLAS CRÍTICAS:
- NO inventes absolutamente nada. No inventes códigos, ubicaciones, stock, números.
- Usa SOLO los datos del CONTEXT_DB_JSON (vienen de la base de datos).
- Si el CONTEXT_DB_JSON no tiene la información, di: "No lo encuentro en el sistema" y haz UNA sola pregunta de aclaración.
- Responde corto (2-4 frases), claro y amable.
`.trim();
}

/* Pass 1 (normalize): translator → normalized_text + suggested_intent + slots + detected_lang */
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

5. DEPOZIT / CONTAINERE
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

Format răspuns JSON (DOAR JSON valid, fără markdown):
{
  "normalized_text": "text simplificat pentru NLU",
  "suggested_intent": "intent_name" sau null,
  "slots": { "slot_name": "value" },
  "detected_lang": "es|ro|ca"
}

IMPORTANT: Răspunde DOAR cu JSON valid (fără explicații, fără markdown, fără backticks).
`.trim();
}

/* ─────────────────────────────────────────────────────────────
   2) HELPERS
   ───────────────────────────────────────────────────────────── */

function clampUserText(s, maxChars = 700) {
  const t = String(s || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(-maxChars);
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
      : String(obj?.suggested_intent || "").trim() || null;

  const slots = obj?.slots && typeof obj.slots === "object" ? obj.slots : {};
  const detected_lang = normalizeDetectedLang(obj?.detected_lang);

  return { normalized_text, suggested_intent, slots, detected_lang };
}

/* ─────────────────────────────────────────────────────────────
   3) HANDLER (2 moduri)
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

    const { mode = "answer", text, lang, intents, context, maxTokens } = req.body || {};
    const userText = clampUserText(text);

    if (!userText) return res.status(400).json({ error: "Missing text" });

    const t0 = Date.now();

    /* ─────────────────────────────
       MODE 1: normalize  (pass 1)
       ───────────────────────────── */
    if (String(mode) === "normalize") {
      // intents din RaynaHub (lista cu exemple) – optional; îl includem ca “hint”
      const intentsJson = Array.isArray(intents) ? intents : null;

      const prompt =
        `TEXT USER:\n${userText}\n\n` +
        `LANG (hint): ${String(lang || "es")}\n\n` +
        `INTENTS (optional, JSON):\n${intentsJson ? JSON.stringify(intentsJson) : "null"}\n\n` +
        `Răspunde DOAR cu JSON valid conform formatului cerut.`;

      const result = await generateText({
        model: groq(MODEL_NORMALIZE),
        system: systemPromptNormalize(),
        prompt,
        maxTokens: 320,
        temperature: 0.0, // stabil JSON
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

    /* ─────────────────────────────
       MODE 2: answer (pass 2 humanize)
       - primește context real din DB
       ───────────────────────────── */
    const safeContext = context && typeof context === "object" ? context : null;

    const prompt =
      `USER_TEXT:\n${userText}\n\n` +
      `CONTEXT_DB_JSON (source of truth):\n${safeContext ? JSON.stringify(safeContext) : "null"}\n\n` +
      `Instrucțiuni: formulează un răspuns prietenos pentru utilizator folosind STRICT datele din CONTEXT_DB_JSON. ` +
      `Dacă nu există date suficiente în context, spune că nu ai găsit în sistem și pune o singură întrebare de clarificare.`;

    const result = await generateText({
      model: groq(MODEL_ANSWER),
      system: systemPromptAnswer(lang || "es"),
      prompt,
      maxTokens: Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : 220,
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
    return res.status(500).json({
      error: "AI failed",
      message: err?.message || String(err),
      name: err?.name || null,
      cause: err?.cause || null,
    });
  }
}