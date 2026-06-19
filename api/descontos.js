const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

// Feeds RSS públicos do Mercado Livre e Amazon Brasil
const FEEDS = [
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://listado.mercadolivre.com.br/ofertas-do-dia/_Discount_10-100&format=rss',
    fonte: 'Mercado Livre', canal: 'ofertas', cor: 0xffe600, emoji: '🛒',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://listado.mercadolivre.com.br/moda-e-acessorios&format=rss',
    fonte: 'Mercado Livre', canal: 'roupas', cor: 0xff6b6b, emoji: '👕',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://listado.mercadolivre.com.br/eletronicos-e-tecnologia&format=rss',
    fonte: 'Mercado Livre', canal: 'tecnologia', cor: 0x3498db, emoji: '💻',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://listado.mercadolivre.com.br/casa-moveis-decoracao&format=rss',
    fonte: 'Mercado Livre', canal: 'casa', cor: 0x2ecc71, emoji: '🏠',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://listado.mercadolivre.com.br/videogames&format=rss',
    fonte: 'Mercado Livre', canal: 'games', cor: 0x9b59b6, emoji: '🎮',
  },
  // Amazon Brasil via rss2json
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.amazon.com.br/gp/rss/bestsellers/electronics',
    fonte: 'Amazon Brasil', canal: 'tecnologia', cor: 0xff9900, emoji: '📦',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.amazon.com.br/gp/rss/bestsellers/videogames',
    fonte: 'Amazon Brasil', canal: 'games', cor: 0xff9900, emoji: '🎮',
  },
  {
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.amazon.com.br/gp/rss/bestsellers/sports',
    fonte: 'Amazon Brasil', canal: 'ofertas', cor: 0xff9900, emoji: '🔥',
  },
];

const posted = new Set();

async function parseFeed(feed) {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status !== 'ok' || !json.items?.length) return [];

    return json.items.slice(0, 1).map(item => ({
      titulo: item.title?.slice(0, 256) || '',
      link: item.link || '',
      desc: item.description?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
      imagem: item.thumbnail || item.enclosure?.link || null,
      fonte: feed.fonte,
      canal: feed.canal,
      cor: feed.cor,
      emoji: feed.emoji,
    })).filter(n => n.titulo && n.link && !posted.has(n.titulo));
  } catch {
    return [];
  }
}

async function postarNoDiscord(canalId, oferta) {
  if (!canalId) return;
  posted.add(oferta.titulo);

  const embed = {
    title: `${oferta.emoji} ${oferta.titulo}`,
    url: oferta.link,
    description: oferta.desc || null,
    color: oferta.cor,
    footer: { text: `🛍️ ${oferta.fonte} • Clique no título para ver a oferta` },
    timestamp: new Date().toISOString(),
  };
  if (oferta.imagem) embed.image = { url: oferta.imagem };

  await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  let total = 0;
  const erros = [];

  for (const feed of FEEDS) {
    try {
      const ofertas = await parseFeed(feed);
      const canalId = CANAIS[feed.canal];
      for (const oferta of ofertas) {
        await postarNoDiscord(canalId, oferta);
        total++;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      erros.push(`${feed.fonte}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    postadas: total,
    erros: erros.length ? erros : undefined,
    horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
