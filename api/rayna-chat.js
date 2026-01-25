// api/rayna-chat.js
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export const config = { runtime: "nodejs" };

const MODEL = "llama-3.1-8b-instant";

function systemPrompt(lang = "es") {
  if (lang === "ro") {
    return "Ești Rayna, asistent logistic. Răspunde foarte scurt și la obiect (2-4 propoziții). Dacă lipsesc date, pune o singură întrebare clară.";
  }
  if (lang === "ca") {
    return "Ets Rayna, assistent de logística. Respon molt curt i directe (2-4 frases). Si falten dades, fes una sola pregunta clara.";
  }
  return "Eres Rayna, asistente de logística. Responde muy corto y directo (2-4 frases). Si faltan datos, haz una sola pregunta clara.";
}

function clampUserText(s, maxChars = 700) {
  const t = String(s || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(-maxChars);
}

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
    if (!key.startsWith("sk_gsk_")) {
      return res.status(500).json({
        error: "GROQ_API_KEY looks invalid",
        hint: "Key must start with sk_gsk_. Remove duplicates like sk_gsk_gsk_ and spaces/quotes.",
      });
    }

    const { text, lang } = req.body || {};
    const userText = clampUserText(text);

    if (!userText) return res.status(400).json({ error: "Missing text" });

    const t0 = Date.now();

    const result = await generateText({
      model: groq(MODEL),
      system: systemPrompt(lang || "es"),
      prompt: userText,
      maxTokens: 180,
      temperature: 0.2,
      topP: 0.9,
    });

    const latency_ms = Date.now() - t0;

    return res.status(200).json({
      text: result.text || "",
      usage: result.usage || null,
      model: MODEL,
      latency_ms,
    });
  } catch (err) {
    // aici vei vedea mesajul real (inclusiv 401 invalid_api_key)
    return res.status(500).json({
      error: "AI failed",
      message: err?.message || String(err),
      // util când ai erori de provider:
      name: err?.name || null,
      cause: err?.cause || null,
    });
  }
}
