module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Setup Bot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #23272A; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; }
    .card { background: #2C2F33; border-radius: 12px; padding: 2.5rem; max-width: 520px; width: 100%; text-align: center; }
    .logo { font-size: 48px; margin-bottom: 1rem; }
    h1 { font-size: 24px; margin-bottom: 0.5rem; color: #fff; }
    p { color: #99AAB5; font-size: 15px; line-height: 1.6; margin-bottom: 1.5rem; }
    .commands { background: #23272A; border-radius: 8px; padding: 1.25rem; text-align: left; margin-bottom: 1.5rem; }
    .cmd { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #2C2F33; }
    .cmd:last-child { border-bottom: none; }
    .cmd-name { color: #5865F2; font-family: monospace; font-size: 14px; min-width: 160px; font-weight: 600; }
    .cmd-desc { color: #99AAB5; font-size: 13px; }
    .badge { display: inline-block; background: #5865F2; color: white; font-size: 12px; padding: 4px 12px; border-radius: 20px; margin-bottom: 1.5rem; }
    footer { color: #4f545c; font-size: 12px; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🤖</div>
    <h1>Discord Setup Bot</h1>
    <span class="badge">✅ Online no Vercel</span>
    <p>Configure seu servidor Discord diretamente pelo chat, sem instalar nada. Use os Slash Commands abaixo no seu servidor.</p>
    <div class="commands">
      <div class="cmd"><span class="cmd-name">/criar-canal</span><span class="cmd-desc">Cria um canal de texto ou voz</span></div>
      <div class="cmd"><span class="cmd-name">/criar-cargo</span><span class="cmd-desc">Cria um cargo com nome e cor</span></div>
      <div class="cmd"><span class="cmd-name">/criar-categoria</span><span class="cmd-desc">Cria uma categoria de canais</span></div>
      <div class="cmd"><span class="cmd-name">/setup-servidor</span><span class="cmd-desc">Setup completo com um comando só</span></div>
      <div class="cmd"><span class="cmd-name">/listar</span><span class="cmd-desc">Lista canais e cargos do servidor</span></div>
      <div class="cmd"><span class="cmd-name">/limpar-servidor</span><span class="cmd-desc">Remove todos os canais e cargos</span></div>
    </div>
    <footer>Hospedado no Vercel · discord-setup-bot</footer>
  </div>
</body>
</html>`);
};
