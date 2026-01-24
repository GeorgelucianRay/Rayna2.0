// api/rayna-chat.js
import { generateText } from "ai";
import { groq } from "@ai-sdk/groq";

export const config = { runtime: "nodejs" };

const MODEL = "llama-3.1-8b-instant";

// răspuns scurt + tokens puțini
function systemPrompt(lang = "es") {
  if (lang === "ro") {
    return [
      "Ești Rayna, asistent logistic.",
      "Răspunde foarte scurt și la obiect.",
      "Maxim 2-4 propoziții. Fără introduceri lungi.",
      "Dacă lipsesc date, pune 1 singură întrebare clară.",
    ].join(" ");
  }
  if (lang === "ca") {
    return [
      "Ets Rayna, assistent de logística.",
      "Respon molt curt i directe.",
      "Màxim 2-4 frases. Sense introduccions llargues.",
      "Si falten dades, fes 1 sola pregunta clara.",
    ].join(" ");
  }
  return [
    "Eres Rayna, asistente de logística.",
    "Responde muy corto y directo.",
    "Máximo 2-4 frases. Sin introducciones largas.",
    "Si faltan datos, haz 1 sola pregunta clara.",
  ].join(" ");
}

function clampUserText(s, maxChars = 700) {
  const t = String(s || "").trim();
  if (t.length <= maxChars) return t;
  // păstrăm capătul (de obicei acolo e cerința reală)
  return t.slice(-maxChars);
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { text, lang } = req.body || {};
    const userText = clampUserText(text);

    if (!userText) return res.status(400).json({ error: "Missing text" });

    const t0 = Date.now();

    const result = await generateText({
      model: groq(MODEL),
      system: systemPrompt(lang || "es"),
      prompt: userText,

      // economisire tokens
      maxTokens: 180,     // mic = ieftin; ridici la 240 dacă vrei
      temperature: 0.2,
      topP: 0.9,
    });

    const latency_ms = Date.now() - t0;

    res.status(200).json({
      text: result.text || "",
      usage: result.usage || null,
      model: MODEL,
      latency_ms,
    });
  } catch (err) {
    res.status(500).json({ error: "AI failed", message: err?.message || String(err) });
  }
}
