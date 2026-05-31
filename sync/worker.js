/*
 * Cloudflare Worker – Sync-Backend für die Grundkenntnistest-App.
 *
 * Speichert pro geheimem "Sync-Code" einen JSON-Stand im KV-Store.
 * Sicherheit = der Code ist geheim und lang; ohne korrekten Code gibt es nichts.
 *
 * Einrichtung (siehe SYNC-SETUP.md):
 *   1. Diesen Code als Worker deployen.
 *   2. Einen KV-Namespace anlegen und als Binding-Name  KV  einbinden.
 *   3. Die workers.dev-URL in der App unter "Automatische Synchronisation" eintragen.
 */

const MAX_BODY = 256 * 1024; // 256 KB Limit pro Stand

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Sicherheit liegt im geheimen Code, nicht in der Origin
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code') || '';
    // Code muss vorhanden, lang genug und unverfänglich sein.
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(code)) {
      return json({ error: 'invalid or missing code' }, 400);
    }
    const key = 'p:' + code;

    if (request.method === 'GET') {
      const data = await env.KV.get(key);
      return new Response(data || '{"stats":{}}', {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      const body = await request.text();
      if (body.length > MAX_BODY) return json({ error: 'payload too large' }, 413);
      // Nur gültiges JSON mit stats-Objekt akzeptieren.
      try {
        const obj = JSON.parse(body);
        if (!obj || typeof obj.stats !== 'object' || obj.stats === null) {
          return json({ error: 'invalid payload' }, 400);
        }
      } catch (e) {
        return json({ error: 'invalid json' }, 400);
      }
      await env.KV.put(key, body);
      return json({ ok: true, savedAt: Date.now() });
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
