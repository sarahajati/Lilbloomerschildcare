/**
 * Cloudflare Worker: static files + optional cloud save for site JSON (KV).
 *
 * KV binding variable name: KV, SITE_DATA, or SAVE_DATA (first match wins)
 *
 * Save token (same string staff type in admin) can be provided in EITHER place:
 *   A) Worker → Settings → Variables and Secrets → Secret named SAVE_TOKEN or save_token
 *   B) KV “Pairs” UI: a key named save_token or SAVE_TOKEN (some teams add it here by mistake;
 *      we read it as a fallback so that still works).
 */
function getKv(env) {
  return env.KV || env.SITE_DATA || env.SAVE_DATA;
}

async function resolveSaveSecret(env, kv) {
  const fromEnv = env.SAVE_TOKEN || env.save_token;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).trim();
  }
  if (!kv) return null;
  try {
    for (const key of ["save_token", "SAVE_TOKEN"]) {
      const v = await kv.get(key);
      if (v && String(v).trim()) {
        return String(v).trim();
      }
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/api/site") {
      if (request.method === "GET") {
        const kv = getKv(env);
        if (kv) {
          try {
            const stored = await kv.get("site");
            if (stored) {
              return new Response(stored, {
                headers: {
                  "content-type": "application/json; charset=utf-8",
                  "cache-control": "no-store, max-age=0",
                  "cdn-cache-control": "no-store",
                  "x-lilbloomers-site-source": "kv",
                },
              });
            }
          } catch (e) {
            /* fall through to assets */
          }
        }
        const assetUrl = new URL("/data/site.json", request.url);
        const assetResp = await env.ASSETS.fetch(
          new Request(assetUrl.toString(), request)
        );
        const headers = new Headers(assetResp.headers);
        headers.set("content-type", "application/json; charset=utf-8");
        headers.set("cache-control", "no-store, max-age=0");
        headers.set("cdn-cache-control", "no-store");
        headers.set("x-lilbloomers-site-source", "bundled");
        return new Response(assetResp.body, {
          status: assetResp.status,
          headers,
        });
      }

      if (request.method === "POST") {
        const kv = getKv(env);
        if (!kv) {
          return jsonErr(
            503,
            "No KV namespace bound. In Worker → Settings → Bindings, add KV (binding name KV, SITE_DATA, or SAVE_DATA), then redeploy."
          );
        }
        const secret = await resolveSaveSecret(env, kv);
        if (!secret) {
          return jsonErr(
            503,
            "No save token found. Use ONE of: (1) Worker → Variables and Secrets → add Secret save_token or SAVE_TOKEN, OR (2) in KV → your namespace → Pairs → add key save_token or SAVE_TOKEN with your password. Then redeploy."
          );
        }
        const auth = request.headers.get("Authorization") || "";
        if (auth !== "Bearer " + secret) {
          return jsonErr(401, "Invalid or missing save token.");
        }
        let body;
        try {
          body = await request.text();
          JSON.parse(body);
        } catch (e) {
          return jsonErr(400, "Body must be valid JSON.");
        }
        await kv.put("site", body);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store, max-age=0",
            "cdn-cache-control": "no-store",
          },
        });
      }

      return new Response("Method not allowed", { status: 405 });
    }

    return env.ASSETS.fetch(request);
  },
};

function jsonErr(status, message) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "cdn-cache-control": "no-store",
    },
  });
}
