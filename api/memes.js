const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch('https://www.reddit.com/r/memes/hot.json?limit=3', {
    headers: { 'User-Agent': 'DiscordBot/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  const status = res.status;
  const text = await res.text();

  return new Response(JSON.stringify({
    status,
    preview: text.slice(0, 500),
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
