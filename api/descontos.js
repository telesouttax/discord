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
  { url: 'https://clubedospoupadores.com/feed',   fonte: 'Clube dos Poupadores', canal: 'ofertas',    cor: 0xe74c3c, emoji: '🔥' },
  { url: 'https://www.adrenaline.com.br/feed/',   fonte: 'Adrenaline',           canal: 'tecnologia', cor: 0x3498db, emoji: '💻' },
  { url: 'https://www.infomoney.com.br/feed/',    fonte: 'InfoMoney',            canal: 'ofertas',    cor: 0xf39c12, emoji: '💰' },
];

const posted = new Set();

function extrairTexto(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
}

function extrairImagem(item) {
  const media = item.match(/<media:content[^>]+url="([^"]+)"/);
  if (media) return media[1];
  const enc = item.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enc) return enc[1];
  const img = item.match(/<img[^>]+src="([^"]+)"/);
  if (img) return img[1];
  return null;
}

async function parseFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 1).map(item => {
      const titulo = extrairTexto(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
      const link = extrairTexto(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '');
      const desc = extrairTexto(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').slice(0, 300);
      const imagem = extrairImagem(item);
      return { titulo, link, desc, imagem, fonte: feed.fonte, canal: feed.canal, cor: feed.cor, emoji: feed.emoji };
    }).filter(n => n.titulo && n.link && !posted.has(n.titulo));
  } catch {
    return [];
  }
}

async function postarNoDiscord(canalId, item) {
  if (!canalId) return;
  posted.add(item.titulo);
  const embed = {
    title: `${item.emoji} ${item.titulo}`.slice(0, 256),
    url: item.link,
    description: item.desc || null,
    color: item.cor,
    footer: { text: `🛍️ ${item.fonte} • Clique no título para ver` },
    timestamp: new Date().toISOString(),
  };
  if (item.imagem) embed.image = { url: item.imagem };
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
      const items = await parseFeed(feed);
      const canalId = CANAIS[feed.canal];
      for (const item of items) {
        await postarNoDiscord(canalId, item);
        total++;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      erros.push(`${feed.canal}: ${e.message}`);
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
