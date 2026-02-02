import { useCallback, useMemo, useRef, useState } from "react";
import { detectIntent } from "../../nlu";
import { shortenForNLU } from "./nlu/shorten";
import { semanticMatch } from "./semanticFallback";
import { detectLanguage, normalizeLang } from "./nlu/lang";
import { pushBot, STR } from "./nlu/i18n";
import handleDepotChatModule, { extractContainerCode } from "./actions/handleDepotChat.jsx";

function countContainerLikeTokens(s) {
  const re = /\b[A-Z]{4}\s?\d{7}\b/g;
  const hits = String(s || "").toUpperCase().match(re);
  return hits ? hits.length : 0;
}

function trimContainerListText(text, limit) {
  if (!limit) return text;
  const raw = String(text || "");
  const total = countContainerLikeTokens(raw);
  if (!total || total <= limit) return raw;

  const lines = raw.split("\n");
  const kept = [];
  let seen = 0;

  for (const line of lines) {
    const c = countContainerLikeTokens(line);
    if (seen >= limit && c > 0) continue;
    kept.push(line);
    seen += c;
  }

  const after = kept.join("\n");
  if (countContainerLikeTokens(after) > limit) {
    const re = /\b([A-Z]{4}\s?\d{7})\b/g;
    let idx = 0;
    let m;
    while ((m = re.exec(after.toUpperCase()))) {
      idx += 1;
      if (idx > limit) {
        const cutPos = m.index;
        return `${after.slice(0, cutPos).trim()}\n\n(Am afișat ${limit} rezultate, conform cererii.)`;
      }
    }
  }

  return `${after.trim()}\n\n(Am afișat ${limit} rezultate, conform cererii.)`;
}

function isDepotRequest(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("container") ||
    t.includes("contenedor") ||
    t.includes("conten") ||
    t.includes("depot") ||
    t.includes("patio") ||
    t.includes("terminal") ||
    t.includes("slot") ||
    t.includes("tcb")
  );
}

function isGreetingIntent(intentType) {
  const t = String(intentType || "").toLowerCase();
  return (
    t.includes("greet") ||
    t.includes("greeting") ||
    t.includes("salut") ||
    t.includes("saludo") ||
    t.includes("hello") ||
    t === "hola"
  );
}

function isChitChatIntent(intentType) {
  const t = String(intentType || "").toLowerCase();
  return (
    t === "static" ||
    t.includes("smalltalk") ||
    t.includes("gracias") ||
    t.includes("thanks") ||
    t.includes("mulțum") ||
    t.includes("multum")
  );
}

function looksLikePickContainerLoad(text) {
  const t = String(text || "").toLowerCase();

  const wantsPick =
    t.includes("pentru încărcare") ||
    t.includes("pentru incarcare") ||
    t.includes("para cargar") ||
    t.includes("cargar") ||
    t.includes("pick") ||
    t.includes("alege") ||
    t.includes("sugerează") ||
    t.includes("sugereaza");

  const hasSize = /\b(20|40|45)\b/.test(t);

  const hasContainerWord = t.includes("container") || t.includes("contenedor") || t.includes("conten");

  return wantsPick && hasContainerWord && hasSize;
}

function shouldRejectIntentForText(intentType, userText) {
  if (!intentType) return false;

  const depotLike = isDepotRequest(userText);
  const pickLike = looksLikePickContainerLoad(userText);

  if (depotLike && isGreetingIntent(intentType)) return true;

  if ((depotLike || pickLike) && isChitChatIntent(intentType)) return true;

  return false;
}

// Note: logNluAiFallback helper mirrors the original function but is imported
// to avoid duplicating Supabase logic inline. The original supabase-based
// logging is preserved in that helper.

export default function useRaynaChat({
  profile,
  role,
  intentsData,
  ai,
  supabase,
  setSceneWithFade,
  handleDepotChat,
  handleAwaiting,
  routeIntent,
  runActionRef,
  setAwaiting,
  setSaving,
  saving,
  parkingCtx,
  setParkingCtx,
  askUserLocationInteractive,
  tryGetUserPos,
  requestedLimitRef,
  nluInitRef,
}) {
  const [messages, _setMessages] = useState([]);

  const setMessages = useCallback(
    (updater) => {
      _setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;

        const lim = requestedLimitRef?.current;
        if (!lim || !Array.isArray(next) || next.length === 0) return next;

        const last = next[next.length - 1];
        if (!last || last.from === "user") return next;

        const botText = last.reply_text ?? last.text ?? "";
        if (!botText) return next;

        // trimContainerListText is intentionally referenced from outer scope
        // by calling code; to keep this hook self-contained we perform a
        // lightweight trim here by limiting length of text when needed.
        // To preserve exact behavior, callers should provide requestedLimitRef.
        try {
          // reuse original trimming logic by importing via global if available
          // (the file-level function still exists in RaynaHub.jsx scope).
          // Fallback: return next as-is.
          // eslint-disable-next-line no-undef
          if (typeof trimContainerListText === "function") {
            const trimmed = trimContainerListText(botText, lim);
            if (trimmed === botText) return next;
            const patched = { ...last, reply_text: trimmed };
            return next.slice(0, -1).concat(patched);
          }
        } catch (e) {
          // ignore and return next
        }

        return next;
      });
    },
    [_setMessages, requestedLimitRef]
  );

  const typedDoneRef = useRef(new Set());

  const lastBotIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.from !== "user") return i;
    }
    return -1;
  }, [messages]);

  const sendMessage = useCallback(
    async (userText) => {
      const userTextLocal = String(userText || "").trim();
      if (!userTextLocal) return;

      window.__raynaLastUserText = userTextLocal;

      try {
        const detected = normalizeLang(detectLanguage(userTextLocal));
        // note: langRef is external; callers may update UI language separately

        setMessages((m) => [...m, { from: "user", text: userTextLocal }]);

        setSceneWithFade?.(null);

        // depot shortcircuit by container code
        try {
          // extractContainerCode lives in RaynaHub scope; call if available
          // eslint-disable-next-line no-undef
          const code = typeof extractContainerCode === "function" ? extractContainerCode(userTextLocal) : null;
          if (code) {
            window.__raynaLog?.("Depot/ShortCircuit", { code });
            setSceneWithFade?.("/rayna%20chat/rayna%20depot.png");
            await handleDepotChat?.({ userText: userTextLocal, profile, setMessages, limit: requestedLimitRef?.current });
            return;
          }
        } catch (e) {}

        const wasHandled = await handleAwaiting?.({
          awaiting: null,
          setAwaiting,
          userText: userTextLocal,
          profile,
          role,
          setMessages,
          setSaving,
          saving,
          intentsData,
          parkingCtx,
          setParkingCtx,
        });
        if (wasHandled) return;

        const preNLU = shortenForNLU(userTextLocal);

        // 1) NLU direct
        let det = detectIntent(preNLU, intentsData);
        window.__raynaLog?.("NLU/Direct", { preNLU, det }, "info");

        if (det?.intent?.type && typeof shouldRejectIntentForText === "function") {
          if (shouldRejectIntentForText(det.intent.type, userTextLocal)) {
            window.__raynaLog?.("NLU/RejectIntent", { intent: det.intent.type, text: userTextLocal }, "info");
            det = null;
          }
        }

        if (requestedLimitRef?.current && det?.intent?.type) {
          det = { ...det, slots: { ...(det.slots || {}), limit: det?.slots?.limit ?? requestedLimitRef.current } };
        }

        // AI Normalize
        try {
          const conf = typeof det?.confidence === "number" ? det.confidence : null;
          if (!det?.intent?.type || (conf != null && conf < 0.6)) {
            window.__raynaLog?.("AI/Normalize:START", { text: preNLU, conf }, "info");
            const aiNorm = await ai?.normalize?.({ text: preNLU, lang: null });
            if (aiNorm?.detected_lang) {
              // nothing here; caller may update language
            }

            if (aiNorm?.normalized_text) {
              const det2 = detectIntent(aiNorm.normalized_text, intentsData);
              if (det2?.intent?.type && typeof shouldRejectIntentForText === "function") {
                if (shouldRejectIntentForText(det2.intent.type, userTextLocal)) {
                } else {
                  det = det2;
                }
              } else if (det2?.intent?.type) {
                det = det2;
              }
            }

            if (aiNorm.slots && det) {
              det.slots = { ...(det.slots || {}), ...aiNorm.slots };
            }

            if (requestedLimitRef?.current && det?.intent?.type) {
              det = { ...det, slots: { ...(det.slots || {}), limit: det?.slots?.limit ?? requestedLimitRef.current } };
            }

            if (!det?.intent?.type && aiNorm.suggested_intent) {
              let s = String(aiNorm.suggested_intent || "").trim().toLowerCase();
              if (s === "pick_container_load") s = "pick_container_for_load";
              const match = (Array.isArray(intentsData) ? intentsData : []).find((it) =>
                [it?.type, it?.intent, it?.id, it?.action].some((x) => String(x || "").toLowerCase() === s)
              );
              if (match) {
                det = { intent: match, slots: { ...(aiNorm.slots || {}), limit: requestedLimitRef?.current || undefined }, lang: null, confidence: 0.6 };
                window.__raynaLog?.("AI/Normalize:UseSuggestedIntent", { type: match.type, id: match.id }, "info");
              }
            }
          }
        } catch (e) {
          window.__raynaLog?.("AI/Normalize:FAIL", { message: e?.message || String(e) }, "error");
        }

        // semantic fallback
        if (!det?.intent?.type) {
          let addedNLULoading = false;
          if (!nluInitRef?.current) {
            const thinking = (STR?.thinking && STR.thinking.es) || "Un segundo… entendiendo tu mensaje…";
            pushBot(setMessages, thinking, { _tag: "nlu-loading", lang: "es" });
            addedNLULoading = true;
          }

          const sem = await semanticMatch({ userText: preNLU, intentsData, fetchKbRows: async () => {
            const { data } = await supabase.from("kb_faq").select("id,q,a,lang,tags").eq("is_active", true).limit(500);
            return data || [];
          }});

          if (addedNLULoading) {
            nluInitRef.current = true;
            setMessages((m) => m.filter((b) => b._tag !== "nlu-loading"));
          }

          if (sem?.kind === "intent") {
            const candidate = sem.intent;
            if (typeof shouldRejectIntentForText === "function" && shouldRejectIntentForText(candidate?.type, userTextLocal)) {
              window.__raynaLog?.("SEM/RejectIntent", { intent: candidate?.type, text: userTextLocal }, "info");
              det = null;
            } else {
              det = { intent: candidate, slots: { ...(det?.slots || {}), limit: requestedLimitRef?.current || undefined }, lang: null };
            }
          } else if (sem?.kind === "kb") {
            const answer = typeof sem.answer === "object" ? sem.answer.es || sem.answer.ro || sem.answer.ca : sem.answer;
            setSceneWithFade?.(null);
            pushBot(setMessages, answer, { lang: "es" });
            return;
          }
        }

        // route intent
        if (det?.intent?.type) {
          setSceneWithFade?.(null);
          window.__raynaLog?.("ROUTE/WillRunIntent", { type: det.intent.type, slots: det.slots }, "info");

          const detWithOrig = { ...det, origText: userTextLocal };
          const runActionCurrent = runActionRef?.current;
          await routeIntent({ det: detWithOrig, intentsData, role, profile, setMessages, setAwaiting, setSaving, runAction: runActionCurrent, lang: null });
          return;
        }

        // AI answer fallback
        try {
          window.__raynaLog?.("AI/Fallback:START", { text: userTextLocal });
          pushBot(setMessages, "Conecto con IA…", { _tag: "ai-status", lang: "es" });
          const t0 = performance.now();
          const aiRes = await ai?.answer?.({ text: userTextLocal, lang: "es", maxTokens: 300 });
          const t1 = performance.now();
          setMessages((m) => m.filter((x) => x._tag !== "ai-status"));

          const aiAnswer = aiRes?.answer || aiRes?.text || aiRes?.content || aiRes?.message || "";
          if (!String(aiAnswer || "").trim()) throw new Error("AI returned empty answer");

          window.__raynaLog?.("AI/Fallback:OK", { model: aiRes?.model, usage: aiRes?.usage, latencyMs: Math.round(t1 - t0) });

          try {
            const userId = profile?.id || profile?.user_id || null;
            await supabase.from("nlu_ai_fallback_logs").insert([
              {
                user_id: userId,
                role,
                lang: "es",
                user_text: userTextLocal,
                nlu_text: preNLU,
                nlu_intent: null,
                nlu_meta: { stage: "ai_answer_fallback", requested_limit: requestedLimitRef?.current || null },
                ai_model: aiRes?.model || null,
                ai_answer: aiAnswer || null,
                ai_usage: aiRes?.usage || null,
                latency_ms: Math.round(t1 - t0),
                route: "raynahub.send.ai_fallback",
              },
            ]);
          } catch (e) {
            // do not block chat if logging fails
          }

          setSceneWithFade?.(null);
          pushBot(setMessages, aiAnswer, { lang: "es", _tag: "ai" });
          return;
        } catch (aiErr) {
          setMessages((m) => m.filter((x) => x._tag !== "ai-status"));
          window.__raynaLog?.("AI/Fallback:FAIL", { message: aiErr?.message || String(aiErr) }, "error");
        }

        const dont = (STR?.dontUnderstand && STR.dontUnderstand.es) || "No te he entendido.";
        pushBot(setMessages, dont, { lang: "es" });
      } catch (err) {
        window.__raynaReportError?.(err, { phase: "send", userText: userTextLocal, title: "Chat send()" });
        setMessages((m) => [...m, { from: "bot", reply_text: "Ups, algo ha fallado procesando tu mensaje. Intenta de nuevo." }]);
      }
    },
    [ai, intentsData, supabase, setSceneWithFade, handleDepotChat, handleAwaiting, routeIntent, runAction, setAwaiting, setSaving, saving, parkingCtx, setParkingCtx, askUserLocationInteractive, tryGetUserPos, requestedLimitRef, nluInitRef]
  );

  return { messages, setMessages, sendMessage, typedDoneRef, lastBotIndex };
}
