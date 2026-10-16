-- Página do consultor no formato "link na bio" (documento de 2026-10-16):
-- nome editável na própria página, e-mail obrigatório no formulário,
-- URL de origem + UTM no registro do lead e status do envio ao CRM externo
-- (opcional; desligado até existir CRM_WEBHOOK_URL na Vercel).

alter table paginas
  add column nome_exibicao text check (nome_exibicao is null or char_length(nome_exibicao) between 2 and 80);

alter table lead_consentimentos
  add column email text check (email is null or char_length(email) <= 254),
  add column url_origem text check (url_origem is null or char_length(url_origem) <= 1000),
  add column utm jsonb,
  add column crm_enviado_em timestamptz,
  add column crm_erro text;
