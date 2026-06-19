const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

const BUSCAS = [
  { query: 'oferta promocao',      canal: 'ofertas',    cor: 0xe74c3c, emoji: '🔥', fonte: 'Mercado Livre' },
  { query: 'camiseta feminina',    canal: 'roupas',     cor: 0xff6b6b, emoji: '👕', fonte: 'Mercado Livre' },
  { query: 'notebook gamer',       canal: 'tecnologia', cor: 0x3498db, emoji: '💻', fonte: 'Mercado Livre' },
  { query: 'decoracao sala casa',  canal: 'casa',       cor: 0x2ecc71, emoji: '🏠', fonte: 'Mercado Livre' },
  { query: 'jogo ps5 xbox',        canal: 'games',      cor: 0x9b59b6, emoji: '🎮', fonte: 'Mercado Livre' },
];

const posted = new Set();

async function buscarOfertas(busca) {
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(busca.query)}&sort=price_asc&limit=3`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)',
        'Accept': 'application/json',
      },
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
  } catch (e) {
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

  let total = 0;
  const erros = [];

  for (const busca of BUSCAS) {
    try {
      const ofertas = await buscarOfertas(busca);
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
