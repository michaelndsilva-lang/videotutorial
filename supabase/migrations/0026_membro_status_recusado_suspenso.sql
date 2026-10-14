-- Fase 0 (controle de acesso): novos status do membro.
-- 'ativo' continua sendo o status de "aprovado" (não renomeado para não quebrar
-- o que já existe). 'inativo' fica como legado: a migration 0027 converte para
-- 'suspenso' e o app deixa de usá-lo.
-- Fica numa migration própria porque um valor novo de enum só pode ser usado
-- (em policies, updates, defaults) depois que a transação que o criou commitou.
alter type membro_status add value if not exists 'recusado';
alter type membro_status add value if not exists 'suspenso';
