# Evolution API — deploy na VPS Hostinger

Stack: Evolution API + Postgres (dados da própria Evolution, separado do Supabase do app) + Redis (cache) + Caddy (proxy reverso com TLS automático via Let's Encrypt).

## Pré-requisitos

- VPS já provisionada com o template **Docker Application** (Ubuntu + Docker + Docker Compose pré-instalados).
- Um subdomínio (ex. `evolution.seudominio.com.br`) com registro **DNS tipo A** apontando para o IP público da VPS. Confirme a propagação antes do passo 4:
  ```bash
  dig +short evolution.seudominio.com.br
  ```
  deve retornar o IP da VPS.
- Firewall (UFW) liberando só `22`, `80` e `443` (feito no hardening inicial da VPS).

## 1. Copiar os arquivos para a VPS

Do seu computador (dentro desta pasta):

```bash
scp docker-compose.yml Caddyfile .env.example usuario@IP_DA_VPS:~/evolution-api/
```

(crie a pasta antes se necessário: `ssh usuario@IP_DA_VPS "mkdir -p ~/evolution-api"`)

## 2. Configurar o .env real

Já conectado na VPS via SSH:

```bash
cd ~/evolution-api
mv .env.example .env
nano .env
```

Preencha:
- `EVOLUTION_DOMAIN` — o subdomínio que você apontou.
- `CADDY_EMAIL` — seu e-mail.
- `EVOLUTION_API_KEY` — gere com `openssl rand -hex 32`. **Guarde esse valor** — ele vai para `EVOLUTION_API_KEY` no `.env.local` do app Next.js também.
- `POSTGRES_PASSWORD` — gere com `openssl rand -hex 24`.

## 3. Subir a stack

```bash
docker compose up -d
```

## 4. Verificar

```bash
docker compose logs -f caddy
```
Aguarde a linha confirmando que o certificado foi obtido (procure por "certificate obtained successfully" ou similar). Se falhar, o motivo quase sempre é DNS não propagado ainda — espere alguns minutos e tente de novo (`docker compose restart caddy`).

```bash
docker compose logs -f api
```
Confirme que subiu sem erros de conexão com Postgres/Redis.

Teste de fora da VPS (do seu computador):

```bash
curl https://evolution.seudominio.com.br/instance/fetchInstances \
  -H "apikey: SEU_EVOLUTION_API_KEY"
```
Deve retornar `[]` (200 OK, nenhuma instância criada ainda). Se der timeout/erro de certificado, revise o passo 4.

## 5. Ligar ao app Next.js

No `.env.local` (e nas env vars do deploy do app, quando for pra produção):

```
EVOLUTION_API_URL=https://evolution.seudominio.com.br
EVOLUTION_API_KEY=<o mesmo valor do .env da VPS>
EVOLUTION_WEBHOOK_SECRET=<gere OUTRO valor aleatório, diferente do EVOLUTION_API_KEY — openssl rand -hex 32>
APP_URL=<URL pública do app Next.js>
```

**Importante sobre `APP_URL`**: é para essa URL que a Evolution API vai mandar os webhooks (QR code, conexão, mensagens). Ela precisa ser alcançável pela própria VPS pela internet — `http://localhost:3000` só funciona se o Next.js já estiver deployado (ex. Vercel) ou se você expuser o ambiente local via túnel (ngrok, Cloudflare Tunnel) durante testes.

## Manutenção

- Atualizar a imagem: `docker compose pull && docker compose up -d`
- Logs: `docker compose logs -f <serviço>` (`api`, `postgres`, `redis`, `caddy`)
- Backup: o volume `postgres_data` guarda os dados da Evolution; `evolution_instances` guarda as credenciais de sessão do Baileys por instância — perder esse volume derruba todas as conexões de WhatsApp (precisa reconectar via QR de novo).
