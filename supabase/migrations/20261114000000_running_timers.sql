-- PROJ-6: Timer
-- Tabelle running_timers (höchstens ein laufender Timer pro Nutzer) und vier Funktionen
-- (get_timer, start_timer, stop_timer, discard_timer). Anlegen, Wechseln, Stoppen und Verwerfen
-- geschehen nur über die Funktionen (je ein unteilbarer Schritt, Zeit von der Serveruhr).
-- Ausserdem eine Ausnahme in der Regel «nur aktive Ziele» für den Stopp (siehe Trigger unten).

-- ===== Tabelle =====

create table public.running_timers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null,
  started_at timestamptz not null default now(),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint running_timers_owner_key unique (owner_id),
  constraint running_timers_project_owner_fkey foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete restrict,
  constraint running_timers_description_length check (
    description is null
    or (description = btrim(description, E' \t\r\n') and char_length(description) between 1 and 1000)
  )
);

create index running_timers_project_idx on public.running_timers (project_id);

-- Unveränderliches schützen (die Spaltenrechte erlauben dem Browser ohnehin nur die Beschreibung)
create function public.running_timers_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.project_id := old.project_id;
  new.started_at := old.started_at;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

create trigger running_timers_before_update before update on public.running_timers
  for each row execute function public.running_timers_before_update();

-- ===== Row Level Security: lesen und nur die Beschreibung ändern; kein Anlegen, kein Löschen =====

alter table public.running_timers enable row level security;

create policy running_timers_select_own on public.running_timers
  for select to authenticated using (owner_id = (select auth.uid()));
create policy running_timers_update_own on public.running_timers
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

revoke all on public.running_timers from public, anon, authenticated;
grant select on public.running_timers to authenticated;
grant update (description) on public.running_timers to authenticated;

-- ===== PROJ-4-Regel: Ausnahme für den Stopp eines Timers =====
-- Ein Timer, der bei einem inzwischen archivierten Projekt weiterlief, darf beim Stopp seinen Eintrag
-- speichern (Spec PROJ-3). Die Ausnahme gilt nur, solange die Stopp-Funktion die Sitzungsvariable
-- app.timer_stop setzt; von aussen (REST) lässt sie sich nicht setzen.

create or replace function public.time_entries_before_insert() returns trigger
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

  if new.entry_date > (now() at time zone 'Europe/Zurich')::date then
    raise exception 'date_in_future' using errcode = '23514';
  end if;

  select p.archived, c.archived into v_project_archived, v_customer_archived
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = new.project_id;
  if not found then
    raise exception 'target_not_found' using errcode = '23503';
  end if;
  if (v_project_archived or v_customer_archived)
     and coalesce(current_setting('app.timer_stop', true), '') <> '1' then
    raise exception 'target_archived' using errcode = '23514';
  end if;
  return new;
end $$;

-- ===== Interne Hilfsfunktionen (nur von den Timer-Funktionen aufrufbar) =====

-- Timer als JSON für die Anzeige (mit Namen von Projekt und Kunde)
create function public.timer_json(p_timer public.running_timers) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p_timer.id,
    'project_id', p_timer.project_id,
    'project_name', p.name,
    'customer_id', c.id,
    'customer_code', c.code,
    'customer_name', c.name,
    'started_at', p_timer.started_at,
    'description', p_timer.description
  )
  from public.projects p
  join public.customers c on c.id = p.customer_id
  where p.id = p_timer.project_id
$$;

-- Beendet einen Timer: schneidet Start und Ende auf die volle Minute ab, teilt nach Kalendertagen der
-- Zürcher Uhr auf und legt pro Tag einen Eintrag an (verrechenbar = Dauer). Unter einer Minute: kein
-- Eintrag. Löscht den Timer nicht (macht der Aufrufer).
create function public.finish_timer_internal(p_timer public.running_timers, p_description text, p_end timestamptz)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_desc text := nullif(btrim(coalesce(p_description, ''), E' \t\r\n'), '');
  v_start timestamptz := date_trunc('minute', p_timer.started_at);
  v_end timestamptz := date_trunc('minute', p_end);
  l_start timestamp;
  l_end timestamp;
  v_day date;
  v_seg_start timestamp;
  v_seg_end timestamp;
  v_minutes integer;
  v_total integer := 0;
  v_entries jsonb := '[]'::jsonb;
  v_entry public.time_entries;
  v_project_name text;
  v_customer_code text;
  v_customer_name text;
begin
  if v_desc is not null and char_length(v_desc) > 1000 then
    raise exception 'description_too_long' using errcode = '23514';
  end if;

  select p.name, c.code, c.name into v_project_name, v_customer_code, v_customer_name
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = p_timer.project_id;

  if v_end > v_start then
    l_start := v_start at time zone 'Europe/Zurich';
    l_end := v_end at time zone 'Europe/Zurich';
    perform set_config('app.timer_stop', '1', true);
    for v_day in
      select d::date from generate_series(l_start::date::timestamp, l_end::date::timestamp, interval '1 day') d
    loop
      v_seg_start := greatest(l_start, v_day::timestamp);
      v_seg_end := least(l_end, v_day::timestamp + interval '1 day');
      v_minutes := (extract(epoch from (v_seg_end - v_seg_start)) / 60)::integer;
      continue when v_minutes < 1;
      insert into public.time_entries
        (project_id, entry_date, duration_minutes, billable_minutes, start_time, end_time, description)
        values (
          p_timer.project_id, v_day, v_minutes, v_minutes, v_seg_start::time,
          case when v_seg_end = v_day::timestamp + interval '1 day' then time '24:00:00' else v_seg_end::time end,
          v_desc
        )
        returning * into v_entry;
      v_total := v_total + v_minutes;
      v_entries := v_entries || jsonb_build_object(
        'id', v_entry.id,
        'entry_date', v_entry.entry_date,
        'duration_minutes', v_entry.duration_minutes,
        'start_time', v_entry.start_time,
        'end_time', v_entry.end_time
      );
    end loop;
    perform set_config('app.timer_stop', '0', true);
  end if;

  return jsonb_build_object(
    'project_id', p_timer.project_id,
    'project_name', v_project_name,
    'customer_code', v_customer_code,
    'customer_name', v_customer_name,
    'too_short', jsonb_array_length(v_entries) = 0,
    'total_minutes', v_total,
    'entries', v_entries
  );
end $$;

-- ===== Öffentliche Funktionen (nur für angemeldete Nutzer) =====

-- Aktueller Timer des Nutzers und Serverzeit
create function public.get_timer() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_timer public.running_timers;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select * into v_timer from public.running_timers where owner_id = v_uid;
  return jsonb_build_object(
    'timer', case when found then public.timer_json(v_timer) else null end,
    'server_now', now()
  );
end $$;

-- Startet einen Timer bei einem aktiven eigenen Projekt. Läuft schon ein Timer bei einem anderen
-- Projekt, wird er wie beim Stopp gespeichert (oder bei unter einer Minute verworfen).
create function public.start_timer(p_project_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_project_archived boolean;
  v_customer_archived boolean;
  v_old public.running_timers;
  v_new public.running_timers;
  v_finished jsonb := null;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  -- Ein Nutzer, ein Schritt nach dem anderen (zwei Geräte gleichzeitig)
  perform pg_advisory_xact_lock(hashtextextended('timer:' || v_uid::text, 0));

  select p.archived, c.archived into v_project_archived, v_customer_archived
    from public.projects p
    join public.customers c on c.id = p.customer_id
    where p.id = p_project_id and p.owner_id = v_uid;
  if not found then
    raise exception 'target_not_found' using errcode = '23503';
  end if;
  if v_project_archived or v_customer_archived then
    raise exception 'target_archived' using errcode = '23514';
  end if;

  select * into v_old from public.running_timers where owner_id = v_uid;
  if found then
    if v_old.project_id = p_project_id then
      return jsonb_build_object(
        'timer', public.timer_json(v_old), 'finished', null,
        'already_running', true, 'server_now', now()
      );
    end if;
    v_finished := public.finish_timer_internal(v_old, null, now());
    delete from public.running_timers where id = v_old.id;
  end if;

  insert into public.running_timers (owner_id, project_id) values (v_uid, p_project_id)
    returning * into v_new;
  return jsonb_build_object(
    'timer', public.timer_json(v_new), 'finished', v_finished,
    'already_running', false, 'server_now', now()
  );
end $$;

-- Stoppt den Timer und speichert die Einträge. p_description ist der letzte Stand des Textes
-- (null = gespeicherten Text behalten, leer = keine Beschreibung).
create function public.stop_timer(p_description text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_timer public.running_timers;
  v_finished jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('timer:' || v_uid::text, 0));

  select * into v_timer from public.running_timers where owner_id = v_uid;
  if not found then
    raise exception 'no_timer' using errcode = 'P0002';
  end if;
  v_finished := public.finish_timer_internal(v_timer, coalesce(p_description, v_timer.description), now());
  delete from public.running_timers where id = v_timer.id;
  return jsonb_build_object('finished', v_finished, 'server_now', now());
end $$;

-- Verwirft den Timer ohne Eintrag (löscht nur die Timer-Zeile, nie einen Zeiteintrag)
create function public.discard_timer() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('timer:' || v_uid::text, 0));
  delete from public.running_timers where owner_id = v_uid;
  get diagnostics v_deleted = row_count;
  return jsonb_build_object('discarded', v_deleted > 0, 'server_now', now());
end $$;

-- Rechte: Hilfsfunktionen nur intern, öffentliche Funktionen nur für angemeldete Nutzer
revoke all on function public.timer_json(public.running_timers) from public, anon, authenticated;
revoke all on function public.finish_timer_internal(public.running_timers, text, timestamptz) from public, anon, authenticated;
revoke all on function public.get_timer() from public, anon;
revoke all on function public.start_timer(uuid) from public, anon;
revoke all on function public.stop_timer(text) from public, anon;
revoke all on function public.discard_timer() from public, anon;
grant execute on function public.get_timer() to authenticated;
grant execute on function public.start_timer(uuid) to authenticated;
grant execute on function public.stop_timer(text) to authenticated;
grant execute on function public.discard_timer() to authenticated;
