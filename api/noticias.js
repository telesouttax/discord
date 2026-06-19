const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  brasil:      process.env.CANAL_NOTICIAS_BRASIL,
  mundo:       process.env.CANAL_NOTICIAS_MUNDO,
  tecnologia:  process.env.CANAL_NOTICIAS_TECNOLOGIA,
  esportes:    process.env.CANAL_NOTICIAS_ESPORTES,
};

// Usando rss2json como proxy para feeds bloqueados
const FEEDS = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://g1.globo.com/rss/g1/',            fonte: 'G1',            canal: 'brasil',     cor: 0xe74c3c },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://g1.globo.com/rss/g1/mundo/',      fonte: 'G1 Mundo',      canal: 'mundo',      cor: 0xe74c3c },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://g1.globo.com/rss/g1/tecnologia/', fonte: 'G1 Tecnologia', canal: 'tecnologia', cor: 0x3498db },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://ge.globo.com/rss/ge/',            fonte: 'GE Esportes',   canal: 'esportes',   cor: 0x2ecc71 },
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
    })).filter(n => n.titulo && n.link && !posted.has(n.titulo));
  } catch {
    return [];
  }
}

async function postarNoDiscord(canalId, noticia) {
  if (!canalId) return;
  posted.add(noticia.titulo);
  const embed = {
    title: noticia.titulo,
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
