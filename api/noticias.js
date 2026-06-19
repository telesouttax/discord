const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  brasil:      process.env.CANAL_NOTICIAS_BRASIL,
  mundo:       process.env.CANAL_NOTICIAS_MUNDO,
  tecnologia:  process.env.CANAL_NOTICIAS_TECNOLOGIA,
  esportes:    process.env.CANAL_NOTICIAS_ESPORTES,
};

// Apenas G1
const FEEDS = [
  { url: 'https://g1.globo.com/rss/g1/',             fonte: 'G1',            canal: 'brasil',     cor: 0xe74c3c },
  { url: 'https://g1.globo.com/rss/g1/mundo/',       fonte: 'G1 Mundo',      canal: 'mundo',      cor: 0xe74c3c },
  { url: 'https://g1.globo.com/rss/g1/tecnologia/',  fonte: 'G1 Tecnologia', canal: 'tecnologia', cor: 0x3498db },
  { url: 'https://g1.globo.com/rss/g1/esportes/',    fonte: 'G1 Esportes',   canal: 'esportes',   cor: 0x2ecc71 },
];

const posted = new Set();

function extrairTexto(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
}

function extrairImagem(item) {
  const enc = item.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/);
  if (enc) return enc[1];
  const media = item.match(/<media:content[^>]+url="([^"]+)"/);
  if (media) return media[1];
  const img = item.match(/<img[^>]+src="([^"]+)"/);
  if (img) return img[1];
  return null;
}

async function parseFeed(feed) {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    // Apenas 1 notícia por feed por hora
    return items.slice(0, 1).map(item => {
      const titulo = extrairTexto(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
      const link = extrairTexto(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || item.match(/<link\s+href="([^"]+)"/)?.[1] || '');
      const desc = extrairTexto(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').slice(0, 300);
      const imagem = extrairImagem(item);
      const data = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      return { titulo, link, desc, imagem, data: extrairTexto(data), fonte: feed.fonte, canal: feed.canal, cor: feed.cor };
    }).filter(n => n.titulo && n.link && !posted.has(n.titulo));
  } catch {
    return [];
  }
}

async function postarNoDiscord(canalId, noticia) {
  if (!canalId) return;
  posted.add(noticia.titulo);
  const embed = {
    title: noticia.titulo.slice(0, 256),
    url: noticia.link,
    description: noticia.desc || null,
    color: noticia.cor,
    footer: { text: `📰 ${noticia.fonte}` },
    timestamp: new Date().toISOString(),
  };
  if (noticia.imagem) embed.image = { url: noticia.imagem };
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
      const noticias = await parseFeed(feed);
      const canalId = CANAIS[feed.canal];
      for (const noticia of noticias) {
        await postarNoDiscord(canalId, noticia);
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
