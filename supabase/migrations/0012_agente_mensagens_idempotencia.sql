-- Fase 4 (fix): torna o processamento de mensagens do webhook idempotente.
--
-- Antes, uma falha transiente na geração da resposta (ex.: rate limit do
-- provider de IA) era engolida pelo webhook, que sempre respondia 200 pra
-- Evolution — então a mensagem do lead era perdida pra sempre, sem retry e
-- sem log visível pro membro. Agora o webhook (ver route.ts) devolve erro
-- nesse caso, e a Evolution já reenvia automaticamente (com backoff, até 10x)
-- até conseguir. Essas colunas evitam duplicar a mensagem do lead ou gerar
-- duas respostas quando a mesma entrega é reprocessada.
alter table agente_mensagens
  add column whatsapp_message_id text,
  add column processado boolean not null default true;

-- Mensagens antigas (antes desta migration) não têm id da Evolution associado
-- e já foram processadas; default true acima cobre isso pra linhas existentes.
-- Novas linhas 'lead' setam processado=false até a resposta ser enviada.

create unique index idx_agente_mensagens_whatsapp_id
  on agente_mensagens (membro_id, telefone_lead, whatsapp_message_id)
  where whatsapp_message_id is not null;
