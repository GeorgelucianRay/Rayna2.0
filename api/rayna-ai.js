import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { text, lang } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 160,
      messages: [
        {
          role: "system",
          content:
            "Ești Rayna, asistent logistic. Răspunde foarte scurt (maxim 3 propoziții), clar și practic.",
        },
        {
          role: "user",
          content: text,
        },
      ],
    });

    res.status(200).json({
      text: completion.choices[0].message.content,
      usage: completion.usage,
      model: completion.model,
    });
  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({ error: "AI fallback failed" });
  }
}
