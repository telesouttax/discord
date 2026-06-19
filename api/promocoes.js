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

  // Testa Amazon ofertas do dia
  const amazon = await scrape('https://www.amazon.com.br/deals');
  
  // Testa ML ofertas
  const ml = await scrape('https://www.mercadolivre.com.br/ofertas');

  return new Response(JSON.stringify({
    amazon: { status: amazon.status, preview: amazon.html.slice(0, 800) },
    ml: { status: ml.status, preview: ml.html.slice(0, 800) },
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
