const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET;
const CANAL_CLIMA = "1517664111092039751";

// Coordenadas do Rio de Janeiro
const LAT = -22.9068;
const LON = -43.1729;

const DESCRICAO_CLIMA = {
  0: { texto: 'Céu limpo ☀️', emoji: '☀️' },
  1: { texto: 'Principalmente limpo 🌤️', emoji: '🌤️' },
  2: { texto: 'Parcialmente nublado ⛅', emoji: '⛅' },
  3: { texto: 'Nublado ☁️', emoji: '☁️' },
  45: { texto: 'Neblina 🌫️', emoji: '🌫️' },
  48: { texto: 'Neblina com geada 🌫️', emoji: '🌫️' },
  51: { texto: 'Chuvisco leve 🌦️', emoji: '🌦️' },
  53: { texto: 'Chuvisco moderado 🌦️', emoji: '🌦️' },
  55: { texto: 'Chuvisco intenso 🌧️', emoji: '🌧️' },
  61: { texto: 'Chuva leve 🌧️', emoji: '🌧️' },
  63: { texto: 'Chuva moderada 🌧️', emoji: '🌧️' },
  65: { texto: 'Chuva forte 🌧️', emoji: '🌧️' },
  80: { texto: 'Pancadas de chuva leves 🌦️', emoji: '🌦️' },
  81: { texto: 'Pancadas de chuva moderadas 🌦️', emoji: '🌦️' },
  82: { texto: 'Pancadas de chuva fortes ⛈️', emoji: '⛈️' },
  95: { texto: 'Tempestade ⛈️', emoji: '⛈️' },
  96: { texto: 'Tempestade com granizo ⛈️', emoji: '⛈️' },
  99: { texto: 'Tempestade forte com granizo ⛈️', emoji: '⛈️' },
};

function getClima(code) {
  return DESCRICAO_CLIMA[code] || { texto: 'Tempo variável 🌡️', emoji: '🌡️' };
}

function getUVLabel(uv) {
  if (uv <= 2) return '🟢 Baixo';
  if (uv <= 5) return '🟡 Moderado';
  if (uv <= 7) return '🟠 Alto';
  if (uv <= 10) return '🔴 Muito alto';
  return '🟣 Extremo';
}

function getChuvaLabel(mm) {
  if (mm === 0) return 'Sem chuva';
  if (mm < 5) return 'Chuva fraca';
  if (mm < 20) return 'Chuva moderada';
  return 'Chuva forte';
}

async function buscarClima() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset&timezone=America%2FSao_Paulo&forecast_days=3`;
  
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

export default async function handler(req) {
  const secret = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await buscarClima();
  const atual = data.current;
  const diario = data.daily;

  const climaAtual = getClima(atual.weather_code);
  const tempAtual = Math.round(atual.temperature_2m);
  const tempSensacao = Math.round(atual.apparent_temperature);
  const umidade = atual.relative_humidity_2m;
  const vento = Math.round(atual.wind_speed_10m);
  const uv = Math.round(atual.uv_index);

  // Hoje
  const maxHoje = Math.round(diario.temperature_2m_max[0]);
  const minHoje = Math.round(diario.temperature_2m_min[0]);
  const chuvaHoje = diario.precipitation_sum[0];
  const nascer = diario.sunrise[0]?.split('T')[1] || '';
  const por = diario.sunset[0]?.split('T')[1] || '';

  // Próximos 2 dias
  const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const hoje = new Date();
  
  const previsao3dias = [1, 2].map(i => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    const diaSemana = dias[d.getDay()];
    const c = getClima(diario.weather_code[i]);
    return `${c.emoji} **${diaSemana}** — ${Math.round(diario.temperature_2m_min[i])}°C / ${Math.round(diario.temperature_2m_max[i])}°C • ${getChuvaLabel(diario.precipitation_sum[i])}`;
  }).join('\n');

  const embed = {
    title: `${climaAtual.emoji} Previsão do Tempo — Rio de Janeiro`,
    description: `**${climaAtual.texto}**`,
    color: tempAtual >= 30 ? 0xff6600 : tempAtual >= 20 ? 0x3498db : 0x95a5a6,
    fields: [
      {
        name: '🌡️ Agora',
        value: `**${tempAtual}°C** (sensação ${tempSensacao}°C)\n💧 Umidade: ${umidade}%\n💨 Vento: ${vento} km/h`,
        inline: true,
      },
      {
        name: '📅 Hoje',
        value: `🔺 Máx: **${maxHoje}°C**\n🔻 Mín: **${minHoje}°C**\n🌧️ ${getChuvaLabel(chuvaHoje)} (${chuvaHoje}mm)`,
        inline: true,
      },
      {
        name: '☀️ Sol',
        value: `🌅 Nascer: **${nascer}**\n🌇 Pôr: **${por}**\n🔆 UV: ${getUVLabel(uv)}`,
        inline: true,
      },
      {
        name: '📆 Próximos dias',
        value: previsao3dias,
        inline: false,
      },
    ],
    footer: { text: '🌍 Dados: Open-Meteo • Rio de Janeiro, RJ' },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(`https://discord.com/api/v10/channels/${CANAL_CLIMA}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`);

  return new Response(JSON.stringify({
    ok: true,
    temp: `${tempAtual}°C`,
    clima: climaAtual.texto,
    horario: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export const config = { runtime: 'edge' };
