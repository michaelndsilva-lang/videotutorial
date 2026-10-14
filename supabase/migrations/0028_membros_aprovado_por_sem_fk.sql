-- A FK membros.aprovado_por -> usuarios (0027) criou uma segunda relação entre
-- membros e usuarios, e todo embed `usuarios(...)` a partir de membros passou a
-- falhar no PostgREST ("more than one relationship was found"). Fica só a coluna.
alter table membros drop constraint membros_aprovado_por_fkey;
comment on column membros.aprovado_por is 'id do admin (usuarios.id) que aprovou. Sem FK de propósito: uma segunda FK membros->usuarios deixa ambíguos os embeds usuarios(...) do PostgREST.';
