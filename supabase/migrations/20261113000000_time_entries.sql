-- PROJ-4: Manuelle Zeiterfassung
-- Tabelle time_entries mit Row Level Security, kein Löschen, Regeln in der Datenbank.

-- Fremdschlüssel-Ziel: ein Zeiteintrag gehört immer dem Besitzer seines Projekts
alter table public.projects add constraint projects_id_owner_key unique (id, owner_id);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  entry_date date not null,
  duration_minutes integer not null,
  billable_minutes integer not null,
  start_time time,
  end_time time,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint time_entries_project_owner_fkey foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete restrict,
  constraint time_entries_duration_range check (duration_minutes between 1 and 1440),
  constraint time_entries_billable_range check (billable_minutes >= 0 and billable_minutes <= duration_minutes),
  -- Start und Ende nur zusammen, minutengenau, Ende nach Start, Dauer = Differenz
  constraint time_entries_times_consistent check (
    (start_time is null and end_time is null)
    or (
      start_time is not null and end_time is not null
      and extract(second from start_time) = 0 and extract(second from end_time) = 0
      and end_time > start_time
      and duration_minutes = (extract(epoch from (end_time - start_time)) / 60)::integer
    )
  ),
  constraint time_entries_description_length check (
    description is null
    or (description = btrim(description, E' \t\r\n') and char_length(description) between 1 and 1000)
  )
);

create index time_entries_owner_date_idx on public.time_entries (owner_id, entry_date);
create index time_entries_owner_created_idx on public.time_entries (owner_id, created_at desc);
create index time_entries_project_idx on public.time_entries (project_id);

-- ===== Trigger: Besitzer setzen, Unveränderliches schützen, Datum und Ziel prüfen =====

create function public.time_entries_before_insert() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_project_archived boolean;
  v_customer_archived boolean;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  new.owner_id := auth.uid();
  new.created_at := now();
  new.updated_at := now();

  -- Nicht in der Zukunft, nach der Uhr in Zürich
  if new.entry_date > (now() at time zone 'Europe/Zurich')::date then
    raise exception 'date_in_future' using errcode = '23514';
  end if;

  -- Nur auf aktive Projekte aktiver Kunden des Besitzers (RLS: fremde Projekte sind unsichtbar)
  select p.archived, c.archived into v_project_archived, v_customer_archived
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = new.project_id;
  if not found then
    raise exception 'target_not_found' using errcode = '23503';
  end if;
  if v_project_archived or v_customer_archived then
    raise exception 'target_archived' using errcode = '23514';
  end if;
  return new;
end $$;

create function public.time_entries_before_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_project_archived boolean;
  v_customer_archived boolean;
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.entry_date is distinct from old.entry_date
     and new.entry_date > (now() at time zone 'Europe/Zurich')::date then
    raise exception 'date_in_future' using errcode = '23514';
  end if;

  -- Ein bestehender Eintrag auf ein inzwischen archiviertes Projekt bleibt bearbeitbar;
  -- verschieben lässt er sich nur auf ein aktives Projekt.
  if new.project_id is distinct from old.project_id then
    select p.archived, c.archived into v_project_archived, v_customer_archived
      from public.projects p
      join public.customers c on c.id = p.customer_id
      where p.id = new.project_id;
    if not found then
      raise exception 'target_not_found' using errcode = '23503';
    end if;
    if v_project_archived or v_customer_archived then
      raise exception 'target_archived' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger time_entries_before_insert before insert on public.time_entries
  for each row execute function public.time_entries_before_insert();
create trigger time_entries_before_update before update on public.time_entries
  for each row execute function public.time_entries_before_update();

-- ===== Row Level Security: nur eigene Zeilen, kein Löschen =====

alter table public.time_entries enable row level security;

create policy time_entries_select_own on public.time_entries
  for select to authenticated using (owner_id = (select auth.uid()));
create policy time_entries_insert_own on public.time_entries
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy time_entries_update_own on public.time_entries
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Rechte: nichts für anon, für angemeldete Nutzer nur lesen, anlegen, ändern (nie löschen).
revoke all on public.time_entries from public, anon, authenticated;
grant select, insert, update on public.time_entries to authenticated;
