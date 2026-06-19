const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

async function getAccessToken() {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
    }),
  });
  const json = await res.json();
  return { status: res.status, token: json.access_token, error: json.error };
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { status: tokenStatus, token, error: tokenError } = await getAccessToken();

  if (!token) {
    return new Response(JSON.stringify({ tokenStatus, tokenError }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Testa busca por categoria MLB1648 (Tecnologia)
  const searchRes = await fetch('https://api.mercadolibre.com/sites/MLB/search?category=MLB1648&limit=1', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const searchStatus = searchRes.status;
  const searchBody = await searchRes.text();

  return new Response(JSON.stringify({
    token_ok: tokenStatus === 200,
    search_status: searchStatus,
    search_preview: searchBody.slice(0, 500),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
