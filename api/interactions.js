import { verifyKey } from 'discord-interactions';

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_API = 'https://discord.com/api/v10';

async function discordRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

function respond(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleCriarCanal(guildId, options) {
  const nome = options.find(o => o.name === 'nome')?.value;
  const tipo = options.find(o => o.name === 'tipo')?.value || 'texto';
  const limite = options.find(o => o.name === 'limite')?.value || 0;
  const typeMap = { texto: 0, voz: 2, anuncio: 5 };
  const body = { name: nome.toLowerCase().replace(/\s+/g, '-'), type: typeMap[tipo] ?? 0 };
  if (tipo === 'voz' && limite > 0) body.user_limit = limite;
  await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);
  const icon = tipo === 'voz' ? '🔊' : '💬';
  return `${icon} Canal **${nome}** (${tipo}) criado com sucesso!`;
}

async function handleCriarCargo(guildId, options) {
  const nome = options.find(o => o.name === 'nome')?.value;
  const cor = options.find(o => o.name === 'cor')?.value || '#99aab5';
  const mencionar = options.find(o => o.name === 'mencionar')?.value ?? false;
  const colorInt = parseInt(cor.replace('#', ''), 16);
  await discordRequest(`/guilds/${guildId}/roles`, 'POST', {
    name: nome, color: colorInt, hoist: true, mentionable: mencionar,
  });
  return `🎭 Cargo **${nome}** criado com a cor ${cor}!`;
}

async function handleCriarCategoria(guildId, options) {
  const nome = options.find(o => o.name === 'nome')?.value;
  await discordRequest(`/guilds/${guildId}/channels`, 'POST', {
    name: nome.toUpperCase(), type: 4,
  });
  return `📁 Categoria **${nome.toUpperCase()}** criada!`;
}

async function handleSetupCompleto(guildId, options) {
  const template = options.find(o => o.name === 'template')?.value || 'comunidade';
  const templates = {
    comunidade: {
      categorias: ['📢 INFORMAÇÕES', '💬 COMUNIDADE', '🎮 ENTRETENIMENTO'],
      texto: [
        { name: 'boas-vindas', type: 0 }, { name: 'regras', type: 0 },
        { name: 'anuncios', type: 5 }, { name: 'geral', type: 0 },
        { name: 'off-topic', type: 0 }, { name: 'memes', type: 0 },
      ],
      voz: [
        { name: 'Geral', limit: 0 }, { name: 'Jogos', limit: 10 }, { name: 'Música', limit: 0 },
      ],
      cargos: [
        { name: 'Admin', color: 0xe74c3c }, { name: 'Moderador', color: 0x3498db }, { name: 'Membro', color: 0x2ecc71 },
      ],
    },
    gaming: {
      categorias: ['📢 INFO', '🎮 GAMING', '🗣️ CHAT'],
      texto: [
        { name: 'regras', type: 0 }, { name: 'anuncios', type: 5 },
        { name: 'geral', type: 0 }, { name: 'procurar-squad', type: 0 }, { name: 'clips', type: 0 },
      ],
      voz: [
        { name: 'Squad 1', limit: 5 }, { name: 'Squad 2', limit: 5 },
        { name: 'Squad 3', limit: 5 }, { name: 'Espectadores', limit: 0 },
      ],
      cargos: [
        { name: 'Admin', color: 0xe74c3c }, { name: 'Streamer', color: 0x9b59b6 },
        { name: 'Pro Player', color: 0xf39c12 }, { name: 'Membro', color: 0x95a5a6 },
      ],
    },
    estudo: {
      categorias: ['📢 AVISOS', '📚 ESTUDOS', '🤝 GRUPOS', '☕ DESCANSO'],
      texto: [
        { name: 'avisos', type: 5 }, { name: 'apresentacoes', type: 0 },
        { name: 'duvidas', type: 0 }, { name: 'materiais', type: 0 }, { name: 'off-topic', type: 0 },
      ],
      voz: [
        { name: 'Sala de Estudos 1', limit: 0 }, { name: 'Sala de Estudos 2', limit: 0 },
        { name: 'Grupo de Revisão', limit: 8 },
      ],
      cargos: [
        { name: 'Professor', color: 0xe74c3c }, { name: 'Monitor', color: 0x3498db }, { name: 'Aluno', color: 0x2ecc71 },
      ],
    },
  };
  const t = templates[template] || templates.comunidade;
  let criados = { categorias: 0, texto: 0, voz: 0, cargos: 0 };
  for (const cat of t.categorias) {
    await discordRequest(`/guilds/${guildId}/channels`, 'POST', { name: cat, type: 4 });
    criados.categorias++;
  }
  for (const ch of t.texto) {
    await discordRequest(`/guilds/${guildId}/channels`, 'POST', ch);
    criados.texto++;
  }
  for (const ch of t.voz) {
    await discordRequest(`/guilds/${guildId}/channels`, 'POST', { name: ch.name, type: 2, user_limit: ch.limit });
    criados.voz++;
  }
  for (const role of t.cargos) {
    await discordRequest(`/guilds/${guildId}/roles`, 'POST', { name: role.name, color: role.color, hoist: true, mentionable: true });
    criados.cargos++;
  }
  return `✅ **Setup "${template}" concluído!**\n📁 ${criados.categorias} categorias · 💬 ${criados.texto} canais de texto · 🔊 ${criados.voz} canais de voz · 🎭 ${criados.cargos} cargos`;
}

async function handleListar(guildId) {
  const [channels, roles] = await Promise.all([
    discordRequest(`/guilds/${guildId}/channels`),
    discordRequest(`/guilds/${guildId}/roles`),
  ]);
  const texto = channels.filter(c => c.type === 0).map(c => `#${c.name}`).join(', ') || 'nenhum';
  const voz = channels.filter(c => c.type === 2).map(c => c.name).join(', ') || 'nenhum';
  const cats = channels.filter(c => c.type === 4).map(c => c.name).join(', ') || 'nenhuma';
  const roleList = roles.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'nenhum';
  return `📊 **Estrutura atual:**\n📁 **Categorias:** ${cats}\n💬 **Texto:** ${texto}\n🔊 **Voz:** ${voz}\n🎭 **Cargos:** ${roleList}`;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();
  const isValid = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
  if (!isValid) return new Response('Assinatura inválida', { status: 401 });
  const interaction = JSON.parse(rawBody);
  if (interaction.type === 1) return respond({ type: 1 });
  if (interaction.type === 2) {
    const { name, options = [] } = interaction.data;
    const guildId = interaction.guild_id;
    try {
      let message = '';
      if (name === 'criar-canal') message = await handleCriarCanal(guildId, options);
      else if (name === 'criar-cargo') message = await handleCriarCargo(guildId, options);
      else if (name === 'criar-categoria') message = await handleCriarCategoria(guildId, options);
      else if (name === 'setup') message = await handleSetupCompleto(guildId, options);
      else if (name === 'listar') message = await handleListar(guildId);
      else message = '❓ Comando não reconhecido.';
      return respond({ type: 4, data: { content: message, flags: 64 } });
    } catch (err) {
      console.error(err);
      return respond({ type: 4, data: { content: `❌ Erro: ${err.message}`, flags: 64 } });
    }
  }
  return new Response('Tipo desconhecido', { status: 400 });
}

export const config = { runtime: 'edge' };
