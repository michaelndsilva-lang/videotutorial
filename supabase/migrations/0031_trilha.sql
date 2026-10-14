-- Fase 1, entrega 2: trilha "Primeiros 7 dias". O admin monta missões por dia
-- (vídeo do YouTube + tarefa); o membro aprovado conclui em sequência: um dia
-- só libera quando todas as missões ativas dos dias anteriores estão feitas.
-- A regra de liberação vale no banco (policy), não só na tela.

create table missoes (
  id uuid primary key default gen_random_uuid(),
  dia int not null check (dia between 1 and 7),
  ordem int not null default 0,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 100),
  descricao text not null default '' check (char_length(descricao) <= 2000),
  video_url text check (video_url is null or video_url ~* '^https://'),
  -- assistir: só confirmar; executar: fez a ação; responder: escreve uma resposta
  tipo_tarefa text not null default 'assistir' check (tipo_tarefa in ('assistir', 'executar', 'responder')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table missoes enable row level security;

create index missoes_dia_idx on missoes (dia, ordem);

create policy missoes_select on missoes for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));
create policy missoes_admin on missoes for all
  using (private.is_admin()) with check (private.is_admin());

create trigger missoes_set_updated_at
  before update on missoes
  for each row execute function private.set_updated_at();

create table missao_progresso (
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  missao_id uuid not null references missoes(id) on delete cascade,
  resposta text check (resposta is null or char_length(resposta) <= 2000),
  concluido_em timestamptz not null default now(),
  primary key (membro_id, missao_id)
);
alter table missao_progresso enable row level security;

-- Dia liberado = todas as missões ativas dos dias anteriores concluídas.
create function private.trilha_dia_liberado(p_membro uuid, p_dia int)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select not exists (
    select 1
      from public.missoes m
     where m.ativo
       and m.dia < p_dia
       and not exists (
         select 1 from public.missao_progresso p
          where p.membro_id = p_membro and p.missao_id = m.id
       )
  );
$$;

-- Pode concluir: missão própria, ativa, de dia liberado; 'responder' exige texto.
create function private.pode_concluir_missao(p_membro uuid, p_missao uuid, p_resposta text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.missoes m
     where m.id = p_missao
       and m.ativo
       and private.trilha_dia_liberado(p_membro, m.dia)
       and (m.tipo_tarefa <> 'responder' or char_length(btrim(coalesce(p_resposta, ''))) > 0)
  );
$$;

create policy missao_progresso_select on missao_progresso for select
  using (private.is_admin() or membro_id = auth.uid());

create policy missao_progresso_insert on missao_progresso for insert
  with check (
    membro_id = auth.uid()
    and private.membro_aprovado(auth.uid())
    and private.pode_concluir_missao(auth.uid(), missao_id, resposta)
  );

-- Desmarcar a própria missão (ex.: clicou sem querer).
create policy missao_progresso_delete on missao_progresso for delete
  using (membro_id = auth.uid() and private.membro_aprovado(auth.uid()));

-- ============================================================================
-- RASCUNHO INICIAL (missões desativadas: o admin revisa e ativa no painel).
-- Vídeos: os mesmos que o agente de recrutamento já envia aos leads.
-- ============================================================================
insert into missoes (dia, ordem, titulo, descricao, video_url, tipo_tarefa, ativo) values
  (1, 0, 'Boas-vindas: entenda o negócio',
   'Assista à apresentação completa da Atlântica Natural. É o mesmo vídeo que você vai mandar para os seus contatos, então preste atenção em como ele explica a oportunidade.',
   'https://youtu.be/rx4rIIrTJDo', 'assistir', false),
  (1, 1, 'Seu porquê',
   'Por que você entrou na Atlântica Natural? Escreva em poucas linhas o que você quer conquistar nos próximos 90 dias. Vamos usar isso para te acompanhar.',
   null, 'responder', false),
  (1, 2, 'Complete seu perfil',
   'Vá em Perfil e preencha seu link de cadastro (recrutamento) e, se tiver, o de energia. Os scripts usam esses links automaticamente.',
   null, 'executar', false),
  (2, 0, 'Seu primeiro pedido',
   'Assista ao tutorial de como fazer o primeiro pedido no escritório virtual.',
   'https://youtu.be/sNDwQdAXJkc', 'assistir', false),
  (2, 1, 'Conheça os produtos',
   'Abra Materiais e veja o catálogo de perfumaria. Escolha 3 produtos que você usaria e saberia indicar.',
   null, 'executar', false),
  (2, 2, 'Seus 3 produtos',
   'Quais são os 3 produtos que você escolheu e por quê?',
   null, 'responder', false),
  (3, 0, 'Sua lista de contatos',
   'Faça uma lista com pelo menos 30 nomes: família, amigos, colegas de trabalho, vizinhos, conhecidos da igreja ou da academia. Não julgue quem vai ou não se interessar, só anote.',
   null, 'executar', false),
  (3, 1, 'Quantos nomes você listou?',
   'Conte quantos nomes entraram na sua lista e escreva aqui.',
   null, 'responder', false),
  (4, 0, 'Seus primeiros contatos',
   'Em Scripts, use o "Primeiro contato (conhecido)" e mande para 5 pessoas da sua lista. Coloque o nome de cada uma antes de enviar.',
   null, 'executar', false),
  (4, 1, 'Organize no Kanban',
   'Cadastre no Kanban as 5 pessoas que você abordou, para não perder nenhum retorno.',
   null, 'executar', false),
  (5, 0, 'Responda as objeções',
   'Leia todos os scripts da categoria Objeções. Qual objeção você mais tem medo de ouvir e como responderia?',
   null, 'responder', false),
  (5, 1, 'Mais 5 contatos',
   'Aborde mais 5 pessoas da lista e mande o vídeo de apresentação para quem demonstrar interesse.',
   null, 'executar', false),
  (6, 0, 'Follow-up',
   'Use os scripts de Follow-up com quem não respondeu ou ficou de pensar. Atualize o Kanban.',
   null, 'executar', false),
  (6, 1, 'Energia por assinatura',
   'Leia os scripts da categoria Energia e ofereça a economia na conta de luz para 3 pessoas que pagam mais de R$ 180 de luz.',
   null, 'executar', false),
  (7, 0, 'Balanço da semana',
   'Quantas pessoas você abordou, quantas responderam e quantas pediram mais informações? O que vai fazer diferente na próxima semana?',
   null, 'responder', false),
  (7, 1, 'Fale com seu líder',
   'Mande uma mensagem para quem te convidou contando como foi sua primeira semana e combine os próximos passos.',
   null, 'executar', false);
