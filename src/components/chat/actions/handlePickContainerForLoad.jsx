import { supabase } from "../../../supabaseClient";
import styles from "../Chatbot.module.css";
// reutilizăm parser-ele din Depot List
import { parseSizeFromAnswer, parseNavieraFromAnswer } from "./handleDepotList.jsx";

/* ---------- Debug helper (ErrorTray) ---------- */
function logUI(title, data, level = "info") {
  try { if (window.__raynaLog) window.__raynaLog(title, data, level); } catch {}
}

/* ---------- Context local pentru fluxul "pick for load" ---------- */
const CTX_KEY = "pick_load_ctx";
const getCtx   = () => JSON.parse(sessionStorage.getItem(CTX_KEY) || "{}");
const saveCtx  = (p) => {
  const next = { ...(getCtx() || {}), ...(p || {}) };
  sessionStorage.setItem(CTX_KEY, JSON.stringify(next));
  return next;
};
const clearCtx = () => sessionStorage.removeItem(CTX_KEY);

/* ================================================================
 * 1) START — pornește dialogul și cere filtrele
 * ================================================================ */
export async function startPickContainerForLoad({ userText, setMessages, setAwaiting }) {
  logUI("PickLoad/START", { userText });
  // resetăm context vechi
  clearCtx();
  saveCtx({ step: "filters" });

  setMessages(m => [
    ...m,
    { from: "bot",
      reply_text:
        "¿Qué tamaño necesitas? (20/40/40HC)\nPuedes decir también la naviera si ya la sabes." }
  ]);
  setAwaiting("pick_load_filters");
  logUI("PickLoad/AWAITING", { awaiting: "pick_load_filters" });
}

/* ================================================================
 * 2) AWAITING — citim răspunsul cu mărime/naviera, alegem container
 * ================================================================ */
export async function handleAwaitingPickForLoad({ awaiting, userText, setMessages, setAwaiting }) {
  if (awaiting !== "pick_load_filters") return false;

  const size = parseSizeFromAnswer(userText);          // "20" | "40" | "40hc" | null | false
  const nav  = parseNavieraFromAnswer(userText);       // "MAERSK" | "MSC" | ... | null | undefined
  logUI("PickLoad/INPUT", { userText, size, nav });

  // Dacă nu am înțeles nimic, mai cerem o dată
  if (size === false && nav === undefined) {
    setMessages(m => [
      ...m,
      { from: "bot",
        reply_text: "No te he entendido. Dime un tamaño (20/40/40HC) y opcionalmente la naviera." }
    ]);
    return true;
  }

  // Persistăm ce am înțeles
  const prev = getCtx();
  const filters = {
    size: (size === false ? prev.size ?? null : size ?? null),
    naviera: (nav === undefined ? prev.naviera ?? null : nav ?? null),
  };
  saveCtx({ ...prev, filters });

  // Trecem la selecție
  try {
    const suggestion = await pickBestContainer(filters);
    setAwaiting(null);

    if (!suggestion) {
      setMessages(m => [
        ...m,
        { from: "bot",
          reply_text: "No he encontrado un contenedor libre arriba con esos filtros. ¿Probamos con otra naviera o tamaño?" }
      ]);
      return true;
    }

    const { row } = suggestion;
    const pos = row.posicion ?? "—";
    const tipo = row.tipo ?? "—";
    const navieraLabel = row.naviera ?? "—";
    const code = row.matricula_contenedor ?? "—";

    setMessages(m => [
      ...m,
      {
        from: "bot",
        reply_text: "¡Claro! Aquí tengo tu contenedor perfecto 👇",
        render: () => (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Contenedor sugerido</div>
            <div style={{fontSize:14,lineHeight:1.5,marginTop:6}}>
              <div><strong>Código:</strong> {code}</div>
              <div><strong>Posición:</strong> {pos}</div>
              <div><strong>Tipo:</strong> {tipo}</div>
              <div><strong>Naviera:</strong> {navieraLabel}</div>
              <div><strong>Estado:</strong> {row.estado || "—"}</div>
            </div>
            <div className={styles.cardActions} style={{marginTop:10}}>
              <a
                className={styles.actionBtn}
                href={`/map3d?focus=${encodeURIComponent(pos)}`}
              >
                Ver mapa 3D
              </a>
            </div>
          </div>
        )
      }
    ]);

    // Varianta a doua (dacă utilizatorul întreabă "¿por qué es perfecto?")
    saveCtx({ lastSuggestion: suggestion, step: "suggested" });
    logUI("PickLoad/SUGGESTED", { pos, code });

  } catch (e) {
    logUI("PickLoad/ERROR", { error: e }, "error");
    setMessages(m => [
      ...m,
      { from: "bot", reply_text: "No he podido buscar ahora mismo. Intenta de nuevo." }
    ]);
  }

  return true;
}

/* ================================================================
 * 3) Algoritm simplu: alege un contenedor fără nimic deasupra
 *    și cât mai “de sus” (litera poziției cea mai mare).
 *    Poți îmbunătăți ulterior logica.
 * ================================================================ */
async function pickBestContainer({ size, naviera }) {
  // 1) luăm lista candidaților conform filtrelor
  let q = supabase
    .from("contenedores")
    .select("id,matricula_contenedor,naviera,tipo,posicion,estado,created_at");

  // doar vacíos pentru încărcare
  q = q.eq("estado", "vacio");

  if (size === "40hc") q = q.ilike("tipo", "%40HC%");
  else if (size === "40") q = q.ilike("tipo", "40%").not.ilike("tipo", "%40HC%");
  else if (size === "20") q = q.ilike("tipo", "20%");

  if (naviera) q = q.ilike("naviera", `%${naviera}%`);

  const { data: candidates, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;

  // 2) pentru a decide dacă e liber "deasupra", citim toate pozițiile active
  const { data: all, error: e2 } = await supabase
    .from("contenedores")
    .select("posicion,matricula_contenedor,estado");
  if (e2) throw e2;

  const occupied = new Set((all || []).map(r => String(r.posicion || "").trim().toUpperCase()));

  // helper pentru poziție: "A2C" -> {row:'A', col:'2', level:'C'}
  const parsePos = (p) => {
    const m = String(p || "").trim().toUpperCase().match(/^([A-F])(\d{1,2})([A-Z])$/);
    return m ? { row: m[1], col: m[2], level: m[3] } : null;
  };
  const abovePos = (p) => {
    const s = parsePos(p);
    if (!s) return null;
    // litera următoare din alfabet
    const next = String.fromCharCode(s.level.charCodeAt(0) + 1);
    return `${s.row}${s.col}${next}`;
  };

  // 3) filtrăm candidații “fără nimic deasupra”
  const freeTop = (candidates || []).filter(r => {
    const pos = String(r.posicion || "").toUpperCase();
    const ap = abovePos(pos);
    return !ap || !occupied.has(ap); // nu există nimic peste
  });

  if (!freeTop.length) return null;

  // 4) sortăm pentru a reduce mutările: preferăm nivelul cel mai înalt (cea mai mare literă)
  const levelRank = (p) => {
    const s = parsePos(p);
    return s ? s.level.charCodeAt(0) : 0;
    // cu cât mai mare litera, cu atât “mai sus” pe stivă (mai puține blocaje peste)
  };

  freeTop.sort((a, b) => levelRank(b.posicion) - levelRank(a.posicion));

  return { row: freeTop[0] };
}