-- Fase 1, entrega 4: Mentor IA. O admin cadastra a base de conhecimento
-- (textos e PDFs); o servidor divide em trechos e guarda embeddings (pgvector,
-- google/gemini-embedding-001 com 768 dimensões). O membro pergunta, o
-- servidor busca os trechos mais parecidos e a IA responde só com base neles.
-- Todo o fluxo do membro roda no servidor com service-role: o membro não lê
-- a base nem grava perguntas direto (o limite diário não pode ser driblado).

create extension if not exists vector with schema extensions;

-- ============================================================================
-- CONFIG (linha única)
-- ============================================================================
create table mentor_config (
  id int primary key default 1 check (id = 1),
  ativo boolean not null default true,
  prompt_sistema text not null default '',
  limite_diario int not null default 20 check (limite_diario between 1 and 500),
  updated_at timestamptz not null default now(),
  updated_by uuid references usuarios(id) on delete set null
);
alter table mentor_config enable row level security;

create policy mentor_config_admin on mentor_config for all
  using (private.is_admin()) with check (private.is_admin());

create trigger mentor_config_set_updated_at
  before update on mentor_config
  for each row execute function private.set_updated_at();

insert into mentor_config (id, prompt_sistema) values (1,
'Você é o Mentor da ATL Prospect: um consultor experiente da Atlântica Natural que ajuda os novos consultores da equipe a tirar dúvidas do dia a dia (produtos, serviços, plano, adesão, energia por assinatura, uso da plataforma e como abordar contatos).

Como responder:
- Use SOMENTE as informações dos TRECHOS DA BASE enviados junto com a pergunta. Não use conhecimento próprio sobre a empresa, preços ou regras.
- Se os trechos não responderem a pergunta, diga com sinceridade que não tem essa informação e oriente a falar com o líder. Nunca invente.
- Respostas curtas e práticas, em português do Brasil, em tom de colega experiente. Use listas quando ajudar.
- Quando fizer sentido, sugira o próximo passo prático (um script, um material, uma missão da trilha).');

-- ============================================================================
-- BASE DE CONHECIMENTO
-- ============================================================================
create table mentor_documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 120),
  origem text not null default 'texto' check (origem in ('texto', 'pdf')),
  nome_arquivo text,
  conteudo text not null check (char_length(conteudo) <= 500000),
  ativo boolean not null default true,
  -- pendente: ainda sem trechos; pronto: trechos gerados; erro: falhou
  status text not null default 'pendente' check (status in ('pendente', 'pronto', 'erro')),
  erro text,
  total_trechos int not null default 0,
  created_by uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table mentor_documentos enable row level security;

create policy mentor_documentos_admin on mentor_documentos for all
  using (private.is_admin()) with check (private.is_admin());

create trigger mentor_documentos_set_updated_at
  before update on mentor_documentos
  for each row execute function private.set_updated_at();

create table mentor_trechos (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references mentor_documentos(id) on delete cascade,
  ordem int not null,
  conteudo text not null,
  embedding extensions.vector(768) not null
);
alter table mentor_trechos enable row level security;

create policy mentor_trechos_admin on mentor_trechos for all
  using (private.is_admin()) with check (private.is_admin());

create index mentor_trechos_documento_idx on mentor_trechos (documento_id, ordem);
create index mentor_trechos_embedding_idx on mentor_trechos
  using hnsw (embedding extensions.vector_cosine_ops);

-- Busca semântica: só documentos ativos e processados. Executável só pelo
-- service-role (o servidor), nunca direto pelo navegador.
create function public.mentor_buscar_trechos(
  p_embedding extensions.vector(768),
  p_limite int default 6,
  p_minimo double precision default 0.55
)
returns table (id uuid, documento_id uuid, titulo text, conteudo text, similaridade double precision)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select t.id, t.documento_id, d.titulo, t.conteudo,
         1 - (t.embedding <=> p_embedding) as similaridade
    from mentor_trechos t
    join mentor_documentos d on d.id = t.documento_id
   where d.ativo
     and d.status = 'pronto'
     and 1 - (t.embedding <=> p_embedding) >= p_minimo
   order by t.embedding <=> p_embedding
   limit least(greatest(p_limite, 1), 20);
$$;

revoke execute on function public.mentor_buscar_trechos(extensions.vector, int, double precision)
  from public, anon, authenticated;
grant execute on function public.mentor_buscar_trechos(extensions.vector, int, double precision)
  to service_role;

-- ============================================================================
-- PERGUNTAS (histórico + contagem do limite diário)
-- ============================================================================
create table mentor_perguntas (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  -- true quando não havia trecho relevante (a base não cobre o assunto)
  sem_base boolean not null default false,
  trechos uuid[] not null default '{}',
  modelo text,
  created_at timestamptz not null default now()
);
alter table mentor_perguntas enable row level security;

create index mentor_perguntas_membro_idx on mentor_perguntas (membro_id, created_at desc);
create index mentor_perguntas_recentes_idx on mentor_perguntas (created_at desc);

-- Leitura: o próprio histórico ou admin. Escrita só pelo servidor (service-role).
create policy mentor_perguntas_select on mentor_perguntas for select
  using (private.is_admin() or membro_id = auth.uid());

-- ============================================================================
-- STORAGE: PDFs da base (só admin). O servidor extrai o texto e apaga o PDF.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mentor', 'mentor', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy mentor_storage_admin on storage.objects for all
  to authenticated
  using (bucket_id = 'mentor' and private.is_admin())
  with check (bucket_id = 'mentor' and private.is_admin());

-- ============================================================================
-- RASCUNHO DA BASE (desativado e pendente: o admin revisa, ativa e processa)
-- Fatos dos prompts oficiais dos agentes de recrutamento e energia.
-- ============================================================================
insert into mentor_documentos (titulo, origem, conteudo, ativo, status) values (
'Informações oficiais (rascunho)',
'texto',
'A ATLÂNTICA NATURAL
A Atlântica Natural é uma empresa brasileira de Marketing de Rede com mais de 400 produtos: cosméticos ozonizados, suplementos e perfumaria fina. Também oferece serviços: energia por assinatura, telemedicina, internet, streaming, agência de viagem, consórcios e seguros.
O consultor pode ganhar de duas formas: vendendo produtos (venda direta) e construindo uma equipe de consultores (renda pelo plano de marketing da empresa). Os resultados dependem da dedicação e do trabalho de cada um; não existe ganho garantido.

FORMAS DE INICIAR (ADESÃO)
Adesão Simples: pedido mínimo de R$ 79,90. A pessoa escolhe os produtos já com 50% de desconto e libera todas as formas de ganho no plano de carreira. Pode vender os serviços, mas ganha só na adesão do serviço (não tem ganho recorrente nos serviços).
Com os R$ 79,90 a pessoa pode escolher 4 perfumes a preço de consultor e já pode revendê-los.
Licença Anual: R$ 999,90. Libera todo o plano de carreira e o direito de vender todos os produtos e serviços, com comissão todos os meses sobre os serviços vendidos uma única vez.

EXEMPLO DE VENDA DIRETA (APENAS ILUSTRATIVO)
Um perfume de 15 ml custa R$ 19,99 para o consultor e costuma ser revendido por cerca de R$ 40,00. É só um exemplo de margem; o resultado depende de cada um.

É PIRÂMIDE?
Não. A Atlântica Natural trabalha com Marketing de Rede, um modelo legal baseado na venda de produtos e serviços reais. Toda remuneração segue as regras do plano de marketing da empresa.

VÍDEOS OFICIAIS
Apresentação do negócio: https://youtu.be/rx4rIIrTJDo
Tutorial do primeiro pedido no escritório virtual: https://youtu.be/sNDwQdAXJkc

ENERGIA POR ASSINATURA
O cliente recebe 15% de desconto sobre o consumo de energia (não sobre o valor total da conta, que tem tarifas, impostos e encargos). Não precisa investir, instalar placa solar, comprar equipamento ou fazer obra. Não há fidelidade nem custo de adesão. O cliente continua recebendo a conta da distribuidora normalmente.
A energia é gerada em usinas parceiras, dentro do Sistema de Compensação de Energia Elétrica (Lei 14.300/2022 e regras da ANEEL). A lei não garante os 15%: o desconto é a condição comercial da oferta.
Critérios básicos: consumo acima de 180 kWh por mês, unidade não subsidiada por programa incompatível, pedido feito pelo titular da conta e unidade em região atendida. A elegibilidade só é confirmada depois da análise da conta, feita por uma pessoa.
Passo a passo: o cliente envia a conta de luz para análise; se aprovada, envia RG ou CNH com CPF, e-mail e telefone; o contrato chega por e-mail em 1 a 4 dias úteis e é assinado online; o desconto passa a aparecer na fatura em cerca de 90 a 120 dias, conforme a distribuidora.

REGRAS DE CONDUTA
Nunca prometer ganhos ou enriquecimento. Nunca dizer que um produto cura ou trata doenças. Nunca inventar preços, prazos ou condições. Na dúvida, falar com o líder.',
false,
'pendente'
);
