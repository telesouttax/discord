const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Tenta diferentes abordagens
  const testes = [
    {
      nome: 'reddit_json',
      url: 'https://www.reddit.com/r/memes/hot.json?limit=3',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    },
    {
      nome: 'reddit_old',
      url: 'https://old.reddit.com/r/memes/hot.json?limit=3',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    },
    {
      nome: 'meme_api',
      url: 'https://meme-api.com/gimme/5',
      headers: { 'Accept': 'application/json' },
    },
    {
      nome: 'imgflip',
      url: 'https://api.imgflip.com/get_memes',
      headers: { 'Accept': 'application/json' },
    },
  ];

  const resultados = {};
  for (const teste of testes) {
    try {
      const res = await fetch(teste.url, { headers: teste.headers, signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      resultados[teste.nome] = { status: res.status, preview: text.slice(0, 200) };
    } catch (e) {
      resultados[teste.nome] = { error: e.message };
    }
  }

  return new Response(JSON.stringify(resultados, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };
