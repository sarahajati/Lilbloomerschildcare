/**
 * Cloudflare Worker: static files + optional cloud save for site JSON (KV).
 *
 * KV binding variable name (pick one in dashboard):
 *   SITE_DATA  (recommended)  or  SAVE_DATA
 *
 * Secret for POST /api/site (pick one name in dashboard — value is the "save token"):
 *   SAVE_TOKEN  or  save_token
 */
function getKv(env) {
  return env.SITE_DATA || env.SAVE_DATA;
}

function getSaveSecret(env) {
  return env.SAVE_TOKEN || env.save_token;
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
        const secret = getSaveSecret(env);
        if (!kv) {
          return jsonErr(
            503,
            "No KV namespace bound. In Worker → Settings → Bindings, add KV with variable name SITE_DATA (or SAVE_DATA), then redeploy."
          );
        }
        if (!secret) {
          return jsonErr(
            503,
            "No save secret found. Add a Worker secret named SAVE_TOKEN or save_token (same value you type in admin), then redeploy."
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
