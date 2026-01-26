// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  // Încarcă toate env-urile (și fără prefix VITE_)
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),

      // ─────────────────────────────────────────────────────────────
      // DEV ONLY: /api/rayna-chat → Gemini (server-side middleware în Vite)
      // ─────────────────────────────────────────────────────────────
      {
        name: "rayna-dev-api",
        configureServer(server) {
          // acceptă și cu slash la final
          server.middlewares.use(/^\/api\/rayna-chat\/?$/, async (req, res) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

            if (req.method === "OPTIONS") {
              res.statusCode = 204;
              res.end();
              return;
            }

            if (req.method !== "POST") {
              res.statusCode = 405;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ message: "Method not allowed" }));
              return;
            }

            try {
              // Citește body
              let body = "";
              req.on("data", (c) => (body += c));
              await new Promise((r) => req.on("end", r));

              let parsed = {};
              try {
                parsed = body ? JSON.parse(body) : {};
              } catch {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ message: "Invalid JSON body" }));
                return;
              }

              const text = String(parsed.text || "");
              const lang = String(parsed.lang || "es");
              const maxTokens = Number(parsed.maxTokens || 240);

              // IMPORTANT: citește cheia la runtime din env + process.env
              // (Vite loadEnv populates "env", dar uneori ai și process.env setat din shell)
              const keyRaw =
                (process.env.GEMINI_API_KEY ||
                  process.env.VITE_GEMINI_API_KEY || // fallback (nu recomand pentru client, dar aici e server-side)
                  env.GEMINI_API_KEY ||
                  env.VITE_GEMINI_API_KEY ||
                  "").trim();

              // log sigur (nu expune cheia completă)
              console.log("[rayna-dev-api] gemini key check", {
                hasKey: !!keyRaw,
                len: keyRaw.length,
                starts: keyRaw.slice(0, 7),
                ends: keyRaw.slice(-4),
              });

              if (!keyRaw) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ message: "Missing GEMINI_API_KEY" }));
                return;
              }

              if (typeof fetch !== "function") {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ message: "Node fetch() not available. Use Node 18+." }));
                return;
              }

              const model = "gemini-1.5-flash";

              const system =
                lang === "ro"
                  ? "Ești Rayna, asistent logistic. Răspunde scurt și concret. Dacă lipsesc date, pune o singură întrebare. Nu inventa."
                  : lang === "ca"
                    ? "Ets Rayna, assistent de logística. Respon curt i directe. Si falten dades, fes una sola pregunta. No inventis."
                    : "Eres Rayna, asistente de logística. Responde corto y directo. Si faltan datos, haz una sola pregunta. No inventes.";

              // Gemini endpoint (cheia e în query, așa cere API-ul)
              const geminiUrl =
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
                encodeURIComponent(keyRaw);

              const geminiRes = await fetch(geminiUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  contents: [
                    {
                      role: "user",
                      parts: [{ text: `${system}\n\nUsuario: ${text}` }],
                    },
                  ],
                  generationConfig: {
                    maxOutputTokens: Math.min(Number.isFinite(maxTokens) ? maxTokens : 240, 800),
                    temperature: 0.2,
                  },
                }),
              });

              const raw = await geminiRes.text();

              if (!geminiRes.ok) {
                res.statusCode = geminiRes.status;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    message: `Gemini error ${geminiRes.status}`,
                    raw: raw.slice(0, 1500),
                  })
                );
                return;
              }

              const data = JSON.parse(raw);
              const answer =
                data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter(Boolean).join("") || "";

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ model, answer, usage: data?.usageMetadata || null }));
            } catch (e) {
              console.error("[rayna-dev-api] error:", e);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ message: e?.message || String(e) }));
            }
          });
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
