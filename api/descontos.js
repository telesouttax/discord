const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Testa a API do Mercado Livre
  const mlRes = await fetch('https://api.mercadolibre.com/sites/MLB/search?q=notebook&limit=1');
  const mlJson = await mlRes.json();
  const mlItem = mlJson.results?.[0];

  return new Response(JSON.stringify({
    canais: CANAIS,
    mercadolivre_ok: mlRes.ok,
    primeiro_produto: mlItem ? { titulo: mlItem.title, preco: mlItem.price, link: mlItem.permalink } : null,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
