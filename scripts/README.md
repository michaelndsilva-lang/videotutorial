# scripts

Utilitários operacionais. Todos leem credenciais do `.env.local` na raiz — nada de segredo hardcoded.

## `fix-evolution-webhook.ps1`

Re-registra o webhook de instâncias Evolution com os nomes de evento em
`UPPER_SNAKE` (`QRCODE_UPDATED` / `CONNECTION_UPDATE` / `MESSAGES_UPSERT`).

A Evolution API v2 **aceita** o cadastro com nomes em minúsculo pontuado
(`messages.upsert`) mas **não entrega evento nenhum** — o QR não atualiza, a
conexão nunca sincroniza (`whatsapp_sessions` preso em `aguardando_qr`) e as
mensagens do lead não chegam ao agente. O corpo entregue no webhook continua
usando a forma pontuada, que é o que a rota trata.

Instâncias criadas a partir do commit `f66e614` já nascem corretas. Este script
é para consertar as antigas — reconectar pela UI **não** resolve, porque a
instância já existe e o app só chama `/instance/connect`, sem re-registrar o
webhook.

```powershell
# uma instância, com restart para ressincronizar a sessão
./scripts/fix-evolution-webhook.ps1 -Instances membro-95d04e33-... -Restart

# várias de uma vez
./scripts/fix-evolution-webhook.ps1 -Instances membro-aaa,membro-bbb
```

O `instance_name` de cada membro é `membro-<usuario_id>` — veja
`whatsapp_sessions.instance_name` no Supabase.
