const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Testa o token
  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
    }),
  });

  const tokenStatus = tokenRes.status;
  const tokenBody = await tokenRes.text();

  // Se token ok, testa busca
  let searchResult = null;
  if (tokenRes.ok) {
    const token = JSON.parse(tokenBody).access_token;
    const searchRes = await fetch('https://api.mercadolibre.com/sites/MLB/search?q=notebook&limit=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchBody = await searchRes.text();
    searchResult = { status: searchRes.status, preview: searchBody.slice(0, 300) };
  }

  return new Response(JSON.stringify({
    client_id: ML_CLIENT_ID ? 'ok' : 'MISSING',
    client_secret: ML_CLIENT_SECRET ? 'ok' : 'MISSING',
    token_status: tokenStatus,
    token_body: tokenBody.slice(0, 300),
    search: searchResult,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
