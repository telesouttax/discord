// ================================================
// Execute este script UMA VEZ para registrar
// os slash commands no Discord.
//
// Como rodar:
//   DISCORD_BOT_TOKEN=xxx DISCORD_APPLICATION_ID=yyy node scripts/register-commands.js
// ================================================

const fetch = require('node-fetch');
const COMMANDS = require('../lib/commands');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;

if (!TOKEN || !APP_ID) {
  console.error('❌ Defina DISCORD_BOT_TOKEN e DISCORD_APPLICATION_ID como variáveis de ambiente.');
  process.exit(1);
}

async function register() {
  console.log(`Registrando ${COMMANDS.length} comandos...`);

  const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(COMMANDS)
  });

  if (!res.ok) {
    const err = await res.json();
    console.error('❌ Erro ao registrar comandos:', err);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ ${data.length} comandos registrados com sucesso!`);
  data.forEach(cmd => console.log(`   /${cmd.name}`));
}

register();
