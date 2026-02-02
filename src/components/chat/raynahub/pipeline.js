// src/components/chat/raynahub/pipeline.js
// Core message processing pipeline extracted from RaynaHub.jsx

import React from "react";
import { detectIntent } from "../../../nlu";
import { shortenForNLU } from "../nlu/shorten";
import { semanticMatch } from "../semanticFallback";
import { detectLanguage, normalizeLang } from "../nlu/lang";
import { pushBot, STR } from "../nlu/i18n";
import { extractContainerCode } from "../actions/handleDepotChat.jsx";
import { groqExtract, groqAnswer } from "../refactored/services/groqOrchestrator";
import { pickContainerForLoad } from "../refactored/services/pickContainerForLoad";
import ContainerCard from "../ui/ContainerCard";
import {
    pickScene,
    SCENE_BY_INTENT,
    isDepotRequest,
    looksLikePickContainerLoad,
    shouldRejectIntentForText,
    isChitChatIntent,
} from "./helpers";


// Fallback i18n strings
const FBTHINK = (lang) =>
    lang === "ro"
        ? "O secundă… înțeleg ce ai scris…"
        : lang === "ca"
            ? "Un segon… estic entenent el teu missatge…"
            : "Un segundo… entendiendo tu mensaje…";

const FBDONT = (lang) =>
    lang === "ro" ? "Nu te-am înțeles." : lang === "ca" ? "No t'he entès." : "No te he entendido.";

/* ─────────────────────────────────────────────────────────────
   LOG NLU AI FALLBACK (preserved from original)
   ───────────────────────────────────────────────────────────── */
async function logNluAiFallback({
    supabase,
    profile,
    role,
    lang,
    userText,
    nluText,
    nluIntent,
    nluMeta,
    aiModel,
    aiAnswer,
    aiUsage,
    latencyMs,
    route,
}) {
    try {
        const userId = profile?.id || profile?.user_id || null;

        await supabase.from("nlu_ai_fallback_logs").insert([
            {
                user_id: userId,
                role,
                lang,
                user_text: userText,
                nlu_text: nluText || null,
                nlu_intent: nluIntent || null,
                nlu_meta: nluMeta || null,
                ai_model: aiModel || null,
                ai_answer: aiAnswer || null,
                ai_usage: aiUsage || null,
                latency_ms: latencyMs ?? null,
                route: route || "raynahub.send.ai_fallback",
            },
        ]);
    } catch {
        // nu blocăm chat-ul dacă logging-ul pică
    }
}

/* ─────────────────────────────────────────────────────────────
   MAIN PIPELINE: processUserMessage
   ───────────────────────────────────────────────────────────── */

export async function processUserMessage({
    userText,
    profile,
    role,
    supabase,
    ai,
    intentsData,
    langRef,
    requestedLimitRef,
    awaiting,
    setAwaiting,
    saving,
    setSaving,
    parkingCtx,
    setParkingCtx,
    setMessages,
    setSceneWithFade,
    handleDepotChat,
    handleAwaiting,
    routeIntent,
    runAction,
    nluInitRef,
}) {
    const userTextLocal = userText.trim();
    if (!userTextLocal) return;

    window.__raynaLastUserText = userTextLocal;

    try {
        // ─────────────────────────────────────────────
        // 1) DETECT LANGUAGE
        // ─────────────────────────────────────────────
        const detected = normalizeLang(detectLanguage(userTextLocal));
        langRef.current = detected || langRef.current || "es";

        // ─────────────────────────────────────────────
        // 2) PUSH USER MESSAGE
        // ─────────────────────────────────────────────
        setMessages((m) => [...m, { from: "user", text: userTextLocal }]);

        // ─────────────────────────────────────────────
        // 3) SCENE SELECTION
        // ─────────────────────────────────────────────
        setSceneWithFade(pickScene({ intentType: null, userText: userTextLocal }));

        // ─────────────────────────────────────────────
        // 4) DEPOT SHORTCIRCUIT (container code)
        // ─────────────────────────────────────────────
        const code = extractContainerCode(userTextLocal);
        if (code) {
            window.__raynaLog("Depot/ShortCircuit", { code });
            setSceneWithFade(SCENE_BY_INTENT.depot);
            await handleDepotChat({
                userText: userTextLocal,
                profile,
                setMessages,
                limit: requestedLimitRef.current,
            });
            return;
        }

        // ─────────────────────────────────────────────
        // 5) AWAITING HANDLERS
        // ─────────────────────────────────────────────
        const wasHandled = await handleAwaiting({
            awaiting,
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
        const wantsDepot = isDepotRequest(userTextLocal);
        const wantsPickLoad = looksLikePickContainerLoad(userTextLocal);

        // ─────────────────────────────────────────────
        // 6) GROQ EXTRACT (pick_container_for_load)
        // ─────────────────────────────────────────────
        try {
            const groq = await groqExtract({ text: userTextLocal, lang: langRef.current });
            const intentTypeG = String(groq?.intent || "").toLowerCase();

            window.__raynaLog("GROQ/Extract", { intent: groq.intent, confidence: groq.confidence, slots: groq.slots, missing: groq.missing }, "info");

            // Only proceed if intent is pick_container_for_load AND confidence >= 0.6
            if ((intentTypeG === "pick_container_for_load" || intentTypeG === "pick_container_load") && groq.confidence >= 0.6) {
                const slots = groq.slots || {};
                const size = slots.size || null;
                const naviera = slots.naviera || null;

                // Only proceed if we have both size and naviera
                if (size && naviera) {
                    window.__raynaLog("GROQ/PickFlow:START", { size, naviera }, "info");

                    const result = await pickContainerForLoad({ supabase, naviera, size });

                    if (result) {
                        const { container, blockers, blockersCount } = result;
                        const position = container.posicion || container.position || null;
                        const containerCode = container.matricula_contenedor || container.matricula || null;

                        window.__raynaLog("GROQ/PickFlow:Selected", { containerCode, position, blockersCount }, "info");

                        // Build context for groqAnswer
                        const context = {
                            container_code: containerCode,
                            position,
                            size,
                            naviera,
                            blockers_count: blockersCount,
                            blockers: blockers.map(b => `${b.code} (${b.position})`).join(", "),
                        };

                        // Format response with Groq
                        const ans = await groqAnswer({ text: userTextLocal, lang: langRef.current, context });
                        const answerText =
                            ans?.answerText ||
                            `He encontrado el contenedor ${containerCode} en posición ${position}. ${blockersCount === 0 ? "No tiene bloqueadores." : `Tiene ${blockersCount} bloqueador(es).`}`;

                        // Push bot message with card and actions
                        pushBot(setMessages, answerText, {
                            lang: langRef.current,
                            render: () => React.createElement(ContainerCard, {
                                container,
                                position,
                                blockers,
                                blockersCount,
                                size,
                                naviera,
                            }),
                            actions: [
                                {
                                    type: "programar",
                                    label: "Programar",
                                    icon: "schedule",
                                    payload: {
                                        containerCode,
                                        position,
                                        size,
                                        naviera,
                                        blockers,
                                        blockersCount,
                                    },
                                },
                                {
                                    type: "asignar",
                                    label: "Asignar",
                                    icon: "check_circle",
                                    payload: {
                                        containerCode,
                                        position,
                                        size,
                                        naviera,
                                    },
                                },
                                {
                                    type: "view_position",
                                    label: "Ver",
                                    icon: "visibility",
                                    payload: {
                                        position,
                                        containerCode,
                                    },
                                },
                            ],
                        });

                        setSceneWithFade(pickScene({ intentType: "depot", userText: userTextLocal }));
                        return; // ✅ SHORTCIRCUIT: pick flow handled, exit pipeline
                    } else {
                        // No container found
                        window.__raynaLog("GROQ/PickFlow:NoContainer", { size, naviera }, "info");
                        pushBot(setMessages, `No he encontrado contenedores disponibles de ${size}' para ${naviera}.`, {
                            lang: langRef.current,
                        });
                        return;
                    }
                } else {
                    // Missing size or naviera - log and continue to normal pipeline
                    window.__raynaLog("GROQ/PickFlow:MissingData", { size, naviera, missing: groq.missing }, "info");
                }
            }
        } catch (e) {
            window.__raynaLog?.("GROQ/FAIL", { message: e?.message || String(e) }, "error");
        }

        // ─────────────────────────────────────────────
        // 7) NLU DIRECT
        // ─────────────────────────────────────────────
        let det = detectIntent(preNLU, intentsData);
        window.__raynaLog("NLU/Direct", { preNLU, det }, "info");

        // ─────────────────────────────────────────────
        // 8) REJECT WRONG INTENT (greeting for depot)
        // ─────────────────────────────────────────────
        if (det?.intent?.type && shouldRejectIntentForText(det.intent.type, userTextLocal)) {
            window.__raynaLog("NLU/RejectIntent", { intent: det.intent.type, text: userTextLocal }, "info");
            det = null;
        }

        // ─────────────────────────────────────────────
        // 9) INJECT LIMIT IN SLOTS
        // ─────────────────────────────────────────────
        if (requestedLimitRef.current && det?.intent?.type) {
            det = { ...det, slots: { ...(det.slots || {}), limit: det?.slots?.limit ?? requestedLimitRef.current } };
        }

        // ✅ dacă NLU a dat chit-chat (static) pe mesaj logistic, îl anulăm ca să intre AI Normalize
        if (det?.intent?.type && isChitChatIntent(det.intent.type) && (wantsDepot || wantsPickLoad)) {
            window.__raynaLog("NLU/ForceNormalizeFromChitChat", { intent: det.intent.type, text: userTextLocal }, "info");
            det = null;
        }

        // ─────────────────────────────────────────────
        // 10) AI NORMALIZE (low confidence / no intent)
        // ─────────────────────────────────────────────
        try {
            const conf =
                typeof det?.confidence === "number"
                    ? det.confidence
                    : typeof det?.score === "number"
                        ? det.score
                        : typeof det?.prob === "number"
                            ? det.prob
                            : null;

            if (!det?.intent?.type || (conf != null && conf < 0.6)) {
                window.__raynaLog("AI/Normalize:START", { lang: langRef.current, text: preNLU, conf }, "info");

                const aiNorm = await ai.normalize({
                    text: preNLU,
                    lang: langRef.current,
                });

                // dacă AI detectează altă limbă, o respectăm (opțional, dar util)
                if (aiNorm?.detected_lang) {
                    const dl = normalizeLang(aiNorm.detected_lang);
                    if (dl) langRef.current = dl;
                }

                window.__raynaLog("AI/Normalize:OK", {
                    normalized_text: aiNorm.normalized_text,
                    suggested_intent: aiNorm.suggested_intent,
                    slots: aiNorm.slots,
                    detected_lang: aiNorm.detected_lang,
                });

                // NLU încercare 2 cu text normalizat
                if (aiNorm.normalized_text) {
                    const det2 = detectIntent(aiNorm.normalized_text, intentsData);

                    if (det2?.intent?.type && shouldRejectIntentForText(det2.intent.type, userTextLocal)) {
                        window.__raynaLog("NLU2/RejectIntent", { intent: det2.intent.type, text: userTextLocal }, "info");
                        // keep previous det (or null)
                    } else if (det2?.intent?.type) {
                        det = det2;
                    }
                }

                // Adaugă slots extrase de AI (dacă avem det)
                if (aiNorm.slots && det) {
                    det.slots = { ...(det.slots || {}), ...aiNorm.slots };
                }

                // inject limit și aici (dacă user a cerut)
                if (requestedLimitRef.current && det?.intent?.type) {
                    det = { ...det, slots: { ...(det.slots || {}), limit: det?.slots?.limit ?? requestedLimitRef.current } };
                }

                // Dacă tot nu prindem intent, dar AI a sugerat un intent valid → îl folosim
                if (!det?.intent?.type && aiNorm.suggested_intent) {
                    let s = String(aiNorm.suggested_intent || "").trim().toLowerCase();
                    if (s === "pick_container_load") s = "pick_container_for_load";
                    const match = (Array.isArray(intentsData) ? intentsData : []).find((it) =>
                        [it?.type, it?.intent, it?.id, it?.action].some((x) => String(x || "").toLowerCase() === s)
                    );
                    if (match && (match.type || match.id || match.action)) {
                        det = {
                            intent: match,
                            slots: { ...(aiNorm.slots || {}), limit: requestedLimitRef.current || undefined },
                            lang: langRef.current,
                            confidence: 0.6,
                        };
                        window.__raynaLog("AI/Normalize:UseSuggestedIntent", { type: match.type, id: match.id }, "info");
                    }
                }
            }
        } catch (e) {
            window.__raynaLog("AI/Normalize:FAIL", { message: e?.message || String(e) }, "error");
            window.__raynaLog("NLU/AfterNormalize", { det }, "info");
            // nu blocăm fluxul
        }

        // ─────────────────────────────────────────────
        // 11) SEMANTIC FALLBACK (dacă tot nu avem intent)
        // ─────────────────────────────────────────────
        if (!det?.intent?.type) {
            let addedNLULoading = false;

            if (!nluInitRef.current) {
                const thinking = (STR?.thinking && STR.thinking[langRef.current]) || FBTHINK(langRef.current);
                pushBot(setMessages, thinking, { _tag: "nlu-loading", lang: langRef.current });
                addedNLULoading = true;
            }

            const sem = await semanticMatch({
                userText: preNLU,
                intentsData,
                fetchKbRows: async () => {
                    const { data } = await supabase
                        .from("kb_faq")
                        .select("id,q,a,lang,tags")
                        .eq("is_active", true)
                        .limit(500);
                    return data || [];
                },
            });

            if (addedNLULoading) {
                nluInitRef.current = true;
                setMessages((m) => m.filter((b) => b._tag !== "nlu-loading"));
            }

            if (sem?.kind === "intent") {
                const candidate = sem.intent;
                if (shouldRejectIntentForText(candidate?.type, userTextLocal)) {
                    window.__raynaLog("SEM/RejectIntent", { intent: candidate?.type, text: userTextLocal }, "info");
                    det = null;
                } else {
                    det = {
                        intent: candidate,
                        slots: { ...(det?.slots || {}), limit: requestedLimitRef.current || undefined },
                        lang: langRef.current,
                    };
                }
            } else if (sem?.kind === "kb") {
                const answer =
                    typeof sem.answer === "object"
                        ? sem.answer[langRef.current] || sem.answer.es || sem.answer.ro || sem.answer.ca
                        : sem.answer;

                setSceneWithFade(pickScene({ intentType: "kb", userText: userTextLocal }));
                pushBot(setMessages, answer, { lang: langRef.current });
                return;
            }
        }

        // ─────────────────────────────────────────────
        // 12) FORCE AI FOR DEPOT (CRITICAL RULE)
        // ─────────────────────────────────────────────
        const intentType = det?.intent?.type || "";
        const looksNonDepotIntent =
            !!intentType &&
            !String(intentType).toLowerCase().includes("depot") &&
            !String(intentType).toLowerCase().includes("container") &&
            !String(intentType).toLowerCase().includes("conten");

        // ✅ IMPORTANT: dacă e cerere de "pick container pentru încărcare", NU forțăm AI ca depot
        if (!wantsPickLoad) {
            if (wantsDepot && (!det?.intent?.type || looksNonDepotIntent)) {
                window.__raynaLog("Route/ForceAIForDepot", { intent: intentType || null, text: userTextLocal }, "info");
                det = null;
            }
        }

        // ─────────────────────────────────────────────
        // 13) ROUTE INTENT
        // ─────────────────────────────────────────────
        if (det?.intent?.type) {
            setSceneWithFade(pickScene({ intentType: det.intent.type, userText: userTextLocal }));
            window.__raynaLog("ROUTE/WillRunIntent", { type: det.intent.type, slots: det.slots }, "info");

            const detWithOrig = { ...det, origText: userTextLocal };
            await routeIntent({
                det: detWithOrig,
                intentsData,
                role,
                profile,
                setMessages,
                setAwaiting,
                setSaving,
                runAction,
                lang: langRef.current,
            });

            return;
        }

        // ─────────────────────────────────────────────
        // 14) AI ANSWER FALLBACK (ultima plasă)
        // ─────────────────────────────────────────────
        try {
            window.__raynaLog("AI/Fallback:START", { lang: langRef.current, text: userTextLocal });

            pushBot(setMessages, "Conecto con IA…", { lang: langRef.current, _tag: "ai-status" });

            const t0 = performance.now();
            const aiRes = await ai.answer({
                text: userTextLocal,
                lang: langRef.current,
                maxTokens: 300,
            });
            const t1 = performance.now();

            setMessages((m) => m.filter((x) => x._tag !== "ai-status"));

            const aiAnswer = aiRes?.answer || aiRes?.text || aiRes?.content || aiRes?.message || "";
            if (!String(aiAnswer || "").trim()) throw new Error("AI returned empty answer");

            window.__raynaLog("AI/Fallback:OK", {
                model: aiRes?.model,
                usage: aiRes?.usage,
                latencyMs: Math.round(t1 - t0),
            });

            await logNluAiFallback({
                supabase,
                profile,
                role,
                lang: langRef.current,
                userText: userTextLocal,
                nluText: preNLU,
                nluIntent: null,
                nluMeta: {
                    stage: "ai_answer_fallback",
                    requested_limit: requestedLimitRef.current || null,
                },
                aiModel: aiRes?.model || null,
                aiAnswer,
                aiUsage: aiRes?.usage || null,
                latencyMs: Math.round(t1 - t0),
                route: "raynahub.send.ai_fallback",
            });

            setSceneWithFade(pickScene({ intentType: "ai", userText: userTextLocal }));
            pushBot(setMessages, aiAnswer, { lang: langRef.current, _tag: "ai" });
            return;
        } catch (aiErr) {
            setMessages((m) => m.filter((x) => x._tag !== "ai-status"));
            window.__raynaLog("AI/Fallback:FAIL", { message: aiErr?.message || String(aiErr) }, "error");
        }

        // ─────────────────────────────────────────────
        // 15) FINAL FALLBACK (dontUnderstand)
        // ─────────────────────────────────────────────
        const dont = (STR?.dontUnderstand && STR.dontUnderstand[langRef.current]) || FBDONT(langRef.current);
        pushBot(setMessages, dont, { lang: langRef.current });
    } catch (err) {
        window.__raynaReportError?.(err, { phase: "send", userText: userTextLocal, title: "Chat send()" });
        setMessages((m) => [
            ...m,
            {
                from: "bot",
                reply_text: "Ups, algo ha fallado procesando tu mensaje. Intenta de nuevo.",
            },
        ]);
    }
}
