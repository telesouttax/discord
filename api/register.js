const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APP_ID;
const GUILD_ID = '1517543745590005771';
const REGISTER_SECRET = process.env.REGISTER_SECRET;

const commands = [
  {
    name: 'setup',
    description: 'Configura o servidor completo com um template pronto',
    options: [{ name: 'template', description: 'Escolha o template', type: 3, required: true, choices: [{ name: '🚀 Completo', value: 'completo' }, { name: '😎 Amigos', value: 'amigos' }] }],
  },
  {
    name: 'criar-canal',
    description: 'Cria um novo canal no servidor',
    options: [
      { name: 'nome', description: 'Nome do canal', type: 3, required: true },
      { name: 'tipo', description: 'Tipo do canal', type: 3, required: true, choices: [{ name: '💬 Texto', value: 'texto' }, { name: '🔊 Voz', value: 'voz' }, { name: '📢 Anúncio', value: 'anuncio' }] },
      { name: 'limite', description: 'Limite de usuários (só voz)', type: 4, required: false },
    ],
  },
  {
    name: 'criar-cargo',
    description: 'Cria um novo cargo no servidor',
    options: [
      { name: 'nome', description: 'Nome do cargo', type: 3, required: true },
      { name: 'cor', description: 'Cor em hex (ex: #ff0000)', type: 3, required: false },
      { name: 'mencionar', description: 'Pode ser mencionado?', type: 5, required: false },
    ],
  },
  {
    name: 'criar-categoria',
    description: 'Cria uma nova categoria',
    options: [{ name: 'nome', description: 'Nome da categoria', type: 3, required: true }],
  },
  {
    name: 'listar',
    description: 'Lista todos os canais e cargos do servidor',
  },
  {
    name: 'zoar',
    description: '😂 Aplica efeitos malucos no avatar de um usuário',
    options: [
      { name: 'usuario', description: 'Quem você quer zoar?', type: 6, required: true },
      {
        name: 'efeito',
        description: 'Escolha o efeito (padrão: aleatório)',
        type: 3,
        required: false,
        choices: [
          { name: '🎲 Aleatório', value: 'aleatorio' },
          { name: '😵 Distorcido', value: 'Distorcido' },
          { name: '🪞 Espelhado', value: 'Espelhado' },
          { name: '🟫 Pixelado', value: 'Pixelado' },
          { name: '😈 Negativo', value: 'Negativo' },
          { name: '🎨 Cartoon', value: 'Cartoon' },
          { name: '🟤 Sépia', value: 'Sépia' },
          { name: '🌫️ Blur extremo', value: 'Blur extremo' },
          { name: '🖼️ Oil Paint', value: 'Oil Paint' },
          { name: '🎭 Colorido maluco', value: 'Colorido maluco' },
        ],
      },
    ],
  },
];

export default async function handler(req) {
  const secret = req.headers.get('x-register-secret');
  if (secret !== REGISTER_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, message: `${data.length} comandos registrados!`, comandos: data.map(c => '/' + c.name) }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };
