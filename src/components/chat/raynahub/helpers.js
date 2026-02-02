// src/components/chat/raynahub/helpers.js
// Pure helper functions extracted from RaynaHub.jsx

/* ─────────────────────────────────────────────────────────────
   SCENE SELECTION
   ───────────────────────────────────────────────────────────── */

export const SCENE_BY_INTENT = {
    default: "/rayna%20chat/rayna%20office.png",
    archivo: "/rayna%20chat/rayna%20archivo.png",
    depot: "/rayna%20chat/rayna%20depot.png",
    mecanic: "/rayna%20chat/rayna%20mecanic.png",
    office: "/rayna%20chat/rayna%20office.png",
    soferi: "/rayna%20chat/rayna%20soferi.png",
};

export function pickScene({ intentType, userText }) {
    const t = String(intentType || "").toLowerCase();
    const u = String(userText || "").toLowerCase();

    if (
        u.includes("depot") ||
        u.includes("conten") ||
        u.includes("container") ||
        u.includes("contenedor") ||
        u.includes("slot") ||
        u.includes("patio") ||
        u.includes("terminal") ||
        u.includes("tcb")
    )
        return SCENE_BY_INTENT.depot;

    if (
        u.includes("archivo") ||
        u.includes("document") ||
        u.includes("acta") ||
        u.includes("contrato") ||
        u.includes("factura") ||
        u.includes("pdf") ||
        u.includes("nomina") ||
        u.includes("nómina") ||
        u.includes("albaran")
    )
        return SCENE_BY_INTENT.archivo;

    if (
        u.includes("mecanic") ||
        u.includes("mecánico") ||
        u.includes("taller") ||
        u.includes("repar") ||
        u.includes("averia") ||
        u.includes("avería") ||
        u.includes("service") ||
        u.includes("itv")
    )
        return SCENE_BY_INTENT.mecanic;

    if (
        u.includes("sofer") ||
        u.includes("șofer") ||
        u.includes("chofer") ||
        u.includes("conduc") ||
        u.includes("tahograf") ||
        u.includes("tacografo") ||
        u.includes("descanso") ||
        u.includes("conducción")
    )
        return SCENE_BY_INTENT.soferi;

    if (
        u.includes("dispecer") ||
        u.includes("dispatch") ||
        u.includes("oficina") ||
        u.includes("ruta") ||
        u.includes("plan") ||
        u.includes("program") ||
        u.includes("cliente") ||
        u.includes("email")
    )
        return SCENE_BY_INTENT.office;

    if (t.includes("depot")) return SCENE_BY_INTENT.depot;
    if (t.includes("mec") || t.includes("taller")) return SCENE_BY_INTENT.mecanic;
    if (t.includes("doc") || t.includes("pdf") || t.includes("nomina")) return SCENE_BY_INTENT.archivo;
    if (t.includes("driver") || t.includes("sofer") || t.includes("chofer")) return SCENE_BY_INTENT.soferi;
    if (t.includes("admin") || t.includes("office") || t.includes("dispatch")) return SCENE_BY_INTENT.office;

    return SCENE_BY_INTENT.default;
}

export function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

/* ─────────────────────────────────────────────────────────────
   LIMIT PARSING & CONTAINER LIST TRIMMING
   ───────────────────────────────────────────────────────────── */

export function parseRequestedLimit(userText) {
    const t = String(userText || "").toLowerCase();

    const m =
        t.match(/(?:lista|listă|top|arata|arată|dami|dă-mi|give|show)\s*(?:cu|de|about|)\s*(\d{1,3})\b/) ||
        t.match(/\b(\d{1,3})\s*(?:containere|contenedores|containers|items|rezultate|results)\b/) ||
        t.match(/\b(?:limit|límite|limita)\s*[:=]?\s*(\d{1,3})\b/);

    if (!m) return null;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n < 1) return null;
    return Math.min(n, 200);
}

export function countContainerLikeTokens(s) {
    const re = /\b[A-Z]{4}\s?\d{7}\b/g;
    const hits = String(s || "").toUpperCase().match(re);
    return hits ? hits.length : 0;
}

export function trimContainerListText(text, limit) {
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

/* ─────────────────────────────────────────────────────────────
   INTENT GUARDS & VALIDATION
   ───────────────────────────────────────────────────────────── */

export function isDepotRequest(text) {
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

export function isGreetingIntent(intentType) {
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

export function isChitChatIntent(intentType) {
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

export function looksLikePickContainerLoad(text) {
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

export function shouldRejectIntentForText(intentType, userText) {
    if (!intentType) return false;

    const depotLike = isDepotRequest(userText);
    const pickLike = looksLikePickContainerLoad(userText);

    // nu acceptăm greeting pentru cereri de containere
    if (depotLike && isGreetingIntent(intentType)) return true;

    // ✅ nu acceptăm smalltalk/static pentru cereri de containere / pick-load
    if ((depotLike || pickLike) && isChitChatIntent(intentType)) return true;

    return false;
}
