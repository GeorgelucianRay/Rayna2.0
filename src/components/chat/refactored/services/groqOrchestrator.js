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
      } catch {}
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (e) {
      try {
        window.__raynaLog?.("GROQ:BAD_JSON", { raw }, "error");
      } catch {}
      return null;
    }
  } catch (e) {
    try {
      window.__raynaLog?.("GROQ:ERROR", { message: e?.message || String(e) }, "error");
    } catch {}
    return null;
  }
}

export async function groqExtract({ text, lang }) {
  const body = { mode: "normalize", text, lang };
  const json = await postToGroq(body);
  if (!json) return { intent: null, slots: null, detected_lang: null };

  return {
    intent: json?.suggested_intent || json?.suggestedIntent || json?.intent || null,
    slots: json?.slots || json?.Slots || null,
    detected_lang: json?.detected_lang || json?.lang || null,
    raw: json,
  };
}

export async function groqAnswer({ text, lang, context }) {
  const body = { mode: "answer", text, lang, context };
  const json = await postToGroq(body);
  if (!json) return { answerText: null, raw: null };

  return { answerText: json?.answer || json?.text || json?.message || null, raw: json };
}

export default { groqExtract, groqAnswer };
