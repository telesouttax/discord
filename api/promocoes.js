const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

const CANAL_OFERTAS = process.env.CANAL_OFERTAS_DIA;

const posted = new Set();

async function scrape(url) {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=false`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`ScrapingBee ${res.status}`);
  return res.text();
}

function extrairTexto(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
}

async function buscarMLOfertas() {
  const html = await scrape('https://www.mercadolivre.com.br/ofertas');
  const produtos = [];

  // Extrai cada card de produto
  const cardRegex = /class="poly-component__title-wrapper">([\s\S]*?)<\/h3>/g;
  const cards = [...html.matchAll(cardRegex)];

  for (const card of cards.slice(0, 5)) {
    const bloco = card[0];

    // Extrai título
    const tituloMatch = bloco.match(/class="poly-component__title">([^<]+)<\/a>/);
    const titulo = tituloMatch ? tituloMatch[1].trim() : null;
    if (!titulo || posted.has(titulo)) continue;

    // Extrai link
    const linkMatch = bloco.match(/href="(https:\/\/www\.mercadolivre\.com\.br\/[^"]+)"/);
    const link = linkMatch ? linkMatch[1].split('"')[0] : null;
    if (!link) continue;

    // Extrai preço — busca no HTML em volta do card
    const cardIdx = html.indexOf(titulo);
    const vizinhanca = html.slice(Math.max(0, cardIdx - 500), cardIdx + 500);

    const precoMatch = vizinhanca.match(/aria-label="Agora:\s*([^"]+)"/);
    const preco = precoMatch ? `R$ ${precoMatch[1].replace('reais', '').trim()}` : null;

    const precoAntigoMatch = vizinhanca.match(/andes-money-amount__fraction[^>]*>(\d[\d.]*)<\/span><\/s>/);
    const precoAntigo = precoAntigoMatch ? `R$ ${precoAntigoMatch[1]}` : null;

    // Extrai imagem
    const imgMatch = vizinhanca.match(/src="(https:\/\/http2\.mlstatic\.com\/[^"]+)"/);
    const imagem = imgMatch ? imgMatch[1] : null;

    // Extrai badge (OFERTA DO DIA, etc)
    const badgeMatch = vizinhanca.match(/class="poly-component__highlight">([^<]+)</);
    const badge = badgeMatch ? badgeMatch[1] : 'Promoção';

    let desc = preco ? `💰 **Preço:** ${preco}` : '';
    if (precoAntigo) desc += `\n~~De: ${precoAntigo}~~`;
    desc += `\n🏷️ ${badge}`;
    desc += '\n🚚 Ver frete no site';

    produtos.push({ titulo: titulo.slice(0, 200), link, desc, imagem, fonte: 'Mercado Livre', cor: 0xff6600, emoji: '🔥' });
  }

  return produtos;
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
  const res = await fetch(`https://discord.com/api/v10/channels/${canalId}/messages`, {
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
        await postarNoDiscord(CANAL_OFERTAS, item);
        total++;
        await new Promise(r => setTimeout(r, 800));
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
