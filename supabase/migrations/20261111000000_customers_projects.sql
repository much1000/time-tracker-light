-- PROJ-3: Kunden- und Projektverwaltung
-- Zwei Tabellen mit Row Level Security, kein Löschen, Regeln in der Datenbank,
-- drei unteilbare Funktionen (Kunde anlegen mit «Allgemein», archivieren, reaktivieren).

-- ===== Tabellen =====

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_code_format check (code ~ '^[A-Z0-9-]{2,10}$'),
  constraint customers_name_length check (name = btrim(name) and char_length(name) between 1 and 100),
  constraint customers_archived_consistent check (archived = (archived_at is not null)),
  constraint customers_owner_code_key unique (owner_id, code),
  -- Fremdschlüssel von projects: ein Projekt gehört immer dem Besitzer seines Kunden
  constraint customers_id_owner_key unique (id, owner_id)
);

create unique index customers_owner_name_lower_idx on public.customers (owner_id, lower(name));

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  customer_id uuid not null,
  name text not null,
  number text,
  archived boolean not null default false,
  archived_at timestamptz,
  archived_with_customer boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_customer_owner_fkey foreign key (customer_id, owner_id)
    references public.customers (id, owner_id) on delete restrict,
  constraint projects_name_length check (name = btrim(name) and char_length(name) between 1 and 100),
  constraint projects_number_length check (
    number is null or (number = btrim(number) and char_length(number) between 1 and 30)
  ),
  constraint projects_archived_consistent check (archived = (archived_at is not null)),
  constraint projects_archived_with_customer_consistent check (archived or not archived_with_customer)
);

create unique index projects_customer_name_lower_idx on public.projects (customer_id, lower(name));
create index projects_owner_id_idx on public.projects (owner_id);

-- ===== Trigger: Besitzer setzen, Unveränderliches schützen =====

create function public.customers_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  new.owner_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

create function public.customers_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

create function public.projects_before_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  new.owner_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();
  -- Unter einem archivierten Kunden entsteht kein aktives Projekt.
  if not new.archived and exists (
    select 1 from public.customers c where c.id = new.customer_id and c.archived
  ) then
    raise exception 'customer_archived' using errcode = '23514';
  end if;
  return new;
end $$;

create function public.projects_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.customer_id := old.customer_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  -- Kein einzelnes Reaktivieren unter einem archivierten Kunden.
  if old.archived and not new.archived and exists (
    select 1 from public.customers c where c.id = new.customer_id and c.archived
  ) then
    raise exception 'customer_archived' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger customers_before_insert before insert on public.customers
  for each row execute function public.customers_before_insert();
create trigger customers_before_update before update on public.customers
  for each row execute function public.customers_before_update();
create trigger projects_before_insert before insert on public.projects
  for each row execute function public.projects_before_insert();
create trigger projects_before_update before update on public.projects
  for each row execute function public.projects_before_update();

-- ===== Row Level Security: nur eigene Zeilen, kein Löschen =====

alter table public.customers enable row level security;
alter table public.projects enable row level security;

create policy customers_select_own on public.customers
  for select to authenticated using (owner_id = (select auth.uid()));
create policy customers_insert_own on public.customers
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy customers_update_own on public.customers
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy projects_select_own on public.projects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy projects_insert_own on public.projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy projects_update_own on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Rechte: nichts für anon, für angemeldete Nutzer nur lesen, anlegen, ändern (nie löschen).
revoke all on public.customers, public.projects from public, anon, authenticated;
grant select, insert, update on public.customers, public.projects to authenticated;

-- ===== Unteilbare Funktionen (laufen mit den Rechten des Aufrufers, RLS gilt) =====

create function public.create_customer(p_code text, p_name text) returns public.customers
language plpgsql set search_path = '' as $$
declare
  v_customer public.customers;
begin
  insert into public.customers (code, name) values (p_code, p_name) returning * into v_customer;
  insert into public.projects (customer_id, name) values (v_customer.id, 'Allgemein');
  return v_customer;
end $$;

create function public.archive_customer(p_id uuid) returns void
language plpgsql set search_path = '' as $$
declare
  v_now timestamptz := now();
begin
  update public.customers set archived = true, archived_at = v_now
    where id = p_id and not archived;
  if not found then
    if not exists (select 1 from public.customers where id = p_id) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    return; -- schon archiviert
  end if;
  update public.projects
    set archived = true, archived_at = v_now, archived_with_customer = true
    where customer_id = p_id and not archived;
end $$;

create function public.reactivate_customer(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update public.customers set archived = false, archived_at = null
    where id = p_id and archived;
  if not found then
    if not exists (select 1 from public.customers where id = p_id) then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    return; -- schon aktiv
  end if;
  update public.projects
    set archived = false, archived_at = null, archived_with_customer = false
    where customer_id = p_id and archived_with_customer;
end $$;

revoke all on function public.create_customer(text, text) from public, anon;
revoke all on function public.archive_customer(uuid) from public, anon;
revoke all on function public.reactivate_customer(uuid) from public, anon;
grant execute on function public.create_customer(text, text) to authenticated;
grant execute on function public.archive_customer(uuid) to authenticated;
grant execute on function public.reactivate_customer(uuid) to authenticated;
