# Página do consultor (link na bio)

Endereço público: `atlprospect.com/c/<slug>`. Cada consultor edita a sua em
**Minha página** (`/membro/minha-pagina`).

## O que o consultor edita

| Campo | Onde aparece |
| --- | --- |
| Foto (com ajuste de enquadramento) | Círculo dourado abaixo da logomarca |
| Nome na página | Destaque em fonte serifada |
| Endereço da página (slug) | Link `atlprospect.com/c/<slug>` |
| Apresentação (até 400 caracteres, linha em branco separa parágrafos) | Texto abaixo do nome. Vazio = texto padrão |
| Página publicada | Desmarcado, o link mostra "página não encontrada" |

## Para onde vai o lead

1. **Kanban do consultor** (CRM principal): card novo na 1ª coluna do quadro de
   recrutamento, origem `pagina`, com e-mail, origem e campanha (UTM) nas observações.
2. **Registro LGPD** em `lead_consentimentos`: nome, WhatsApp, e-mail, texto exato
   exibido, IP anonimizado (hash), URL de origem e UTM, data/hora do servidor.
3. **CRM externo (opcional, desligado)**: ver abaixo.

Proteções: campo invisível contra robôs, envio rápido demais (< 3 s) ignorado,
limite de 5 envios por IP/hora, mesmo WhatsApp no mesmo consultor em 24 h não
duplica o card, botão bloqueado durante o envio.

## Ativar o CRM externo

Código: `src/lib/leads/crm-externo.ts`. Nada é enviado enquanto
`CRM_WEBHOOK_URL` não existir.

1. Vercel → projeto → Settings → Environment Variables (Production):
   - `CRM_WEBHOOK_URL`: endpoint que recebe o lead (POST JSON)
   - `CRM_WEBHOOK_TOKEN` (opcional): vai como `Authorization: Bearer <token>`
2. Novo deploy.

Corpo enviado hoje (provisório; ajustar `montarCorpo` quando a documentação da
API chegar):

```json
{
  "nome_completo": "...",
  "whatsapp": "5584999999999",
  "email": "...",
  "id_consultor": "<uuid do membro>",
  "slug_consultor": "maria-silva",
  "nome_consultor": "Maria Silva",
  "data_hora": "2026-10-16T14:00:00.000Z",
  "url_origem": "https://atlprospect.com/c/maria-silva?utm_source=instagram",
  "utm": { "utm_source": "instagram" },
  "origem": "site apresentação / bio link"
}
```

Cabeçalho `Idempotency-Key` = id do consentimento (o mesmo nas tentativas).
São até 3 tentativas (0 s, 1,5 s, 5 s) para erro 5xx/408/429/timeout, e o
resultado fica em `lead_consentimentos.crm_enviado_em` / `crm_erro`.

**Falta para ativar:** documentação da API (URL, autenticação, nomes dos
campos) e, se o CRM tiver um "id do grupo/membro" próprio, onde cadastrar esse
id por consultor.

## Indexação

As páginas estão com `noindex` (decisão de 2026-10-14). Para liberar o Google,
trocar `robots` em `generateMetadata` de `src/app/c/[slug]/page.tsx`.
