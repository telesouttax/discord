const CRON_SECRET = process.env.CRON_SECRET;
const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_KEY;

async function scrape(url) {
  const apiUrl = `https://app.scrapingbee.com/api/v1/?api_key=${SCRAPINGBEE_KEY}&url=${encodeURIComponent(url)}&render_js=false`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
  return { status: res.status, html: await res.text() };
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const ml = await scrape('https://www.mercadolivre.com.br/ofertas');
  const html = ml.html;

  // Procura por padrões de produto no HTML do ML
  const temPreco = html.includes('andes-money-amount');
  const temTitulo = html.includes('poly-component__title');
  const temLink = html.includes('mercadolivre.com.br/p/');
  const temImagem = html.includes('mlstatic.com');

  // Tenta extrair um trecho com produto
  const idx = html.indexOf('poly-component__title');
  const trechoTitulo = idx > -1 ? html.slice(idx - 200, idx + 500) : 'não encontrado';

  const idx2 = html.indexOf('andes-money-amount__fraction');
  const trechoPreco = idx2 > -1 ? html.slice(idx2 - 100, idx2 + 300) : 'não encontrado';

  return new Response(JSON.stringify({
    temPreco, temTitulo, temLink, temImagem,
    trechoTitulo,
    trechoPreco,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
