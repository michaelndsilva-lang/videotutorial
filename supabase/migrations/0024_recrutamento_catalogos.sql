-- Catálogos em PDF do agente de recrutamento: LINHA DE PERFUMARIA e GUIA DE
-- PRODUTOS. Um arquivo por slot, compartilhado por todos os membros (igual ao
-- prompt mestre em agentes_config) e gerenciado só pelo admin em
-- /admin/agentes. O webhook (service-role) gera uma signed URL e envia o PDF
-- como documento no WhatsApp quando o lead pergunta sobre os produtos.

create table recrutamento_catalogos (
  tipo text primary key check (tipo in ('linha_perfumaria', 'guia_produtos')),
  storage_path text not null unique,
  nome_arquivo text not null,
  tamanho_bytes bigint not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references usuarios(id)
);
alter table recrutamento_catalogos enable row level security;

create policy recrutamento_catalogos_admin on recrutamento_catalogos for all
  using (private.is_admin())
  with check (private.is_admin());

create trigger recrutamento_catalogos_set_updated_at
  before update on recrutamento_catalogos
  for each row execute function private.set_updated_at();

-- ============================================================================
-- STORAGE: bucket privado, só o admin sobe/remove
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogos',
  'catalogos',
  false,
  26214400, -- 25 MB
  array['application/pdf']
)
on conflict (id) do nothing;

create policy catalogos_storage_admin on storage.objects for all
  to authenticated
  using (bucket_id = 'catalogos' and private.is_admin())
  with check (bucket_id = 'catalogos' and private.is_admin());
