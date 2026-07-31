-- Nome do consultor exibido pelo agente de IA nas conversas com o lead
-- (ex.: "Aqui é o Carlos, consultor da Atlântica"). Editável pelo próprio
-- membro, no mesmo padrão de modo_agente_ativo.
alter table membros
  add column nome_agente text;
