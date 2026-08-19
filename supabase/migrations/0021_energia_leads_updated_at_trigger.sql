-- energia_leads.updated_at tinha default now() mas nada atualizava no upsert
-- de etapa — ficava congelado na data de criação da linha, inútil pra saber
-- há quanto tempo um lead está parado numa etapa. Reusa o trigger genérico já
-- usado por configuracoes_gerais/perfil_conteudo (movido pro schema private
-- em 0002_harden_internal_functions).
create trigger energia_leads_set_updated_at
  before update on energia_leads
  for each row execute function private.set_updated_at();
