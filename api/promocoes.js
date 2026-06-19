const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

const CANAL_OFERTAS = '1517633267443040458';

const posted = new Set();

async function scrape(url) {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=false`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ScrapingBee ${res.status}`);
  return res.text();
}

async function buscarMLOfertas() {
  const html = await scrape('https://www.mercadolivre.com.br/ofertas');
  const produtos = [];

  // Divide por card
  const cards = html.split('class="poly-card');

  // Coleta imagens e títulos separadamente em ordem
  const imagens = [];
  const blocosTitulo = [];

  for (const card of cards) {
    const imgMatch = card.match(/src="(https:\/\/http2\.mlstatic\.com\/D_[^"]+\.webp)"/);
    if (imgMatch) imagens.push(imgMatch[1]);

    const tituloMatch = card.match(/class="poly-component__title">([^<]+)<\/a>/);
    if (tituloMatch) blocosTitulo.push(card);
  }

  // Pareia imagem com título pelo índice
  for (let i = 0; i < Math.min(blocosTitulo.length, 10); i++) {
    const bloco = blocosTitulo[i];
    const titulo = bloco.match(/class="poly-component__title">([^<]+)<\/a>/)?.[1]?.trim();
    if (!titulo || posted.has(titulo)) continue;

    const link = bloco.match(/href="(https:\/\/www\.mercadolivre\.com\.br\/[^"#]+)/)?.[1];
    if (!link) continue;

    const precoMatch = bloco.match(/aria-label="Agora:\s*([^"]+)"/);
    const preco = precoMatch ? `R$ ${precoMatch[1].replace(' reais', '').trim()}` : null;

    const precoAntigoMatch = bloco.match(/andes-money-amount__fraction[^>]*>(\d[\d.]*)<\/span><\/s>/);
    const precoAntigo = precoAntigoMatch ? `R$ ${precoAntigoMatch[1]}` : null;

    const descontoMatch = bloco.match(/(\d+)%\s*OFF/i);
    const desconto = descontoMatch ? descontoMatch[1] : null;

    const badgeMatch = bloco.match(/class="poly-component__highlight">([^<]+)</);
    const badge = badgeMatch ? badgeMatch[1] : null;

    const freteGratis = bloco.includes('Frete grátis') || bloco.includes('frete-gratis');

    const imagem = imagens[i] || null;

    let desc = '';
    if (preco) desc += `💰 **Preço:** ${preco}\n`;
    if (precoAntigo) desc += `~~De: ${precoAntigo}~~\n`;
    if (desconto) desc += `🏷️ **${desconto}% de desconto!**\n`;
    if (freteGratis) desc += `🚚 **Frete grátis!**\n`;
    if (badge) desc += `⚡ ${badge}`;

    produtos.push({ titulo: titulo.slice(0, 200), link, desc: desc.trim(), imagem });
  }

  return produtos;
}

async function postarNoDiscord(item) {
  posted.add(item.titulo);
  const embed = {
    title: `🔥 ${item.titulo}`.slice(0, 256),
    url: item.link,
    description: item.desc || null,
    color: 0xff6600,
    image: item.imagem ? { url: item.imagem } : undefined,
    footer: { text: '🛍️ Mercado Livre • Clique no título para comprar' },
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(`https://discord.com/api/v10/channels/${CANAL_OFERTAS}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);
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
    const produtos = await buscarMLOfertas();
    for (const item of produtos) {
      try {
        await postarNoDiscord(item);
        total++;
        await new Promise(r => setTimeout(r, 800));
      } catch (e) {
        erros.push(`${item.titulo}: ${e.message}`);
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
