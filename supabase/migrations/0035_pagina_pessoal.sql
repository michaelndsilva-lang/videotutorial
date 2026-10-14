-- Fase 2, entrega 2: página pessoal pública de cada membro (/c/<slug>) com
-- formulário de lead. A página só aparece com o membro aprovado E publicada.
-- O lead vira card no Kanban (origem 'pagina') e o consentimento LGPD fica
-- registrado em lead_consentimentos (prova + base do antispam por IP).

create table paginas (
  membro_id uuid primary key references membros(usuario_id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  foto_path text,
  bio text not null default '' check (char_length(bio) <= 400),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{12,13}$'),
  mostrar_oportunidade boolean not null default true,
  mostrar_energia boolean not null default true,
  mostrar_produtos boolean not null default true,
  publicada boolean not null default false,
  visitas int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table paginas enable row level security;

-- O membro edita a própria página (menos o contador de visitas, que só o
-- servidor incrementa). Leitura pública é feita pelo servidor (service-role).
create policy paginas_select on paginas for select
  using (membro_id = auth.uid() or private.is_admin());
create policy paginas_insert on paginas for insert
  with check (membro_id = auth.uid() and private.membro_aprovado(auth.uid()));
create policy paginas_update on paginas for update
  using (membro_id = auth.uid() and private.membro_aprovado(auth.uid()))
  with check (membro_id = auth.uid());
create policy paginas_admin on paginas for all
  using (private.is_admin()) with check (private.is_admin());

create function private.proteger_visitas_pagina()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not private.is_admin() then
    new.visitas := old.visitas;
  end if;
  return new;
end;
$$;

create trigger paginas_proteger_visitas
  before update on paginas
  for each row execute function private.proteger_visitas_pagina();

create trigger paginas_set_updated_at
  before update on paginas
  for each row execute function private.set_updated_at();

-- Contador de visitas: chamado pelo servidor ao renderizar /c/<slug>.
create function public.registrar_visita_pagina(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update paginas set visitas = visitas + 1 where slug = p_slug and publicada;
$$;
revoke execute on function public.registrar_visita_pagina(text) from public, anon, authenticated;
grant execute on function public.registrar_visita_pagina(text) to service_role;

-- ============================================================================
-- CONSENTIMENTOS (LGPD) — gravado só pelo servidor
-- ============================================================================
create table lead_consentimentos (
  id uuid primary key default gen_random_uuid(),
  membro_id uuid not null references membros(usuario_id) on delete cascade,
  card_id uuid references kanban_cards(id) on delete set null,
  origem text not null check (origem in ('pagina', 'simulador', 'catalogo')),
  nome text not null,
  telefone text not null,
  interesse text,
  texto_consentimento text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);
alter table lead_consentimentos enable row level security;

create index lead_consentimentos_ip_idx on lead_consentimentos (ip_hash, created_at desc);
create index lead_consentimentos_membro_idx on lead_consentimentos (membro_id, created_at desc);

create policy lead_consentimentos_select on lead_consentimentos for select
  using (membro_id = auth.uid() or private.is_admin());

-- ============================================================================
-- STORAGE: fotos de perfil (bucket público, 2 MB, só imagem). Cada membro
-- só grava na própria pasta (<user id>/...). Admin pode remover.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_membro_escreve on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and private.membro_aprovado(auth.uid())
  );
create policy avatars_membro_atualiza on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_membro_apaga on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin())
  );
