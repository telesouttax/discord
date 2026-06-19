const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

const FEEDS = [
  { url: 'https://www.pelando.com.br/sitemap-deals.xml',  fonte: 'Pelando', canal: 'ofertas',    cor: 0xe74c3c, emoji: '🔥' },
];

// Busca deals do Pelando via sitemap público
async function buscarPelando() {
  try {
    const res = await fetch('https://www.pelando.com.br/sitemap-deals.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const status = res.status;
    const text = await res.text();
    return { status, preview: text.slice(0, 300) };
  } catch (e) {
    return { error: e.message };
  }
}

async function buscarPelandoAPI() {
  try {
    const res = await fetch('https://www.pelando.com.br/api/deals/hot?page=1&pageSize=5', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
        'Accept': 'application/json',
        'Referer': 'https://www.pelando.com.br',
      },
      signal: AbortSignal.timeout(10000),
    });
    const status = res.status;
    const text = await res.text();
    return { status, preview: text.slice(0, 500) };
  } catch (e) {
    return { error: e.message };
  }
}

async function buscarPromobit() {
  try {
    const res = await fetch('https://www.promobit.com.br/api/offers?page=1&per_page=3', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const status = res.status;
    const text = await res.text();
    return { status, preview: text.slice(0, 500) };
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const [pelando, pelandoApi, promobit] = await Promise.all([
    buscarPelando(),
    buscarPelandoAPI(),
    buscarPromobit(),
  ]);

  return new Response(JSON.stringify({
    pelando_sitemap: pelando,
    pelando_api: pelandoApi,
    promobit_api: promobit,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
