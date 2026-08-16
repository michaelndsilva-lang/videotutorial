-- A revogação da 0015 tirou EXECUTE de anon/authenticated, mas o grant
-- implícito pra PUBLIC (que Postgres concede por padrão em toda função nova,
-- e que qualquer role — incluindo anon/authenticated — herda) continuava de
-- pé, então o advisor de segurança seguiu acusando a função como chamável
-- sem login. Revoga de PUBLIC também, deixando só postgres/service_role.
revoke execute on function conteudo_registrar_geracao(
  uuid, objetivo_conteudo, formato_conteudo, text, text, jsonb, int, int, text
) from public;
