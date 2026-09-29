-- Gênero gramatical que o agente de IA deve usar ao falar de si mesmo em
-- português (ex.: "consultora"/"ocupada" vs "consultor"/"ocupado"). Sem isso o
-- modelo não tem como saber e por padrão escreve no masculino genérico,
-- mesmo quando o nome do agente (nome_agente) é de uma consultora — bug
-- relatado pela membro Syndel Rates Santos (agente respondendo como homem).
-- Nullable: membro que ainda não configurou cai no comportamento atual
-- (nenhuma instrução extra de gênero é injetada no prompt).
alter table membros
  add column genero_agente text
    check (genero_agente in ('masculino', 'feminino'));
