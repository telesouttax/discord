const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

const BUSCAS = [
  { query: 'oferta promocao desconto',  canal: 'ofertas',    cor: 0xe74c3c, emoji: '🔥', fonte: 'Mercado Livre' },
  { query: 'camiseta roupa feminina',   canal: 'roupas',     cor: 0xff6b6b, emoji: '👕', fonte: 'Mercado Livre' },
  { query: 'notebook celular samsung',  canal: 'tecnologia', cor: 0x3498db, emoji: '💻', fonte: 'Mercado Livre' },
  { query: 'decoracao casa sala',       canal: 'casa',       cor: 0x2ecc71, emoji: '🏠', fonte: 'Mercado Livre' },
  { query: 'jogo ps5 xbox nintendo',    canal: 'games',      cor: 0x9b59b6, emoji: '🎮', fonte: 'Mercado Livre' },
];

const posted = new Set();

async function getAccessToken() {
  const res = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const json = await res.json();
  return json.access_token;
}

async function buscarOfertas(busca, token) {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(busca.query)}&sort=relevance&limit=3`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = (json.results || []).filter(i => i.price > 10);

    return items.slice(0, 1).map(item => {
      const desconto = item.original_price
        ? Math.round((1 - item.price / item.original_price) * 100)
        : null;
      const preco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price);
      const precoOriginal = item.original_price
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.original_price)
        : null;

      let desc = `💰 **Preço:** ${preco}`;
      if (precoOriginal) desc += `\n~~De: ${precoOriginal}~~`;
      if (desconto && desconto > 0) desc += `\n🏷️ **${desconto}% de desconto!**`;
      if (item.shipping?.free_shipping) desc += '\n🚚 **Frete grátis!**';

      return {
        titulo: item.title?.slice(0, 200) || '',
        link: item.permalink || '',
        desc,
        imagem: item.thumbnail?.replace('I.jpg', 'O.jpg') || null,
        fonte: busca.fonte,
        canal: busca.canal,
        cor: busca.cor,
        emoji: busca.emoji,
      };
    }).filter(n => n.titulo && n.link && !posted.has(n.titulo));
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
    footer: { text: `🛍️ ${oferta.fonte} • Clique no título para comprar` },
    timestamp: new Date().toISOString(),
  };
  if (oferta.imagem) embed.thumbnail = { url: oferta.imagem };
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

  let token;
  try {
    token = await getAccessToken();
  } catch (e) {
    return new Response(JSON.stringify({ error: `Falha no token: ${e.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  let total = 0;
  const erros = [];

  for (const busca of BUSCAS) {
    try {
      const ofertas = await buscarOfertas(busca, token);
      const canalId = CANAIS[busca.canal];
      for (const oferta of ofertas) {
        await postarNoDiscord(canalId, oferta);
        total++;
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      erros.push(`${busca.canal}: ${e.message}`);
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
