const COMMANDS = [
  {
    name: 'criar-canal',
    description: 'Cria um canal no servidor',
    options: [
      {
        name: 'nome',
        description: 'Nome do canal (ex: geral)',
        type: 3,
        required: true
      },
      {
        name: 'tipo',
        description: 'Tipo do canal',
        type: 3,
        required: true,
        choices: [
          { name: '💬 Texto', value: 'texto' },
          { name: '🔊 Voz', value: 'voz' }
        ]
      },
      {
        name: 'privado',
        description: 'Canal visível apenas para admins?',
        type: 5,
        required: false
      },
      {
        name: 'limite',
        description: 'Limite de usuários (só para voz, 0 = ilimitado)',
        type: 4,
        required: false,
        min_value: 0,
        max_value: 99
      }
    ]
  },
  {
    name: 'criar-cargo',
    description: 'Cria um cargo no servidor',
    options: [
      {
        name: 'nome',
        description: 'Nome do cargo (ex: Moderador)',
        type: 3,
        required: true
      },
      {
        name: 'cor',
        description: 'Cor em hexadecimal (ex: #FF5733)',
        type: 3,
        required: false
      },
      {
        name: 'hoist',
        description: 'Mostrar cargo separado na lista de membros?',
        type: 5,
        required: false
      }
    ]
  },
  {
    name: 'criar-categoria',
    description: 'Cria uma categoria para organizar canais',
    options: [
      {
        name: 'nome',
        description: 'Nome da categoria (ex: GERAL)',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'setup-servidor',
    description: '🚀 Configura o servidor completo de uma vez',
    options: [
      {
        name: 'template',
        description: 'Escolha um template pronto',
        type: 3,
        required: true,
        choices: [
          { name: '🎮 Gaming', value: 'gaming' },
          { name: '💼 Comunidade', value: 'comunidade' },
          { name: '🎓 Estudo', value: 'estudo' },
          { name: '💻 Dev / Tech', value: 'dev' }
        ]
      }
    ]
  },
  {
    name: 'listar',
    description: 'Lista canais e cargos do servidor',
    options: [
      {
        name: 'tipo',
        description: 'O que listar',
        type: 3,
        required: false,
        choices: [
          { name: '📋 Tudo', value: 'tudo' },
          { name: '💬 Canais de texto', value: 'texto' },
          { name: '🔊 Canais de voz', value: 'voz' },
          { name: '🛡️ Cargos', value: 'cargos' }
        ]
      }
    ]
  },
  {
    name: 'limpar-servidor',
    description: '⚠️ Remove todos os canais e cargos criados pelo bot',
    options: [
      {
        name: 'confirmar',
        description: 'Digite CONFIRMAR para executar',
        type: 3,
        required: true
      }
    ]
  }
];

module.exports = COMMANDS;
