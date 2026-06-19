const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

const CANAIS = {
  ofertas:    process.env.CANAL_OFERTAS_DIA,
  roupas:     process.env.CANAL_ROUPAS,
  tecnologia: process.env.CANAL_TECH_OFERTA,
  casa:       process.env.CANAL_CASA,
  games:      process.env.CANAL_GAMES_OFERTA,
};

const posted = new Set();

async function scrape(url) {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=false&premium_proxy=false`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ScrapingBee error: ${res.status}`);
  return res.text();
}

// Pega promoções da Amazon Brasil
async function buscarAmazon() {
  try {
    const html = await scrape('https://www.amazon.com.br/deals?deals-widget=%7B%22version%22%3A1%2C%22viewIndex%22%3A0%2C%22presetId%22%3A%22deals-collection-lightning-deals%22%7D');
    const produtos = [];

    // Extrai produtos do HTML
    const itemRegex = /data-asin="([^"]+)"[\s\S]*?<span[^>]*>([^<]{10,100})<\/span>[\s\S]*?<span[^>]*class="[^"]*price[^"]*"[^>]*>(R\$[\s\d.,]+)<\/span>/gi;
    const matches = [...html.matchAll(itemRegex)];

    for (const match of matches.slice(0, 2)) {
      const asin = match[1];
      const titulo = match[2].trim();
      const preco = match[3].trim();
      if (!posted.has(titulo)) {
        produtos.push({
          titulo: titulo.slice(0, 200),
          link: `https://www.amazon.com.br/dp/${asin}`,
          desc: `💰 **Preço:** ${preco}\n⚡ Oferta Relâmpago Amazon`,
          imagem: null,
          fonte: 'Amazon Brasil',
          canal: 'ofertas',
          cor: 0xff9900,
          emoji: '📦',
        });
      }
    }
    return produtos;
  } catch {
    return [];
  }
}

// Pega promoções do Mercado Livre
async function buscarML(query, canal, emoji, cor) {
  try {
    const html = await scrape(`https://www.mercadolivre.com.br/ofertas#nav-by-category`);
    const produtos = [];

    // Extrai produtos com desconto
    const itemRegex = /<h2[^>]*class="[^"]*poly-box[^"]*"[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<span[^>]*class="[^"]*andes-money-amount__fraction[^"]*"[^>]*>(\d[\d.]*)<\/span>[\s\S]*?href="(https:\/\/www\.mercadolivre\.com\.br\/[^"]+)"/gi;
    const matches = [...html.matchAll(itemRegex)];

    for (const match of matches.slice(0, 1)) {
      const titulo = match[1].replace(/<[^>]*>/g, '').trim();
      const preco = `R$ ${match[2]}`;
      const link = match[3];
      if (titulo && !posted.has(titulo)) {
        produtos.push({
          titulo: titulo.slice(0, 200),
          link,
          desc: `💰 **Preço:** ${preco}\n🛒 Promoção Mercado Livre`,
          imagem: null,
          fonte: 'Mercado Livre',
          canal,
          cor,
          emoji,
        });
      }
    }
    return produtos;
  } catch {
    return [];
  }
}

async function postarNoDiscord(canalId, item) {
  if (!canalId || !item.titulo) return;
  posted.add(item.titulo);
  const embed = {
    title: `${item.emoji} ${item.titulo}`.slice(0, 256),
    url: item.link,
    description: item.desc || null,
    color: item.cor,
    footer: { text: `🛍️ ${item.fonte} • Clique no título para comprar` },
    timestamp: new Date().toISOString(),
  };
  if (item.imagem) embed.thumbnail = { url: item.imagem };
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

  try {
    const [amazon, ml] = await Promise.all([
      buscarAmazon(),
      buscarML('ofertas', 'ofertas', '🔥', 0xff6600),
    ]);

    for (const item of [...amazon, ...ml]) {
      const canalId = CANAIS[item.canal];
      try {
        await postarNoDiscord(canalId, item);
        total++;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        erros.push(e.message);
      }
    }
  } catch (e) {
    erros.push(e.message);
  }

  return new Response(JSON.stringify({
    ok: true,
    postadas: total,
    erros: erros.length ? erros : undefined,
    horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
