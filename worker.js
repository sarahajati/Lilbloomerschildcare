/**
 * Cloudflare Worker: static files + optional cloud save for site JSON (KV).
 *
 * KV binding variable name: SITE_DATA or SAVE_DATA
 *
 * Save token (same string staff type in admin) can be provided in EITHER place:
 *   A) Worker → Settings → Variables and Secrets → Secret named SAVE_TOKEN or save_token
 *   B) KV “Pairs” UI: a key named save_token or SAVE_TOKEN (some teams add it here by mistake;
 *      we read it as a fallback so that still works).
 */
function getKv(env) {
  return env.SITE_DATA || env.SAVE_DATA;
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
                  "cache-control": "no-store",
                },
              });
            }
          } catch (e) {
            /* fall through to assets */
          }
        }
        const assetUrl = new URL("/data/site.json", request.url);
        return env.ASSETS.fetch(new Request(assetUrl.toString(), request));
      }

      if (request.method === "POST") {
        const kv = getKv(env);
        if (!kv) {
          return jsonErr(
            503,
            "No KV namespace bound. In Worker → Settings → Bindings, add KV with variable name SITE_DATA (or SAVE_DATA), then redeploy."
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
          headers: { "content-type": "application/json; charset=utf-8" },
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
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
