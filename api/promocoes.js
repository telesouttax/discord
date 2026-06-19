const CRON_SECRET = process.env.CRON_SECRET;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

async function scrape(url) {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=false`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
  return res.text();
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const html = await scrape('https://www.mercadolivre.com.br/ofertas');

  // Divide por card completo
  const cardRegex = /class="poly-card[^"]*"([\s\S]*?)(?=class="poly-card[^"]*"|$)/g;
  const cards = [...html.matchAll(cardRegex)].slice(0, 3);

  const resultado = cards.map(card => {
    const bloco = card[0];
    const titulo = bloco.match(/class="poly-component__title">([^<]+)<\/a>/)?.[1] || null;
    const imagem = bloco.match(/src="(https:\/\/http2\.mlstatic\.com\/[^"]+)"/)?.[1] || null;
    const imagem2 = bloco.match(/data-src="(https:\/\/http2\.mlstatic\.com\/[^"]+)"/)?.[1] || null;
    return { titulo, imagem, imagem2, blocoPreview: bloco.slice(0, 300) };
  });

  return new Response(JSON.stringify(resultado, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };
