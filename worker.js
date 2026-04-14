/**
 * Cloudflare Worker: static files + optional cloud save for site JSON (KV).
 *
 * Bindings (Cloudflare dashboard → Workers → your project → Settings):
 *   - KV namespace → variable name SITE_DATA
 *   - Secret SAVE_TOKEN → long random string (same value staff enter as "save token" in admin)
 *
 * Without SITE_DATA or SAVE_TOKEN, GET /api/site still works (reads data/site.json from assets);
 * POST /api/site returns 503 until KV + secret are configured.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/api/site") {
      if (request.method === "GET") {
        const kv = env.SITE_DATA;
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
        const kv = env.SITE_DATA;
        const secret = env.SAVE_TOKEN;
        if (!kv) {
          return jsonErr(
            503,
            "KV binding SITE_DATA is not set. Add it in the Worker settings, then try again."
          );
        }
        if (!secret) {
          return jsonErr(
            503,
            "SAVE_TOKEN secret is not set. Add it under Worker Secrets, then try again."
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
