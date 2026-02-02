// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// DEV: prompturi Groq (aliniate cu api/rayna-chat.js)
function systemPromptAnswer(lang = "es") {
  if (lang === "ro")
    return "Ești Rayna, asistent logistic. Folosește STRICT datele din CONTEXT_DB_JSON. Nu inventa. Răspunde scurt (2-4 propoziții).";
  if (lang === "ca")
    return "Ets Rayna, assistent de logística. Fes servir NOMÉS dades del CONTEXT_DB_JSON. No inventis. Resposta curta (2-4 frases).";
  return "Eres Rayna, asistente de logística. Usa SOLO los datos del CONTEXT_DB_JSON. No inventes. Responde corto (2-4 frases).";
}

const SYSTEM_PROMPT_NORMALIZE = `
Rolul tău: translator între limbaj natural și comenzi pentru Rayna Hub.
Intents: profile_info, vehicle_info, pick_container_load (Slots: size_base "20"|"40"|"45", size_special "hc"|"ot"|"bajo", naviera string), depot_query, parking_search, greeting, help.
Variante naviere: Maersk, MSC, Evergreen, Hapag, ONE, COSCO, CMA, HMM, ZIM.
Răspunde DOAR cu JSON valid: { "normalized_text": "...", "suggested_intent": "..." sau null, "slots": {}, "detected_lang": "es|ro|ca" }
Fără markdown, fără backticks.
`.trim();

function stripJsonFences(s = "") {
  const t = String(s || "").trim();
  if (t.startsWith("```")) return t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  return t;
}

function parseNormalizeJson(aiText) {
  const raw = stripJsonFences(aiText);
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
     build: {
    sourcemap: true,
  },
    plugins: [
      react(),

      // ─────────────────────────────────────────────────────────────
      // DEV: POST /api/rayna-chat → Groq (normalize + answer), primul în lanț
      // ─────────────────────────────────────────────────────────────
      {
        name: "rayna-dev-api",
        configureServer(server) {
          const handleRaynaChat = async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.setHeader("Content-Type", "application/json");

            if (req.method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }
            if (req.method !== "POST") {
              res.statusCode = 405;
              res.end(JSON.stringify({ message: "Method not allowed" }));
              return;
            }

            let body = "";
            req.on("data", (c) => (body += c));
            await new Promise((r) => req.on("end", r));

            let parsed = {};
            try {
              parsed = body ? JSON.parse(body) : {};
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ message: "Invalid JSON body" }));
              return;
            }

            const mode = String(parsed.mode || "answer");
            const text = String(parsed.text || "").trim();
            const lang = String(parsed.lang || "es");
            const maxTokens = Number(parsed.maxTokens) || 280;
            const keyRaw = (process.env.GROQ_API_KEY || env.GROQ_API_KEY || "").trim();

            if (!keyRaw || !keyRaw.startsWith("gsk_")) {
              res.statusCode = 500;
              res.end(JSON.stringify({
                error: "Missing or invalid GROQ_API_KEY",
                hint: "Set GROQ_API_KEY (starts with gsk_) in .env and restart dev server.",
              }));
              return;
            }

            try {
              const { generateText } = await import("ai");
              const { groq } = await import("@ai-sdk/groq");
              const model = "llama-3.1-8b-instant";

              if (mode === "normalize") {
                const result = await generateText({
                  model: groq(model),
                  system: SYSTEM_PROMPT_NORMALIZE,
                  prompt: `TEXT USER:\n${text}\n\nLANG (hint): ${lang}\n\nRăspunde DOAR cu JSON valid.`,
                  maxTokens: 320,
                  temperature: 0,
                });
                const parsedOut = parseNormalizeJson(result.text || "");
                const out = parsedOut
                  ? {
                      normalized_text: String(parsedOut.normalized_text || "").trim(),
                      suggested_intent: parsedOut.suggested_intent ?? null,
                      slots: parsedOut.slots && typeof parsedOut.slots === "object" ? parsedOut.slots : {},
                      detected_lang: /^ro/i.test(parsedOut.detected_lang) ? "ro" : /^ca/i.test(parsedOut.detected_lang) ? "ca" : "es",
                    }
                  : { normalized_text: text, suggested_intent: null, slots: {}, detected_lang: lang };
                res.statusCode = 200;
                res.end(JSON.stringify({ ...out, model, usage: result.usage || null }));
                return;
              }

              const safeContext = parsed.context && typeof parsed.context === "object" ? parsed.context : null;
              const prompt =
                `USER_TEXT:\n${text}\n\nCONTEXT_DB_JSON:\n${safeContext ? JSON.stringify(safeContext) : "null"}\n\nFormulează răspuns scurt, prietenos, pe baza strictă a contextului.`;
              const result = await generateText({
                model: groq(model),
                system: systemPromptAnswer(lang),
                prompt,
                maxTokens,
                temperature: 0.2,
              });
              const replyText = (result.text || "").trim();
              res.statusCode = 200;
              res.end(JSON.stringify({
                text: replyText,
                reply_text: replyText,
                answer: replyText,
                model,
                usage: result.usage || null,
              }));
            } catch (e) {
              console.error("[rayna-dev-api] error:", e);
              res.statusCode = 500;
              res.end(JSON.stringify({ message: e?.message || String(e) }));
            }
          };

          const raynaMiddleware = (req, res, next) => {
            const pathname = (req.url || "").split("?")[0];
            if (req.method === "POST" && pathname === "/api/rayna-chat") {
              handleRaynaChat(req, res);
              return;
            }
            next();
          };
          server.middlewares.stack.unshift({ route: "", handle: raynaMiddleware });
        },
      },

      // PWA pluginul tău rămâne identic
      VitePWA({
        registerType: "prompt",
        injectRegister: "auto",
        includeAssets: ["icons/ios/32.png", "icons/ios/180.png", "icons/android/android-launchericon-512-512.png"],
        manifest: {
          name: "Rayna2.0",
          short_name: "Rayna",
          description: "Tu transportista virtual.",
          theme_color: "#111827",
          background_color: "#ffffff",
          start_url: "/",
          display: "standalone",
          scope: "/",
          icons: [
            { src: "icons/android/android-launchericon-192-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/android/android-launchericon-512-512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/android/android-launchericon-512-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
            { src: "icons/windows11/Square150x150Logo.scale-100.png", sizes: "150x150", type: "image/png" },
          ],
        },
        workbox: {
          globDirectory: "dist",
          globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}"],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          navigateFallback: "/index.html",
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.endsWith(".glb"),
              handler: "NetworkFirst",
              options: { cacheName: "glb-models", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.endsWith(".wasm"),
              handler: "CacheFirst",
              options: { cacheName: "wasm-decoders", expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
          ],
          navigateFallbackDenylist: [/^\/models\//],
        },
        devOptions: { enabled: false },
      }),
    ],
  };
});