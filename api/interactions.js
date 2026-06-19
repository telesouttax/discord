const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD;
const CLOUDINARY_KEY = process.env.CLOUDINARY_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_SECRET;
const DISCORD_API = 'https://discord.com/api/v10';

async function verifyRequest(rawBody, signature, timestamp) {
  const encoder = new TextEncoder();
  const keyBytes = hexToUint8Array(PUBLIC_KEY);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'Ed25519' }, false, ['verify']
  );
  const message = encoder.encode(timestamp + rawBody);
  const sigBytes = hexToUint8Array(signature);
  return crypto.subtle.verify('Ed25519', cryptoKey, sigBytes, message);
}

function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
}

async function discordRequest(endpoint, method = 'GET', body = null) {
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    method,
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord API ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

function respond(data) {
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}

// Efeitos disponíveis
const EFEITOS = [
  { nome: 'Distorcido', transformacao: 'e_distort:20:80:80:20:20:120:120:80' },
  { nome: 'Espelhado', transformacao: 'e_hflip' },
  { nome: 'Pixelado', transformacao: 'e_pixelate:15' },
  { nome: 'Negativo', transformacao: 'e_negate' },
  { nome: 'Cartoon', transformacao: 'e_cartoonify' },
  { nome: 'Sépia', transformacao: 'e_sepia:80' },
  { nome: 'Blur extremo', transformacao: 'e_blur:800' },
  { nome: 'Oil Paint', transformacao: 'e_oil_paint:40' },
  { nome: 'Vignette', transformacao: 'e_vignette:80' },
  { nome: 'Colorido maluco', transformacao: 'e_art:peacock' },
];

async function zoarImagem(avatarUrl, efeito) {
  // Faz upload da imagem para o Cloudinary
  const timestamp = Math.floor(Date.now() / 1000);
  const transformation = efeito.transformacao;

  // Gera assinatura
  const strToSign = `timestamp=${timestamp}&upload_preset=ml_default`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(CLOUDINARY_SECRET);
  const msgData = encoder.encode(strToSign);

  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Upload via URL
  const formData = new URLSearchParams();
  formData.append('file', avatarUrl);
  formData.append('upload_preset', 'ml_default');
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', CLOUDINARY_KEY);
  formData.append('transformation', transformation);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) throw new Error(`Cloudinary upload failed: ${await uploadRes.text()}`);
  const uploadData = await uploadRes.json();

  // Aplica transformação na URL
  const urlParts = uploadData.secure_url.split('/upload/');
  return `${urlParts[0]}/upload/${transformation}/${urlParts[1]}`;
}

async function handleCriarCanal(guildId, options) {
  const nome = options.find(o => o.name === 'nome')?.value;
  const tipo = options.find(o => o.name === 'tipo')?.value || 'texto';
  const limite = options.find(o => o.name === 'limite')?.value || 0;
  const typeMap = { texto: 0, voz: 2, anuncio: 6 };
  const body = { name: nome.toLowerCase().replace(/\s+/g, '-'), type: typeMap[tipo] ?? 0 };
  if (tipo === 'voz' && limite > 0) body.user_limit = limite;
  await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);
  const icon = tipo === 'voz' ? '🔊' : tipo === 'anuncio' ? '📢' : '💬';
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
  const template = options.find(o => o.name === 'template')?.value || 'completo';
  const templates = {
    completo: {
      cargos: [
        { name: '👑 Admin', color: 0xe74c3c, hoist: true, mentionable: true },
        { name: '🛡️ Moderador', color: 0xe67e22, hoist: true, mentionable: true },
        { name: '💎 VIP', color: 0xf1c40f, hoist: true, mentionable: true },
        { name: '🤝 Parceiro', color: 0x9b59b6, hoist: true, mentionable: true },
        { name: '✅ Membro Verificado', color: 0x2ecc71, hoist: true, mentionable: false },
        { name: '🆕 Membro', color: 0x95a5a6, hoist: false, mentionable: false },
        { name: '🤖 Bot', color: 0x3498db, hoist: true, mentionable: false },
      ],
      categorias_e_canais: [
        { categoria: '📋 ─── INÍCIO ───', canais: [{ name: '📜・regras', type: 0 }, { name: '📣・anuncios', type: 0 }, { name: '👋・boas-vindas', type: 0 }, { name: '🎭・cargos', type: 0 }, { name: '❓・faq', type: 0 }] },
        { categoria: '💬 ─── GERAL ───', canais: [{ name: '💬・geral', type: 0 }, { name: '😂・memes', type: 0 }, { name: '📸・fotos-e-videos', type: 0 }, { name: '🎵・musica', type: 0 }, { name: '🔗・links-uteis', type: 0 }] },
        { categoria: '📰 ─── NOTÍCIAS ───', canais: [{ name: '🗞️・noticias-brasil', type: 0 }, { name: '🌍・noticias-mundo', type: 0 }, { name: '💻・noticias-tecnologia', type: 0 }, { name: '⚽・noticias-esportes', type: 0 }] },
        { categoria: '🛍️ ─── DESCONTOS ───', canais: [{ name: '🔥・ofertas-do-dia', type: 0 }, { name: '👕・roupas-e-calcados', type: 0 }, { name: '📱・tecnologia-em-oferta', type: 0 }, { name: '🏠・casa-e-decoracao', type: 0 }, { name: '🎮・games-em-oferta', type: 0 }] },
        { categoria: '📚 ─── ESTUDOS ───', canais: [{ name: '📖・material-de-estudo', type: 0 }, { name: '❓・duvidas', type: 0 }, { name: '📝・resumos', type: 0 }, { name: '🏆・conquistas', type: 0 }] },
        { categoria: '💼 ─── NEGÓCIOS ───', canais: [{ name: '💡・ideias-e-projetos', type: 0 }, { name: '🤝・parcerias', type: 0 }, { name: '📊・empreendedorismo', type: 0 }, { name: '💰・financas-e-investimentos', type: 0 }] },
        { categoria: '🎮 ─── ENTRETENIMENTO ───', canais: [{ name: '🎮・games', type: 0 }, { name: '🎬・filmes-e-series', type: 0 }, { name: '📚・livros-e-mangás', type: 0 }, { name: '🎵・playlist-da-galera', type: 0 }] },
        { categoria: '🔊 ─── VOZ ───', canais: [{ name: '🔊 Geral', type: 2, user_limit: 0 }, { name: '🎮 Gaming', type: 2, user_limit: 10 }, { name: '📚 Estudos', type: 2, user_limit: 8 }, { name: '💼 Reunião', type: 2, user_limit: 15 }, { name: '🎵 Lounge', type: 2, user_limit: 0 }] },
        { categoria: '🛠️ ─── STAFF ───', canais: [{ name: '🛡️・chat-staff', type: 0 }, { name: '📋・log-de-acoes', type: 0 }, { name: '🚨・denuncias', type: 0 }, { name: '📌・avisos-internos', type: 0 }] },
      ],
    },
    amigos: {
      cargos: [
        { name: '👑 Dono', color: 0xe74c3c, hoist: true, mentionable: true },
        { name: '⭐ Admin', color: 0xf39c12, hoist: true, mentionable: true },
        { name: '😎 Amigo', color: 0x2ecc71, hoist: false, mentionable: false },
      ],
      categorias_e_canais: [
        { categoria: '📋 INFO', canais: [{ name: '📜・regras', type: 0 }, { name: '👋・boas-vindas', type: 0 }] },
        { categoria: '💬 CHAT', canais: [{ name: '💬・geral', type: 0 }, { name: '😂・memes', type: 0 }, { name: '📸・fotos', type: 0 }, { name: '🎵・musica', type: 0 }] },
        { categoria: '🔊 VOZ', canais: [{ name: '🔊 Geral', type: 2, user_limit: 0 }, { name: '🎮 Games', type: 2, user_limit: 5 }, { name: '🎵 Lounge', type: 2, user_limit: 0 }] },
      ],
    },
  };
  const t = templates[template] || templates.completo;
  let criados = { categorias: 0, canais: 0, cargos: 0 };
  for (const role of t.cargos) {
    await discordRequest(`/guilds/${guildId}/roles`, 'POST', { name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable });
    criados.cargos++;
  }
  for (const bloco of t.categorias_e_canais) {
    const cat = await discordRequest(`/guilds/${guildId}/channels`, 'POST', { name: bloco.categoria, type: 4 });
    criados.categorias++;
    for (const canal of bloco.canais) {
      const body = { name: canal.name, type: canal.type, parent_id: cat.id };
      if (canal.type === 2 && canal.user_limit !== undefined) body.user_limit = canal.user_limit;
      await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);
      criados.canais++;
    }
  }
  return `✅ **Setup "${template}" concluído!**\n📁 ${criados.categorias} categorias · 💬 ${criados.canais} canais · 🎭 ${criados.cargos} cargos`;
}

async function handleListar(guildId) {
  const [channels, roles] = await Promise.all([
    discordRequest(`/guilds/${guildId}/channels`),
    discordRequest(`/guilds/${guildId}/roles`),
  ]);
  const texto = channels.filter(c => c.type === 0).length;
  const voz = channels.filter(c => c.type === 2).length;
  const cats = channels.filter(c => c.type === 4).length;
  const roleList = roles.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'nenhum';
  return `📊 **Estrutura atual:**\n📁 **Categorias:** ${cats}\n💬 **Canais de texto:** ${texto}\n🔊 **Canais de voz:** ${voz}\n🎭 **Cargos:** ${roleList}`;
}

async function handleZoar(options, resolved) {
  const userId = options.find(o => o.name === 'usuario')?.value;
  const efeitoNome = options.find(o => o.name === 'efeito')?.value || 'aleatorio';

  // Pega avatar do usuário
  const user = resolved?.users?.[userId];
  if (!user) return '❌ Usuário não encontrado!';

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;

  // Escolhe efeito
  let efeito;
  if (efeitoNome === 'aleatorio') {
    efeito = EFEITOS[Math.floor(Math.random() * EFEITOS.length)];
  } else {
    efeito = EFEITOS.find(e => e.nome.toLowerCase() === efeitoNome.toLowerCase()) || EFEITOS[0];
  }

  try {
    const imagemZoada = await zoarImagem(avatarUrl, efeito);
    return {
      type: 4,
      data: {
        content: `😂 <@${userId}> foi zoado com o efeito **${efeito.nome}**!`,
        embeds: [{
          image: { url: imagemZoada },
          color: 0xff4500,
          footer: { text: '😈 Construct Bot • Zoador de avatares' },
        }],
      },
    };
  } catch (e) {
    return `❌ Erro ao zoar: ${e.message}`;
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const rawBody = await req.text();
  let isValid = false;
  try { isValid = await verifyRequest(rawBody, signature, timestamp); } catch (e) {
    return new Response('Erro na verificação', { status: 401 });
  }
  if (!isValid) return new Response('Assinatura inválida', { status: 401 });
  const interaction = JSON.parse(rawBody);
  if (interaction.type === 1) return respond({ type: 1 });
  if (interaction.type === 2) {
    const { name, options = [], resolved } = interaction.data;
    const guildId = interaction.guild_id;
    try {
      let result;
      if (name === 'criar-canal') result = await handleCriarCanal(guildId, options);
      else if (name === 'criar-cargo') result = await handleCriarCargo(guildId, options);
      else if (name === 'criar-categoria') result = await handleCriarCategoria(guildId, options);
      else if (name === 'setup') result = await handleSetupCompleto(guildId, options);
      else if (name === 'listar') result = await handleListar(guildId);
      else if (name === 'zoar') {
        const res = await handleZoar(options, resolved);
        if (typeof res === 'object' && res.type) return respond(res);
        result = res;
      }
      else result = '❓ Comando não reconhecido.';
      return respond({ type: 4, data: { content: result, flags: 64 } });
    } catch (err) {
      console.error(err);
      return respond({ type: 4, data: { content: `❌ Erro: ${err.message}`, flags: 64 } });
    }
  }
  return new Response('Tipo desconhecido', { status: 400 });
}

export const config = { runtime: 'edge' };
