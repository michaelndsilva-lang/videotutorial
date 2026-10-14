-- Fase 3: agendador do lembrete de eventos (1 h antes). Vercel Hobby só tem
-- cron diário, então o pg_cron chama o endpoint a cada 10 min (mesmo padrão
-- do job 'agenda-lembretes'). O Bearer vem do Vault ('atl_eventos_cron_secret'),
-- igual ao EVENTOS_CRON_SECRET da Vercel — o valor não fica no repositório.
select cron.schedule(
  'atl-eventos-lembretes',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://atlprospect.com/api/cron/eventos',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'atl_eventos_cron_secret')),
    timeout_milliseconds := 30000
  );
  $$
);
