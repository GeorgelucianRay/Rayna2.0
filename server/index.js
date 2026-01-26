import "dotenv/config";
import express from "express";


const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/rayna-chat", async (req, res) => {
  const { text, lang = "es", mode = "short", maxTokens = 300 } = req.body || {};
  const userText = String(text || "").trim();
  if (!userText) return res.status(400).json({ error: "Missing text" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

  const model = "gemini-1.5-flash";

  const systemText =
    lang === "ro"
      ? "Ești Rayna, asistent logistic. Răspunde scurt, clar, practic. Nu inventa."
      : lang === "ca"
        ? "Ets Rayna, assistent logístic. Respon curt, clar i pràctic. No inventis."
        : "Eres Rayna, asistente logística. Responde corto, claro y práctico. No inventes.";

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
      encodeURIComponent(apiKey);

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemText}\n\nUsuario: ${userText}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.max(32, Math.min(Number(maxTokens) || 300, 800)),
          temperature: 0.4,
        },
      }),
    });

    const raw = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "Gemini HTTP error", status: r.status, raw });

    const data = JSON.parse(raw);
    const answer =
      data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";

    return res.json({ answer: answer.trim(), model, usage: data?.usageMetadata || null });
  } catch (e) {
    return res.status(500).json({ error: "Gemini failed", message: e?.message || String(e) });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Rayna API running on http://localhost:${PORT}`);
});
