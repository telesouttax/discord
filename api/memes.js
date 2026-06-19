const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAL_MEMES = '1517633260790874243';

const SUBREDDITS = ['memes', 'dankmemes', 'BrasilSimulator', 'eu_nvr', 'HUEstation'];

const posted = new Set();

async function buscarMemes() {
  const memesTodos = [];

  for (const sub of SUBREDDITS) {
    try {
      const res = await fetch(`https://meme-api.com/gimme/${sub}/3`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const memes = json.memes || [];
      for (const m of memes) {
        if (!m.nsfw && !m.spoiler && !posted.has(m.postLink) && m.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          memesTodos.push({
            id: m.postLink,
            titulo: m.title?.slice(0, 200) || 'Meme',
            imagem: m.url,
            upvotes: m.ups,
            subreddit: `r/${m.subreddit}`,
            link: m.postLink,
          });
        }
      }
    } catch { continue; }
  }

  // Embaralha e pega 5
  return memesTodos.sort(() => Math.random() - 0.5).slice(0, 5);
}

async function postarNoDiscord(meme) {
  posted.add(meme.id);
  const embed = {
    title: meme.titulo,
    url: meme.link,
    color: 0xff4500,
    image: { url: meme.imagem },
    footer: { text: `😂 ${meme.subreddit} • 👍 ${meme.upvotes?.toLocaleString('pt-BR') || '0'} upvotes` },
    timestamp: new Date().toISOString(),
  };
  const res = await fetch(`https://discord.com/api/v10/channels/${CANAL_MEMES}/messages`, {
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
    const memes = await buscarMemes();
    for (const meme of memes) {
      try {
        await postarNoDiscord(meme);
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
    postados: total,
    erros: erros.length ? erros : undefined,
    horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
