# 🤖 Discord Setup Bot

Bot de Discord hospedado no **Vercel** via **GitHub** que configura servidores inteiros via Slash Commands — sem instalar nada.

## ✅ Comandos disponíveis

| Comando | O que faz |
|---|---|
| `/setup template:comunidade` | Cria categorias, canais e cargos de uma vez |
| `/setup template:gaming` | Template para servidores de jogos |
| `/setup template:estudo` | Template para grupos de estudos |
| `/criar-canal nome:geral tipo:texto` | Cria um canal de texto |
| `/criar-canal nome:Voz tipo:voz limite:10` | Cria canal de voz com limite |
| `/criar-cargo nome:Admin cor:#e74c3c` | Cria um cargo colorido |
| `/criar-categoria nome:INFORMAÇÕES` | Cria uma categoria |
| `/listar` | Mostra todos os canais e cargos |

---

## 🚀 Passo a passo completo

### 1. Criar o bot no Discord Developer Portal

1. Acesse https://discord.com/developers/applications
2. Clique em **New Application** → dê um nome → **Create**
3. Vá em **Bot** → clique em **Add Bot**
4. Ative os Privileged Intents (Presence, Server Members, Message Content)
5. Clique em **Reset Token** → copie o token
6. Volte em **General Information** → copie o **Application ID** e a **Public Key**

### 2. Fork + Deploy no Vercel

1. Faça **fork** deste repositório no GitHub
2. Acesse https://vercel.com → **New Project** → importe o fork
3. Em **Environment Variables**, adicione:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_PUBLIC_KEY`
   - `DISCORD_APP_ID`
4. Clique em **Deploy** e copie a URL gerada

### 3. Registrar a URL no Discord

No Developer Portal → **General Information** → **Interactions Endpoint URL**:
```
https://seu-bot.vercel.app/api/interactions
```
Salve — o Discord vai validar automaticamente.

### 4. Registrar os Slash Commands (só uma vez)

```bash
git clone https://github.com/seu-usuario/discord-setup-bot
cd discord-setup-bot
npm install
export DISCORD_BOT_TOKEN=seu_token
export DISCORD_APP_ID=seu_app_id
node register-commands.js
```

### 5. Convidar o bot para o servidor

```
https://discord.com/oauth2/authorize?client_id=SEU_APP_ID&scope=bot+applications.commands&permissions=8
```

### 6. Usar!

Digite `/setup` no Discord e escolha um template. Pronto! 🎉

---

## 📁 Estrutura do projeto

```
discord-setup-bot/
├── api/
│   └── interactions.js    # Webhook do Discord (Edge Function)
├── public/
│   └── index.html         # Página do bot
├── register-commands.js   # Registra os slash commands
├── vercel.json
├── package.json
└── .env.example
```

## 🔒 Variáveis de ambiente

| Variável | Onde encontrar |
|---|---|
| `DISCORD_BOT_TOKEN` | Developer Portal → Bot → Token |
| `DISCORD_PUBLIC_KEY` | Developer Portal → General Information → Public Key |
| `DISCORD_APP_ID` | Developer Portal → General Information → Application ID |
