# Re-registra o webhook de uma ou mais instancias Evolution com os nomes de
# evento no formato que a Evolution API v2 valida (UPPER_SNAKE) e, com -Restart,
# reinicia a instancia para forcar um connection.update que ressincroniza a
# linha em whatsapp_sessions.
#
# Necessario para instancias criadas antes do fix f66e614: reconectar pela UI
# nao re-registra o webhook (a instancia ja existe -> so chama /instance/connect).
#
# Uso:
#   ./scripts/fix-evolution-webhook.ps1 -Instances membro-<uuid>[,membro-<uuid>...] [-Restart]
#
# Le EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_WEBHOOK_SECRET e APP_URL do
# .env.local na raiz do repositorio.

param(
  [Parameter(Mandatory = $true)][string[]]$Instances,
  [switch]$Restart
)

$ErrorActionPreference = 'Stop'

$envPath = Join-Path $PSScriptRoot '..\.env.local'
if (-not (Test-Path $envPath)) { throw ".env.local nao encontrado em $envPath" }

$cfg = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$') { $cfg[$Matches[1]] = $Matches[2] }
}

$base   = $cfg['EVOLUTION_API_URL'].TrimEnd('/')
$key    = $cfg['EVOLUTION_API_KEY']
$secret = $cfg['EVOLUTION_WEBHOOK_SECRET']
$appUrl = $cfg['APP_URL'].TrimEnd('/')
if (-not ($base -and $key -and $secret -and $appUrl)) {
  throw "Falta EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_WEBHOOK_SECRET / APP_URL no .env.local"
}

$headers = @{ apikey = $key }
# Corpo precisa do wrapper { webhook: { ... } }; o formato plano retorna HTTP 400 na v2.3.7.
$body = @{ webhook = @{
    enabled         = $true
    url             = "$appUrl/api/whatsapp/webhook"
    webhookByEvents  = $false
    webhookBase64    = $false
    headers          = @{ 'x-webhook-secret' = $secret }
    events           = @('QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT')
  } } | ConvertTo-Json -Depth 6

foreach ($inst in $Instances) {
  Write-Host "== $inst =="
  $r = Invoke-RestMethod -Method Post -Uri "$base/webhook/set/$inst" -Headers $headers -ContentType 'application/json' -Body $body
  Write-Host ("  events -> " + ($r.events -join ', '))
  if ($Restart) {
    $s = Invoke-RestMethod -Method Post -Uri "$base/instance/restart/$inst" -Headers $headers
    Write-Host ("  restart -> " + $s.instance.state)
  }
}
