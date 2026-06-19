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

function normalizarTitulo(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
}

async function buscarMLOfertas() {
  const html = await scrape('https://www.mercadolivre.com.br/ofertas');
  const produtos = [];

  // Monta mapa de imagens pelo atributo alt (que contém o título do produto)
  const mapaImagens = {};
  const imgRegex = /<img[^>]+class="poly-component__picture"[^>]+src="(https:\/\/http2\.mlstatic\.com\/D_[^"]+)"[^>]+alt="([^"]+)"/g;
  for (const match of html.matchAll(imgRegex)) {
    const url = match[1];
    const alt = normalizarTitulo(match[2]);
    mapaImagens[alt] = url;
  }

  // Extrai cards com título
  const cards = html.split('class="poly-card');
  for (const card of cards.slice(1)) {
    const tituloMatch = card.match(/class="poly-component__title">([^<]+)<\/a>/);
    const titulo = tituloMatch?.[1]?.trim();
    if (!titulo || posted.has(titulo)) continue;

    const link = card.match(/href="(https:\/\/www\.mercadolivre\.com\.br\/[^"#]+)/)?.[1];
    if (!link) continue;

    // Busca imagem pelo alt que bate com o título
    const chave = normalizarTitulo(titulo);
    let imagem = mapaImagens[chave] || null;

    // Se não achou exato, tenta match parcial
    if (!imagem) {
      for (const [alt, url] of Object.entries(mapaImagens)) {
        if (alt.includes(chave.slice(0, 15)) || chave.includes(alt.slice(0, 15))) {
          imagem = url;
          break;
        }
      }
    }

    const precoMatch = card.match(/aria-label="Agora:\s*([^"]+)"/);
    const preco = precoMatch ? `R$ ${precoMatch[1].replace(' reais', '').trim()}` : null;

    const precoAntigoMatch = card.match(/andes-money-amount__fraction[^>]*>(\d[\d.]*)<\/span><\/s>/);
    const precoAntigo = precoAntigoMatch ? `R$ ${precoAntigoMatch[1]}` : null;

    const descontoMatch = card.match(/(\d+)%\s*OFF/i);
    const desconto = descontoMatch ? descontoMatch[1] : null;

    const badgeMatch = card.match(/class="poly-component__highlight">([^<]+)</);
    const badge = badgeMatch ? badgeMatch[1] : null;

    const freteGratis = card.includes('Frete grátis') || card.includes('frete-gratis');

    let desc = '';
    if (preco) desc += `💰 **Preço:** ${preco}\n`;
    if (precoAntigo) desc += `~~De: ${precoAntigo}~~\n`;
    if (desconto) desc += `🏷️ **${desconto}% de desconto!**\n`;
    if (freteGratis) desc += `🚚 **Frete grátis!**\n`;
    if (badge) desc += `⚡ ${badge}`;

    produtos.push({ titulo: titulo.slice(0, 200), link, desc: desc.trim(), imagem });
    if (produtos.length >= 10) break;
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
    footer: { text: '🛍️ Mercado Livre • Clique no título para comprar' },
    timestamp: new Date().toISOString(),
  };
  if (item.imagem) embed.image = { url: item.imagem };
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
