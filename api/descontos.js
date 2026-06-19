const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const urls = [
    'https://clubedospoupadores.com/categoria/ofertas/feed',
    'https://clubedospoupadores.com/feed',
    'https://www.infomoney.com.br/feed/',
    'https://www.adrenaline.com.br/feed/',
    'https://drops.com.br/feed/',
  ];

  const results = await Promise.all(urls.map(async url => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      const hasItems = text.includes('<item>');
      return { url, status: res.status, hasItems, preview: text.slice(0, 100) };
    } catch (e) {
      return { url, error: e.message };
    }
  }));

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };
