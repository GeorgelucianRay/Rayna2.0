// src/components/chat/routerIntent.js
// Rutare intent → răspuns corect în limba detectată + acțiuni/diolog

import { handleStatic, handleDialog } from "./actions"; // există deja la tine

/**
 * Alege textul potrivit dintr-un câmp response.text:
 *  - dacă e string: îl întoarce direct
 *  - dacă e obiect: încearcă lang, apoi es, ro, ca, apoi primul disponibil
 */
function pickLocalizedText(textField, lang = "es") {
  if (!textField) return "";
  if (typeof textField === "string") return textField;

  // obiect cu chei de limbă
  const byLang = textField || {};
  if (byLang[lang]) return byLang[lang];
  if (byLang.es)   return byLang.es;
  if (byLang.ro)   return byLang.ro;
  if (byLang.ca)   return byLang.ca;

  // fallback: primul value din obiect
  const any = Object.values(byLang)[0];
  return typeof any === "string" ? any : "";
}

/**
 * rutează un intent (venit din detectIntent sau semanticFallback)
 * @param {{
 *   det: { intent:any, slots?:any, lang?:string, origText?:string },
 *   intentsData:any[],
 *   role:string, profile:any,
 *   setMessages:Function, setAwaiting:Function, setSaving:Function,
 *   runAction:Function, // (intent, slots, userText) => Promise<void>
 *   lang?:string        // limba curentă detectată în RaynaHub
 * }} params
 */
export async function routeIntent(params = {}) {
  const {
    det,
    intentsData,
    role,
    profile,
    setMessages,
    setAwaiting,
    setSaving,
    runAction,
    lang = "es",
  } = params;

  const intent = det?.intent || null;
  const slots  = det?.slots  || {};
  const userText = det?.origText || "";

  if (!intent || !intent.type) {
    // fallback general din intentsData (dacă există)
    const fallback =
      intentsData?.find((i) => i.id === "fallback")?.response?.text || {
        es: "No te he entendido.",
        ro: "Nu te-am înțeles.",
        ca: "No t'he entès.",
      };

    const reply = pickLocalizedText(fallback, lang);
    setMessages((m) => [...m, { from: "bot", reply_text: reply }]);
    return;
  }

  // —— tipurile standard
  if (intent.type === "static") {
    // Dacă ai deja handleStatic și vrei să rămâi pe el:
    //   - îl chemăm, dar îi punem textul deja ales pe limbă în intent.__replyOverride
    //   - handleStatic poate prefera intent.response.text; dacă vrei să forțezi,
    //     poți citi __replyOverride în interiorul handlerului tău.
    const replyText = pickLocalizedText(intent?.response?.text, lang);
    if (replyText) {
      setMessages((m) => [...m, { from: "bot", reply_text: replyText }]);
    } else {
      // dacă n-ai text, lasă handlerul tău să decidă
      await handleStatic({ intent, setMessages });
    }
    return;
  }

  if (intent.type === "dialog") {
    // dialog-urile tale existente (ex: anuncio)
    // le apelăm așa cum obișnuiai în RaynaHub înainte
    const handled = await handleDialog.entry({
      intent,
      role,
      setMessages,
      setAwaiting,
      saving: false,
      setSaving,
      intentsData,
      profile,
      lang,
    });
    if (!handled) {
      // dacă dialogul nu l-a tratat, măcar dăm un mesaj neutru în limba corectă
      const txt = pickLocalizedText(
        intent?.response?.text || {
          es: "De acuerdo.",
          ro: "În regulă.",
          ca: "D'acord.",
        },
        lang
      );
      setMessages((m) => [...m, { from: "bot", reply_text: txt }]);
    }
    return;
  }

  if (intent.type === "action") {
    // acțiunile tale (veh_itv_truck, veh_oil_status etc.)
    // rulează handler-ele prin runAction, păstrând userText dacă ai nevoie
    await runAction(intent, slots, userText);
    return;
  }

  // —— fallback specific (tip necunoscut)
  const unknownText = pickLocalizedText(
    {
      es: "Tengo la intención, pero aún no tengo handler para esta acción.",
      ro: "Am înțeles intenția, dar încă nu am handler pentru această acțiune.",
      ca: "Tinc la intenció, però encara no tinc handler per a aquesta acció.",
    },
    lang
  );
  setMessages((m) => [...m, { from: "bot", reply_text: unknownText }]);
}