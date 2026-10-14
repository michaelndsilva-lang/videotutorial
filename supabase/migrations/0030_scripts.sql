-- Fase 1, entrega 1: biblioteca de scripts. Mensagens prontas por categoria,
-- com variáveis {nome_lead}, {meu_nome}, {meu_link} e {link_energia}
-- substituídas na tela do membro. Só o admin cria/edita; membro aprovado lê
-- scripts ativos e registra o uso (copiar / abrir no WhatsApp).

create table script_categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) between 1 and 40),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table script_categorias enable row level security;

create policy script_categorias_select on script_categorias for select
  using (private.is_admin() or (ativo and private.membro_aprovado(auth.uid())));
create policy script_categorias_admin on script_categorias for all
  using (private.is_admin()) with check (private.is_admin());

create table scripts (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references script_categorias(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 80),
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table scripts enable row level security;

create index scripts_categoria_idx on scripts (categoria_id, ordem);

create policy scripts_select on scripts for select
  using (
    private.is_admin()
    or (
      ativo
      and private.membro_aprovado(auth.uid())
      and exists (select 1 from script_categorias c where c.id = categoria_id and c.ativo)
    )
  );
create policy scripts_admin on scripts for all
  using (private.is_admin()) with check (private.is_admin());

create trigger scripts_set_updated_at
  before update on scripts
  for each row execute function private.set_updated_at();

-- Uso: quem copiou/abriu qual script (ranking de mais usados no admin).
create table script_usos (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references scripts(id) on delete cascade,
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  acao text not null check (acao in ('copiar', 'whatsapp')),
  created_at timestamptz not null default now()
);
alter table script_usos enable row level security;

create index script_usos_script_idx on script_usos (script_id, created_at desc);

create policy script_usos_insert on script_usos for insert
  with check (membro_id = auth.uid() and private.membro_aprovado(auth.uid()));
create policy script_usos_select on script_usos for select
  using (private.is_admin() or membro_id = auth.uid());

-- ============================================================================
-- RASCUNHO INICIAL (scripts desativados: o admin revisa e ativa no painel)
-- Fatos tirados dos prompts oficiais dos agentes (recrutamento e energia).
-- ============================================================================
insert into script_categorias (nome, ordem) values
  ('Abordagem', 0), ('Objeções', 1), ('Follow-up', 2), ('Energia', 3), ('Produtos', 4);

insert into scripts (categoria_id, titulo, texto, ordem, ativo)
select c.id, s.titulo, s.texto, s.ordem, false
from (values
  ('Abordagem', 'Primeiro contato (conhecido)', 'Oi, {nome_lead}! Tudo bem? 😊
Comecei um projeto novo com a Atlântica Natural e lembrei de você. Posso te mostrar em 2 minutinhos como funciona? Sem compromisso nenhum.', 0),
  ('Abordagem', 'Primeiro contato (indicação)', 'Oi, {nome_lead}! Aqui é {meu_nome}, tudo bem?
Peguei seu contato com um amigo em comum. Trabalho com a Atlântica Natural e acho que você pode gostar do que a gente faz. Posso te contar rapidinho?', 1),
  ('Abordagem', 'Convite para o vídeo', '{nome_lead}, separei um vídeo curto que explica tudo melhor do que eu por texto 😄
Assiste com calma e me diz o que achou: https://youtu.be/rx4rIIrTJDo', 2),
  ('Abordagem', 'Apresentação da empresa', 'A Atlântica Natural é uma empresa brasileira com mais de 400 produtos: cosméticos ozonizados, suplementos e perfumaria fina.
E ainda tem serviços como energia por assinatura, telemedicina, internet e seguros. Dá pra construir um negócio bem completo.', 3),
  ('Abordagem', 'Envio do link de cadastro', 'Perfeito, {nome_lead}! Esse é o meu link de cadastro: {meu_link}
Qualquer dúvida no caminho, me chama aqui que eu te ajudo em cada etapa. 🙌', 4),
  ('Objeções', 'Não tenho dinheiro', 'Entendo perfeitamente, {nome_lead}. Muita gente começou justamente buscando uma renda extra.
Hoje dá pra iniciar com a adesão simples de R$ 79,90, que já vem com produtos pra você começar. Mas a decisão precisa fazer sentido pra você.', 0),
  ('Objeções', 'Não tenho tempo', 'Faz sentido, {nome_lead}. A maioria dos consultores começou conciliando com outro trabalho.
Dá pra desenvolver no seu ritmo, usando o celular nos intervalos do dia.', 1),
  ('Objeções', 'Nunca vendi nada', 'Sem problema nenhum! A maioria também começou sem experiência.
Você tem treinamento, materiais prontos e acompanhamento meu e da equipe.', 2),
  ('Objeções', 'Isso é pirâmide?', 'Ótima pergunta, {nome_lead}! Não é.
A Atlântica Natural trabalha com Marketing de Rede, um modelo legal baseado na venda de produtos e serviços reais. Toda remuneração segue as regras do plano de marketing da empresa.', 3),
  ('Objeções', 'Vou pensar', 'Claro, {nome_lead}, é uma decisão importante. 😊
Pra eu te ajudar: o que você gostaria de entender melhor antes de decidir?', 4),
  ('Follow-up', 'Retomar depois do vídeo', 'Oi, {nome_lead}! Conseguiu assistir o vídeo que te mandei?
Fiquei curioso pra saber o que mais chamou sua atenção. 😊', 0),
  ('Follow-up', 'Retomar conversa parada', 'Oi, {nome_lead}, tudo bem? Passando só pra saber se ficou alguma dúvida daquela nossa conversa.
Se quiser, marco um horário rápido pra te explicar com calma.', 1),
  ('Energia', 'Abordagem energia', 'Oi, {nome_lead}! Você sabia que dá pra ter 15% de desconto sobre o consumo de energia sem instalar placa solar e sem investir nada?
Hoje sua conta de luz fica em torno de quanto por mês?', 0),
  ('Energia', 'Como funciona', 'Funciona assim: a energia é gerada em usinas parceiras e você continua recebendo a conta da distribuidora normalmente.
Não tem obra, não tem equipamento, não tem fidelidade e não tem custo de adesão. 😊', 1),
  ('Energia', 'Pedir a conta para análise', 'Se quiser, me manda uma foto bem legível ou o PDF da sua conta de luz.
Eu encaminho para análise e te digo se a sua unidade pode participar. (Precisa ter consumo acima de 180 kWh por mês.)', 2),
  ('Energia', 'Link de cadastro energia', 'Prontinho, {nome_lead}! Esse é o link para fazer sua adesão à energia por assinatura: {link_energia}', 3),
  ('Produtos', 'Catálogo de perfumes', 'Oi, {nome_lead}! Separei nosso catálogo de perfumaria pra você dar uma olhada. 😍
Qual estilo de fragrância você mais gosta? Te ajudo a escolher.', 0),
  ('Produtos', 'Começar com perfumes', 'Sabia que com R$ 79,90 você já começa como consultor(a) e escolhe 4 perfumes a preço de consultor?
Você pode usar ou já revender. Quer que eu te mostre como funciona?', 1)
) as s(categoria, titulo, texto, ordem)
join script_categorias c on c.nome = s.categoria;
