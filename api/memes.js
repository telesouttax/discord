const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;

const CANAL_MEMES = '1517633260790874243';

const SUBREDDITS = ['memes', 'dankmemes', 'BrasilSimulator', 'eu_nvr', 'HUEstation'];

const posted = new Set();

async function buscarMemes(subreddit) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
      headers: { 'User-Agent': 'DiscordBot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const posts = json.data?.children || [];

    return posts
      .filter(p => {
        const d = p.data;
        return (
          !d.is_video &&
          !d.stickied &&
          (d.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || d.url?.includes('i.redd.it') || d.url?.includes('i.imgur.com')) &&
          !posted.has(d.id)
        );
      })
      .slice(0, 2)
      .map(p => ({
        id: p.data.id,
        titulo: p.data.title?.slice(0, 200) || '',
        imagem: p.data.url,
        upvotes: p.data.ups,
        subreddit: p.data.subreddit_name_prefixed,
        link: `https://reddit.com${p.data.permalink}`,
      }));
  } catch {
    return [];
  }
}

async function postarNoDiscord(meme) {
  posted.add(meme.id);
  const embed = {
    title: meme.titulo,
    url: meme.link,
    color: 0xff4500,
    image: { url: meme.imagem },
    footer: { text: `😂 ${meme.subreddit} • 👍 ${meme.upvotes.toLocaleString('pt-BR')} upvotes` },
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

  for (const subreddit of SUBREDDITS) {
    try {
      const memes = await buscarMemes(subreddit);
      for (const meme of memes) {
        try {
          await postarNoDiscord(meme);
          total++;
          if (total >= 5) break;
          await new Promise(r => setTimeout(r, 800));
        } catch (e) {
          erros.push(`${subreddit}: ${e.message}`);
        }
      }
      if (total >= 5) break;
    } catch (e) {
      erros.push(`${subreddit}: ${e.message}`);
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    postados: total,
    erros: erros.length ? erros : undefined,
    horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
