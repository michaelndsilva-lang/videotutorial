-- A seção "Plataforma" saiu de /admin/configuracoes e foi para /membro/perfil,
-- editável pelo próprio membro (não só admin). Ajusta a policy de escrita:
-- qualquer usuário autenticado pode dar update na linha única de configuracoes_gerais.
drop policy configuracoes_gerais_write on configuracoes_gerais;

create policy configuracoes_gerais_update on configuracoes_gerais for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy configuracoes_gerais_admin_all on configuracoes_gerais for all
  using (private.is_admin())
  with check (private.is_admin());
