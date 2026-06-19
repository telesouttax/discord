const { discordRequest } = require('./discord');

// Channel type constants
const TEXT = 0;
const VOICE = 2;
const CATEGORY = 4;

function getOption(interaction, name) {
  return interaction.data.options?.find(o => o.name === name)?.value;
}

function hexToInt(hex) {
  if (!hex) return 0x99AAB5;
  return parseInt(hex.replace('#', ''), 16);
}

// ── /criar-canal ─────────────────────────────────────────────────────────────
async function criarCanal(interaction) {
  const guildId = interaction.guild_id;
  const nome = getOption(interaction, 'nome');
  const tipo = getOption(interaction, 'tipo');
  const privado = getOption(interaction, 'privado') || false;
  const limite = getOption(interaction, 'limite') || 0;

  const isVoz = tipo === 'voz';
  const channelType = isVoz ? VOICE : TEXT;

  const body = {
    name: nome.toLowerCase().replace(/\s+/g, '-'),
    type: channelType,
  };

  if (isVoz && limite > 0) body.user_limit = limite;

  if (privado) {
    body.permission_overwrites = [
      { id: guildId, type: 0, deny: '1024' }
    ];
  }

  const channel = await discordRequest('POST', `/guilds/${guildId}/channels`, body);
  const emoji = isVoz ? '🔊' : '💬';
  const privLabel = privado ? ' (privado)' : '';
  const limLabel = isVoz && limite > 0 ? ` · limite: ${limite}` : '';

  return {
    type: 4,
    data: {
      content: `${emoji} Canal **#${channel.name}** criado com sucesso!${privLabel}${limLabel}`
    }
  };
}

// ── /criar-cargo ─────────────────────────────────────────────────────────────
async function criarCargo(interaction) {
  const guildId = interaction.guild_id;
  const nome = getOption(interaction, 'nome');
  const cor = getOption(interaction, 'cor');
  const hoist = getOption(interaction, 'hoist') || false;

  const role = await discordRequest('POST', `/guilds/${guildId}/roles`, {
    name: nome,
    color: hexToInt(cor),
    hoist,
    mentionable: true
  });

  return {
    type: 4,
    data: {
      content: `🛡️ Cargo **${role.name}** criado com sucesso!`
    }
  };
}

// ── /criar-categoria ─────────────────────────────────────────────────────────
async function criarCategoria(interaction) {
  const guildId = interaction.guild_id;
  const nome = getOption(interaction, 'nome');

  const cat = await discordRequest('POST', `/guilds/${guildId}/channels`, {
    name: nome.toUpperCase(),
    type: CATEGORY
  });

  return {
    type: 4,
    data: {
      content: `📁 Categoria **${cat.name}** criada com sucesso!`
    }
  };
}

// ── /setup-servidor ──────────────────────────────────────────────────────────
const TEMPLATES = {
  gaming: {
    emoji: '🎮',
    categorias: ['📢 INFORMAÇÕES', '💬 GERAL', '🎮 JOGOS', '🔊 VOZ'],
    texto: [
      { nome: 'anuncios', privado: false },
      { nome: 'regras', privado: false },
      { nome: 'geral', privado: false },
      { nome: 'memes', privado: false },
      { nome: 'sugestoes', privado: false },
      { nome: 'clips-e-prints', privado: false }
    ],
    voz: [
      { nome: 'Lobby Geral', limite: 0 },
      { nome: 'Squad 1', limite: 4 },
      { nome: 'Squad 2', limite: 4 },
      { nome: 'AFK', limite: 0 }
    ],
    cargos: [
      { nome: 'Admin', cor: '#E74C3C' },
      { nome: 'Moderador', cor: '#E67E22' },
      { nome: 'Membro', cor: '#3498DB' },
      { nome: 'Novato', cor: '#99AAB5' }
    ]
  },
  comunidade: {
    emoji: '💼',
    categorias: ['📢 INFO', '💬 COMUNIDADE', '🎨 CRIATIVO'],
    texto: [
      { nome: 'boas-vindas', privado: false },
      { nome: 'regras', privado: false },
      { nome: 'anuncios', privado: false },
      { nome: 'apresentacoes', privado: false },
      { nome: 'geral', privado: false },
      { nome: 'off-topic', privado: false }
    ],
    voz: [
      { nome: 'Conversa Geral', limite: 0 },
      { nome: 'Eventos', limite: 0 }
    ],
    cargos: [
      { nome: 'Admin', cor: '#9B59B6' },
      { nome: 'Moderador', cor: '#3498DB' },
      { nome: 'Membro Ativo', cor: '#2ECC71' },
      { nome: 'Membro', cor: '#99AAB5' }
    ]
  },
  estudo: {
    emoji: '🎓',
    categorias: ['📢 AVISOS', '📚 ESTUDOS', '🤝 AJUDA'],
    texto: [
      { nome: 'anuncios', privado: false },
      { nome: 'geral', privado: false },
      { nome: 'duvidas', privado: false },
      { nome: 'recursos', privado: false },
      { nome: 'off-topic', privado: false }
    ],
    voz: [
      { nome: 'Sala de Estudos 1', limite: 10 },
      { nome: 'Sala de Estudos 2', limite: 10 },
      { nome: 'Grupo Livre', limite: 0 }
    ],
    cargos: [
      { nome: 'Professor', cor: '#F39C12' },
      { nome: 'Monitor', cor: '#3498DB' },
      { nome: 'Aluno', cor: '#2ECC71' }
    ]
  },
  dev: {
    emoji: '💻',
    categorias: ['📢 INFO', '💻 DEV', '🤝 SUPORTE', '🔊 VOZ'],
    texto: [
      { nome: 'anuncios', privado: false },
      { nome: 'geral', privado: false },
      { nome: 'code-review', privado: false },
      { nome: 'bugs-e-erros', privado: false },
      { nome: 'projetos', privado: false },
      { nome: 'recursos', privado: false },
      { nome: 'off-topic', privado: false }
    ],
    voz: [
      { nome: 'Dev Geral', limite: 0 },
      { nome: 'Pair Programming', limite: 2 },
      { nome: 'Reunião', limite: 10 }
    ],
    cargos: [
      { nome: 'Admin', cor: '#E74C3C' },
      { nome: 'Senior Dev', cor: '#9B59B6' },
      { nome: 'Dev', cor: '#3498DB' },
      { nome: 'Junior', cor: '#2ECC71' }
    ]
  }
};

async function setupServidor(interaction) {
  const guildId = interaction.guild_id;
  const template = getOption(interaction, 'template');
  const t = TEMPLATES[template];

  if (!t) {
    return { type: 4, data: { content: '❌ Template não encontrado.' } };
  }

  const criados = { categorias: 0, texto: 0, voz: 0, cargos: 0 };

  for (const cat of t.categorias) {
    await discordRequest('POST', `/guilds/${guildId}/channels`, { name: cat, type: CATEGORY });
    criados.categorias++;
  }

  for (const ch of t.texto) {
    await discordRequest('POST', `/guilds/${guildId}/channels`, {
      name: ch.nome,
      type: TEXT
    });
    criados.texto++;
  }

  for (const ch of t.voz) {
    const body = { name: ch.nome, type: VOICE };
    if (ch.limite > 0) body.user_limit = ch.limite;
    await discordRequest('POST', `/guilds/${guildId}/channels`, body);
    criados.voz++;
  }

  for (const r of t.cargos) {
    await discordRequest('POST', `/guilds/${guildId}/roles`, {
      name: r.nome,
      color: hexToInt(r.cor),
      hoist: true,
      mentionable: true
    });
    criados.cargos++;
  }

  return {
    type: 4,
    data: {
      content: [
        `${t.emoji} **Setup "${template}" concluído!**`,
        ``,
        `📁 ${criados.categorias} categorias criadas`,
        `💬 ${criados.texto} canais de texto criados`,
        `🔊 ${criados.voz} canais de voz criados`,
        `🛡️ ${criados.cargos} cargos criados`
      ].join('\n')
    }
  };
}

// ── /listar ──────────────────────────────────────────────────────────────────
async function listar(interaction) {
  const guildId = interaction.guild_id;
  const tipo = getOption(interaction, 'tipo') || 'tudo';

  const [channels, roles] = await Promise.all([
    discordRequest('GET', `/guilds/${guildId}/channels`),
    discordRequest('GET', `/guilds/${guildId}/roles`)
  ]);

  const lines = [];

  if (tipo === 'tudo' || tipo === 'texto') {
    const txt = channels.filter(c => c.type === TEXT);
    lines.push(`**💬 Canais de texto (${txt.length})**`);
    txt.forEach(c => lines.push(`  #${c.name}`));
  }

  if (tipo === 'tudo' || tipo === 'voz') {
    const voz = channels.filter(c => c.type === VOICE);
    lines.push(`**🔊 Canais de voz (${voz.length})**`);
    voz.forEach(c => lines.push(`  🔉 ${c.name}${c.user_limit ? ` (max ${c.user_limit})` : ''}`));
  }

  if (tipo === 'tudo' || tipo === 'cargos') {
    const r = roles.filter(r => r.name !== '@everyone');
    lines.push(`**🛡️ Cargos (${r.length})**`);
    r.forEach(r => lines.push(`  ${r.name}`));
  }

  return {
    type: 4,
    data: {
      content: lines.join('\n') || 'Nenhum resultado encontrado.',
      flags: 64
    }
  };
}

// ── /limpar-servidor ─────────────────────────────────────────────────────────
async function limparServidor(interaction) {
  const guildId = interaction.guild_id;
  const confirmar = getOption(interaction, 'confirmar');

  if (confirmar !== 'CONFIRMAR') {
    return {
      type: 4,
      data: {
        content: '❌ Para confirmar, escreva exatamente **CONFIRMAR** na opção confirmar.',
        flags: 64
      }
    };
  }

  const [channels, roles] = await Promise.all([
    discordRequest('GET', `/guilds/${guildId}/channels`),
    discordRequest('GET', `/guilds/${guildId}/roles`)
  ]);

  let removidos = 0;

  for (const ch of channels) {
    await discordRequest('DELETE', `/channels/${ch.id}`).catch(() => {});
    removidos++;
  }

  for (const role of roles) {
    if (role.name !== '@everyone') {
      await discordRequest('DELETE', `/guilds/${guildId}/roles/${role.id}`).catch(() => {});
      removidos++;
    }
  }

  return {
    type: 4,
    data: { content: `🗑️ Servidor limpo! ${removidos} itens removidos.` }
  };
}

module.exports = {
  'criar-canal': criarCanal,
  'criar-cargo': criarCargo,
  'criar-categoria': criarCategoria,
  'setup-servidor': setupServidor,
  'listar': listar,
  'limpar-servidor': limparServidor
};
