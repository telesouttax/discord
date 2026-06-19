const fetch = require('node-fetch');

const BASE = 'https://discord.com/api/v10';

async function discordRequest(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Discord API error ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

module.exports = { discordRequest };
