-- Motor de Conteúdo IA (ATL Prospect) — Fase 1: schema, RLS e seed dos templates.
-- Segue o padrão do projeto: nomes em português, RLS via private.is_admin(),
-- triggers de updated_at via private.set_updated_at() (ambas movidas para o
-- schema private na 0002, já existem desde a 0001).

-- ============================================================================
-- ENUMS
-- ============================================================================
create type objetivo_conteudo as enum (
  'recrutamento',
  'energia_assinatura',
  'venda_produto',
  'autoridade_pessoal'
);
create type formato_conteudo as enum (
  'reels',
  'legenda_post',
  'stories',
  'whatsapp_prospeccao'
);
create type tom_voz_conteudo as enum (
  'inspirador',
  'direto',
  'descontraido',
  'autoridade'
);
create type nivel_experiencia_conteudo as enum (
  'iniciante',
  'intermediario',
  'lider'
);
create type tipo_credito as enum ('recarga', 'consumo', 'ajuste_admin');

-- ============================================================================
-- PERFIL_CONTEUDO (preenchido 1x pelo membro, libera o motor)
-- ============================================================================
create table perfil_conteudo (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  nome_exibicao text,
  whatsapp text,
  cidade text,
  publico_alvo text,
  tom_de_voz tom_voz_conteudo,
  nivel_experiencia nivel_experiencia_conteudo,
  onboarding_completo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table perfil_conteudo enable row level security;

create policy perfil_conteudo_select on perfil_conteudo for select
  using (usuario_id = auth.uid() or private.is_admin());
create policy perfil_conteudo_update on perfil_conteudo for update
  using (usuario_id = auth.uid() or private.is_admin())
  with check (usuario_id = auth.uid() or private.is_admin());
create policy perfil_conteudo_insert on perfil_conteudo for insert
  with check (usuario_id = auth.uid() or private.is_admin());
create policy perfil_conteudo_admin_all on perfil_conteudo for all
  using (private.is_admin())
  with check (private.is_admin());

create trigger perfil_conteudo_set_updated_at
  before update on perfil_conteudo
  for each row execute function private.set_updated_at();

-- ============================================================================
-- CONTEUDO_PROMPT_TEMPLATES (coração do sistema — só admin lê/edita, direto
-- ou via client service-role; a rota de geração busca o template com o
-- client admin, então não precisa de policy de select para authenticated)
-- ============================================================================
create table conteudo_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  objetivo objetivo_conteudo not null,
  formato formato_conteudo not null,
  system_prompt text not null,
  ativo boolean not null default true,
  versao int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table conteudo_prompt_templates enable row level security;

-- Só pode existir um template ativo por par (objetivo, formato) — é o que a
-- rota de geração busca. Versões antigas ficam com ativo = false (histórico).
create unique index conteudo_prompt_templates_ativo_unico
  on conteudo_prompt_templates (objetivo, formato)
  where ativo;

create policy conteudo_prompt_templates_admin_all on conteudo_prompt_templates for all
  using (private.is_admin())
  with check (private.is_admin());

create trigger conteudo_prompt_templates_set_updated_at
  before update on conteudo_prompt_templates
  for each row execute function private.set_updated_at();

-- ============================================================================
-- CONTEUDO_GERACOES (histórico/biblioteca do membro)
-- Escrita (insert/update de favorito) feita pelo client service-role a partir
-- de server actions já autenticadas — igual ao padrão usado para aprovar
-- membro/editar prompt em admin/agentes. RLS aqui cobre leitura própria e do
-- admin (biblioteca + auditoria), sem policy de insert/update para
-- authenticated (superfície de escrita mínima).
-- ============================================================================
create table conteudo_geracoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  objetivo objetivo_conteudo not null,
  formato formato_conteudo not null,
  tema_livre text,
  prompt_final text not null,
  resultado jsonb,
  favorito boolean not null default false,
  tokens_consumidos int,
  created_at timestamptz not null default now()
);
alter table conteudo_geracoes enable row level security;

create policy conteudo_geracoes_select on conteudo_geracoes for select
  using (usuario_id = auth.uid() or private.is_admin());
create policy conteudo_geracoes_admin_all on conteudo_geracoes for all
  using (private.is_admin())
  with check (private.is_admin());

create index conteudo_geracoes_usuario_idx on conteudo_geracoes (usuario_id, created_at desc);

-- ============================================================================
-- CREDITOS_EXTRATO (ledger append-only — sem policy de update/delete pra
-- ninguém além do admin; toda escrita normal é via client service-role)
-- ============================================================================
create table creditos_extrato (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  tipo tipo_credito not null,
  quantidade int not null,
  saldo_apos int not null,
  referencia_id uuid references conteudo_geracoes(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table creditos_extrato enable row level security;

create policy creditos_extrato_select on creditos_extrato for select
  using (usuario_id = auth.uid() or private.is_admin());
create policy creditos_extrato_admin_all on creditos_extrato for all
  using (private.is_admin())
  with check (private.is_admin());

create index creditos_extrato_usuario_idx on creditos_extrato (usuario_id, created_at desc);

-- ============================================================================
-- CONFIGURACOES_GERAIS: modelo de cobrança do motor de conteúdo (ainda não
-- decidido — fica em config editável pelo admin, não hardcoded).
-- ============================================================================
alter table configuracoes_gerais
  add column modo_credito text not null default 'plataforma'
    check (modo_credito in ('plataforma', 'chave_propria', 'ilimitado')),
  add column creditos_mensais_padrao int not null default 30,
  add column custo_por_geracao int not null default 1,
  add column modelo_ia_conteudo text not null default 'google/gemini-2.5-flash-lite';

-- ============================================================================
-- SEED: 16 templates (4 objetivos x 4 formatos), todos na versão 1 e ativos.
-- Placeholders {{nome_exibicao}}, {{cidade}}, {{publico_alvo}}, {{tom_de_voz}},
-- {{nivel_experiencia}}, {{tema_livre}} são resolvidos com os dados de
-- perfil_conteudo na hora da geração (Fase 2). {{objetivo}} e {{formato}} já
-- vêm resolvidos abaixo, por combinação. O schema de saída JSON por formato é
-- injetado pelo código (não duplicado em cada linha), igual ao padrão de
-- src/lib/ai/agente.ts que compõe o system prompt em camadas.
-- ============================================================================
create function conteudo_seed_base_prompt(p_objetivo_label text, p_formato_label text)
returns text
language sql
immutable
as $$
  select format($sql$Você é um estrategista de conteúdo especializado em marketing de rede, copywriting de resposta direta e criação de conteúdo para Instagram no mercado brasileiro.

Você está escrevendo NO LUGAR de um consultor da Atlântica Natural. O conteúdo sai no perfil dele, na voz dele.

DADOS DO CONSULTOR
Nome: {{nome_exibicao}}
Cidade: {{cidade}}
Público que ele quer atrair: {{publico_alvo}}
Tom de voz: {{tom_de_voz}}
Nível de experiência: {{nivel_experiencia}}

SOBRE A EMPRESA
Atlântica Natural é uma empresa brasileira de marketing de rede com mais de 400 produtos (perfumaria, cosméticos ozonizados, cuidados pessoais, suplementação, bem-estar) e linhas de serviço (telemedicina, internet 5G, energia por assinatura, streaming, energia solar, ferramentas de IA).
Três frentes de ganho: venda direta, comercialização de serviços e construção de equipe com renda alavancada.
O kit inicial permite escolher 4 perfumes de 15ml com 50%% de desconto sobre o catálogo para revenda.

OBJETIVO DESTE CONTEÚDO: %s
FORMATO SOLICITADO: %s
TEMA ESPECÍFICO: {{tema_livre}}

REGRAS DE ESCRITA
1. Primeira linha é tudo. Nos 3 primeiros segundos o conteúdo precisa parar o dedo. Nada de "Oi gente, tudo bem?".
2. Escreva como uma pessoa real fala no Brasil, não como um anúncio corporativo.
3. Uma ideia por conteúdo. Conteúdo que fala de tudo não converte nada.
4. Use dor real, rotina real e desejo real do público informado. Nada de frases motivacionais vazias.
5. O CTA sempre conduz para a conversa no WhatsApp ou para o link na bio. Nunca para dois lugares ao mesmo tempo.
6. Varie os ângulos entre as 3 variações: uma pela dor, uma pela história/prova, uma pela curiosidade ou contraste.

REGRAS DE COMPLIANCE (inegociáveis)
1. Proibido prometer ganhos, valores, prazos de retorno ou renda garantida. Nem em número, nem em faixa, nem "de forma indireta".
2. Proibido usar as palavras "renda garantida", "lucro certo", "fique rico", "dinheiro fácil".
3. Proibido atribuir cura, tratamento ou prevenção de doenças a qualquer produto.
4. Proibido comparar com concorrentes citando nomes.
5. Fale de oportunidade, esforço, aprendizado e possibilidade, nunca de resultado assegurado.
6. Se o tema pedido pelo membro violar alguma regra acima, reescreva o tema numa versão em conformidade e siga em frente.

FORMATO DA RESPOSTA
Responda EXCLUSIVAMENTE com o JSON no schema informado. Sem markdown, sem crases, sem comentários, sem texto antes ou depois.
Gere sempre 3 variações.$sql$, p_objetivo_label, p_formato_label);
$$;

insert into conteudo_prompt_templates (objetivo, formato, system_prompt, ativo, versao)
select o.objetivo, f.formato,
  conteudo_seed_base_prompt(o.label, f.label),
  true, 1
from (values
  ('recrutamento'::objetivo_conteudo, 'Recrutamento de novos consultores'),
  ('energia_assinatura'::objetivo_conteudo, 'Energia por assinatura (ATL Energy)'),
  ('venda_produto'::objetivo_conteudo, 'Venda de produto'),
  ('autoridade_pessoal'::objetivo_conteudo, 'Autoridade pessoal')
) as o(objetivo, label)
cross join (values
  ('reels'::formato_conteudo, 'Roteiro de Reels'),
  ('legenda_post'::formato_conteudo, 'Legenda de post/carrossel'),
  ('stories'::formato_conteudo, 'Sequência de Stories'),
  ('whatsapp_prospeccao'::formato_conteudo, 'Mensagem de prospecção no WhatsApp')
) as f(formato, label);

-- Função só existia para montar o seed acima; templates já editam via admin
-- a partir daqui, não precisa ficar no catálogo.
drop function conteudo_seed_base_prompt(text, text);
