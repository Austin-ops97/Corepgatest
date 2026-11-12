-- Digital business cards for CorePGA
-- Idempotent. Safe to re-run. Enables RLS on all app tables.
-- Public reads go through SECURITY DEFINER RPCs only (no direct anon SELECT on cards).

-- ---------------------------------------------------------------------------
-- Admins allowlist
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is 'Allowlist of Auth users who may manage digital business cards.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

comment on function public.is_admin() is 'True when the current Auth user is in public.admins.';

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  owner_token uuid not null default gen_random_uuid(),
  full_name text not null default '',
  title text not null default '',
  company text not null default 'Core Power Generation Advisors, INC',
  website text not null default 'https://www.corepga.com',
  email text not null default '',
  phones jsonb not null default '[]'::jsonb,
  address text not null default '',
  linkedin text not null default '',
  extra_links jsonb not null default '[]'::jsonb,
  bio text not null default '',
  photo_url text not null default '',
  logo_url text not null default '',
  theme jsonb not null default jsonb_build_object(
    'template', 'classic',
    'accent', '#0071C2'
  ),
  is_active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'),
  constraint cards_phones_is_array check (jsonb_typeof(phones) = 'array'),
  constraint cards_links_is_array check (jsonb_typeof(extra_links) = 'array'),
  constraint cards_theme_is_object check (jsonb_typeof(theme) = 'object')
);

comment on table public.cards is 'Employee digital business cards. owner_token is private; public access is via RPCs.';
comment on column public.cards.owner_token is 'Unguessable employee-app token. Never returned by public RPCs.';
comment on column public.cards.phones is 'Array of {label, number} objects.';
comment on column public.cards.extra_links is 'Array of {label, url} objects.';
comment on column public.cards.theme is '{template, accent} for the public card look.';

create unique index if not exists cards_slug_key on public.cards (slug);
create unique index if not exists cards_owner_token_key on public.cards (owner_token);
create index if not exists cards_updated_at_idx on public.cards (updated_at desc);
create index if not exists cards_full_name_idx on public.cards (full_name);

create or replace function public.set_cards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cards_updated_at on public.cards;
create trigger trg_cards_updated_at
before update on public.cards
for each row
execute procedure public.set_cards_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.admins force row level security;
alter table public.cards enable row level security;
alter table public.cards force row level security;

revoke all on table public.admins from public, anon, authenticated;
revoke all on table public.cards from public, anon, authenticated;

grant select on table public.admins to authenticated;
grant select, insert, update, delete on table public.cards to authenticated;

drop policy if exists admins_select_self on public.admins;
create policy admins_select_self
  on public.admins
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists cards_admin_select on public.cards;
create policy cards_admin_select
  on public.cards
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists cards_admin_insert on public.cards;
create policy cards_admin_insert
  on public.cards
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists cards_admin_update on public.cards;
create policy cards_admin_update
  on public.cards
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists cards_admin_delete on public.cards;
create policy cards_admin_delete
  on public.cards
  for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public field projection (no owner_token, no created_by)
-- ---------------------------------------------------------------------------
create or replace function public.card_public_json(c public.cards)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'full_name', c.full_name,
    'title', c.title,
    'company', c.company,
    'website', c.website,
    'email', c.email,
    'phones', c.phones,
    'address', c.address,
    'linkedin', c.linkedin,
    'extra_links', c.extra_links,
    'bio', c.bio,
    'photo_url', c.photo_url,
    'logo_url', c.logo_url,
    'theme', c.theme,
    'is_active', c.is_active
  );
$$;

revoke all on function public.card_public_json(public.cards) from public;

create or replace function public.get_public_card(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.cards;
begin
  if p_slug is null or length(trim(p_slug)) = 0 then
    return null;
  end if;

  select * into c
  from public.cards
  where slug = lower(trim(p_slug))
    and is_active = true;

  if not found then
    return null;
  end if;

  return public.card_public_json(c);
end;
$$;

comment on function public.get_public_card(text) is 'Public digital card by slug. Active cards only. No tokens.';

create or replace function public.get_card_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tok uuid;
  c public.cards;
begin
  begin
    tok := p_token::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;

  select * into c
  from public.cards
  where owner_token = tok
    and is_active = true;

  if not found then
    return null;
  end if;

  -- Public fields plus slug (slug is already in the projection).
  return public.card_public_json(c);
end;
$$;

comment on function public.get_card_by_token(text) is 'Employee-app lookup by private token. Returns public fields + slug, never the token.';

create or replace function public.regenerate_token(p_card_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.cards
  set owner_token = gen_random_uuid()
  where id = p_card_id
  returning owner_token into new_token;

  if new_token is null then
    raise exception 'card not found' using errcode = 'P0002';
  end if;

  return new_token;
end;
$$;

comment on function public.regenerate_token(uuid) is 'Admin-only. Rotates the employee app token for a card.';

revoke all on function public.get_public_card(text) from public;
revoke all on function public.get_card_by_token(text) from public;
revoke all on function public.regenerate_token(uuid) from public;

grant execute on function public.get_public_card(text) to anon, authenticated;
grant execute on function public.get_card_by_token(text) to anon, authenticated;
grant execute on function public.regenerate_token(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public bucket card-media
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-media',
  'card-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists card_media_public_read on storage.objects;
create policy card_media_public_read
  on storage.objects
  for select
  using (bucket_id = 'card-media');

drop policy if exists card_media_admin_insert on storage.objects;
create policy card_media_admin_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'card-media' and public.is_admin());

drop policy if exists card_media_admin_update on storage.objects;
create policy card_media_admin_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'card-media' and public.is_admin())
  with check (bucket_id = 'card-media' and public.is_admin());

drop policy if exists card_media_admin_delete on storage.objects;
create policy card_media_admin_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'card-media' and public.is_admin());
