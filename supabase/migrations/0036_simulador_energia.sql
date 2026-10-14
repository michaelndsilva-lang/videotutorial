-- Fase 2, entrega 3: simulador de energia. Parâmetros editados pelo admin.
-- Economia estimada = conta × (fatia_consumo/100) × (desconto/100): o desconto
-- da ATL Energy é sobre o CONSUMO, não sobre a conta inteira (tarifas,
-- impostos e encargos ficam fora). Decisão do admin em 2026-10-14.

create table energia_config (
  id int primary key default 1 check (id = 1),
  desconto_percentual numeric(5,2) not null default 15 check (desconto_percentual > 0 and desconto_percentual <= 50),
  fatia_consumo_percentual numeric(5,2) not null default 75 check (fatia_consumo_percentual > 0 and fatia_consumo_percentual <= 100),
  -- referência de conta mínima (≈ consumo acima de 180 kWh); abaixo disso o
  -- simulador avisa que provavelmente não é elegível
  conta_minima numeric(10,2) not null default 150 check (conta_minima >= 0),
  -- UFs atendidas; vazio = não restringe (mostra "sujeito a disponibilidade")
  ufs_atendidas text[] not null default '{}',
  aviso text not null default 'Valores estimados. O desconto de 15% é aplicado sobre o consumo de energia, não sobre o valor total da conta (tarifas, impostos e encargos continuam). A participação depende da análise da conta e da disponibilidade na sua região.',
  updated_at timestamptz not null default now(),
  updated_by uuid references usuarios(id) on delete set null
);
alter table energia_config enable row level security;

-- Membros aprovados leem (simulador interno); escrita só admin. A versão
-- pública lê pelo servidor (service-role).
create policy energia_config_select on energia_config for select
  using (private.is_admin() or private.membro_aprovado(auth.uid()));
create policy energia_config_admin on energia_config for all
  using (private.is_admin()) with check (private.is_admin());

create trigger energia_config_set_updated_at
  before update on energia_config
  for each row execute function private.set_updated_at();

insert into energia_config (id) values (1);
