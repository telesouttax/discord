const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APP_ID;

const commands = [
  {
    name: 'setup',
    description: 'Configura o servidor completo com um template pronto',
    options: [
      {
        name: 'template',
        description: 'Escolha o template do servidor',
        type: 3,
        required: true,
        choices: [
          { name: '🏘️ Comunidade geral', value: 'comunidade' },
          { name: '🎮 Gaming / jogos', value: 'gaming' },
          { name: '📚 Grupo de estudos', value: 'estudo' },
        ],
      },
    ],
  },
  {
    name: 'criar-canal',
    description: 'Cria um novo canal no servidor',
    options: [
      { name: 'nome', description: 'Nome do canal', type: 3, required: true },
      {
        name: 'tipo',
        description: 'Tipo do canal',
        type: 3,
        required: true,
        choices: [
          { name: '💬 Texto', value: 'texto' },
          { name: '🔊 Voz', value: 'voz' },
          { name: '📢 Anúncio', value: 'anuncio' },
        ],
      },
      { name: 'limite', description: 'Limite de usuários (só voz, 0 = ilimitado)', type: 4, required: false },
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
    description: 'Cria uma nova categoria para organizar canais',
    options: [
      { name: 'nome', description: 'Nome da categoria', type: 3, required: true },
    ],
  },
  {
    name: 'listar',
    description: 'Lista todos os canais e cargos do servidor',
  },
];

export default async function handler(req) {
  const secret = req.headers.get('x-register-secret');
  if (secret !== process.env.REGISTER_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(
    `https://discord.com/api/v10/applications/${APP_ID}/commands`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await res.json();
  const names = data.map(c => '/' + c.name);
  return new Response(
    JSON.stringify({ ok: true, message: `${data.length} comandos registrados!`, comandos: names }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

export const config = { runtime: 'edge' };
