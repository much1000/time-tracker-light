-- PROJ-6: Prüfung der Datenbankregeln des Timers.
-- Ausführen im Supabase-SQL-Editor (alles markieren, Run). Das Skript legt Testdaten an, prüft und
-- bricht am Ende bewusst mit einem Fehler «RESULT ...» ab: Dadurch wird ALLES zurückgerollt (nichts bleibt
-- in der Datenbank). Der Text des Fehlers ist das Ergebnis: Jede Zeile muss «ok» oder den erwarteten Wert
-- zeigen, Zeilen mit «(bad)» wären Fehler. Die zwei Nutzer-IDs unten sind echte Konten dieses Projekts.

create function pg_temp.fin(p_uid uuid, p_project uuid, p_start timestamptz, p_end timestamptz, p_desc text) returns text
language plpgsql as $$
declare t public.running_timers; fin jsonb; s text;
begin
  delete from public.running_timers where owner_id = p_uid;
  insert into public.running_timers(owner_id, project_id, started_at) values (p_uid, p_project, p_start) returning * into t;
  fin := public.finish_timer_internal(t, p_desc, p_end);
  delete from public.running_timers where owner_id = p_uid;
  select coalesce(string_agg((e->>'entry_date') || ' ' || (e->>'start_time') || '-' || (e->>'end_time') || ' ' || (e->>'duration_minutes') || 'min', ' | ' order by e->>'entry_date'), '-') into s
    from jsonb_array_elements(fin->'entries') e;
  return 'too_short=' || (fin->>'too_short') || ' total=' || (fin->>'total_minutes') || ' [' || s || ']';
end $$;

do $$
declare
  u1 uuid := '150d508a-6fa5-41e6-8af4-d0e4560327de';
  u2 uuid := '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263';
  r text := '';
  c public.customers; pid uuid; pid2 uuid; res jsonb; n int; tid uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  c := public.create_customer('T-QTM1', 'Timer Test Kunde');
  select id into pid from public.projects where customer_id = c.id and name = 'Allgemein';
  insert into public.projects(customer_id, name) values (c.id, 'Zweit') returning id into pid2;

  res := public.get_timer();
  r := r || 'get none: timer_null=' || (res->'timer' = 'null'::jsonb) || ' server_now=' || (res->>'server_now' is not null) || E'\n';
  res := public.start_timer(pid);
  select count(*) into n from public.running_timers;
  r := r || 'start: already=' || (res->>'already_running') || ' timers=' || n || ' name=' || (res->'timer'->>'customer_code') || '/' || (res->'timer'->>'project_name') || E'\n';
  tid := (res->'timer'->>'id')::uuid;
  res := public.start_timer(pid);
  select count(*) into n from public.running_timers;
  r := r || 'start same project: already=' || (res->>'already_running') || ' timers=' || n || E'\n';
  res := public.start_timer(pid2);
  select count(*) into n from public.running_timers;
  r := r || 'switch <1min: finished.too_short=' || (res->'finished'->>'too_short') || ' timers=' || n || ' new_project_ok=' || ((res->'timer'->>'project_id')::uuid = pid2) || E'\n';
  res := public.stop_timer('abc');
  select count(*) into n from public.running_timers;
  r := r || 'stop <1min: too_short=' || (res->'finished'->>'too_short') || ' timers_left=' || n || E'\n';
  begin perform public.stop_timer(); r := r || 'STOP WITHOUT TIMER ACCEPTED(bad)' || E'\n';
  exception when sqlstate 'P0002' then r := r || 'stop without timer -> no_timer ok' || E'\n'; end;
  res := public.discard_timer();
  r := r || 'discard without timer: discarded=' || (res->>'discarded') || E'\n';

  -- Zeitlogik deterministisch
  reset role;
  r := r || 'A 08:30:20-10:00:40 (erwartet 1 Eintrag 08:30-10:00 90min): ' || pg_temp.fin(u1, pid, '2026-11-10 08:30:20+01', '2026-11-10 10:00:40+01', 'Text A') || E'\n';
  r := r || 'B gleiche Minute (erwartet zu kurz): ' || pg_temp.fin(u1, pid, '2026-11-10 08:30:10+01', '2026-11-10 08:30:50+01', null) || E'\n';
  r := r || 'B2 08:30:50-08:31:10 (erwartet 1 min): ' || pg_temp.fin(u1, pid, '2026-11-10 08:30:50+01', '2026-11-10 08:31:10+01', null) || E'\n';
  r := r || 'C ueber Mitternacht (erwartet 23:30-24:00 30min | 00:00-00:40 40min): ' || pg_temp.fin(u1, pid, '2026-11-09 23:30:00+01', '2026-11-10 00:40:30+01', 'Nacht') || E'\n';
  r := r || 'D drei Tage (erwartet 22:00-24:00 120 | 00:00-24:00 1440 | 00:00-01:00 60): ' || pg_temp.fin(u1, pid, '2026-11-07 22:00:30+01', '2026-11-09 01:00:45+01', 'Lang') || E'\n';
  r := r || 'E endet genau Mitternacht (erwartet 1 Eintrag 22:00-24:00 120min): ' || pg_temp.fin(u1, pid, '2026-11-05 22:00:00+01', '2026-11-06 00:00:00+01', null) || E'\n';
  r := r || 'F Sommerzeit 29.3.2026 01:30 CET bis 04:00 CEST (Uhrzeit-Differenz 150min): ' || pg_temp.fin(u1, pid, '2026-03-29 01:30:00+01', '2026-03-29 04:00:00+02', null) || E'\n';
  r := r || 'G Winterzeit 24.-26.10.2026 (erwartet 60 | 1440 | 30): ' || pg_temp.fin(u1, pid, '2026-10-24 23:00:00+02', '2026-10-26 00:30:00+01', null) || E'\n';
  begin r := r || pg_temp.fin(u1, pid, '2026-11-10 08:00+01', '2026-11-10 09:00+01', repeat('x', 1001)); r := r || 'DESC1001 ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'description 1001 rejected ok' || E'\n'; end;
  select count(*) into n from public.time_entries where description = 'Nacht';
  r := r || 'Beschreibung in jedem Tageseintrag (Nacht): ' || n || ' (erwartet 2)' || E'\n';
  select count(*) into n from public.time_entries where end_time = '24:00:00';
  r := r || 'Eintraege mit Ende 24:00: ' || n || E'\n';

  -- archiviertes Projekt: Stopp darf speichern, direktes Anlegen und Start nicht
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  res := public.start_timer(pid);
  reset role;
  update public.running_timers set started_at = '2026-11-02 09:00:30+01' where owner_id = u1;
  set local role authenticated;
  perform public.archive_customer(c.id);
  begin insert into public.time_entries(project_id, entry_date, duration_minutes, billable_minutes) values (pid, '2026-11-02', 10, 10); r := r || 'ARCHIVED DIRECT INSERT ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'direct insert on archived rejected ok' || E'\n'; end;
  begin perform public.start_timer(pid2); r := r || 'START ON ARCHIVED ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'start on archived rejected ok' || E'\n'; end;
  res := public.stop_timer('Archiviert');
  r := r || 'stop on archived project: too_short=' || (res->'finished'->>'too_short') || ' total=' || (res->'finished'->>'total_minutes') || E'\n';
  perform public.reactivate_customer(c.id);
  select count(*) into n from public.time_entries where description = 'Archiviert';
  r := r || 'Eintraege nach archiviertem Stopp (mehrtaegig, >=2): ' || n || E'\n';
  begin insert into public.time_entries(project_id, entry_date, duration_minutes, billable_minutes) values (pid, '2026-11-02', 10, 10); r := r || 'direct insert ok (active again)' || E'\n';
  exception when others then r := r || 'direct insert after reactivate FAILED(bad) ' || sqlerrm || E'\n'; end;

  -- Direkte Zugriffe als Besitzer
  res := public.start_timer(pid);
  begin insert into public.running_timers(project_id) values (pid2); r := r || 'DIRECT INSERT ACCEPTED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'direct insert timer denied ok' || E'\n'; end;
  begin delete from public.running_timers; r := r || 'DIRECT DELETE ACCEPTED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'direct delete timer denied ok' || E'\n'; end;
  begin update public.running_timers set project_id = pid2; r := r || 'UPDATE PROJECT ACCEPTED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'update project denied ok' || E'\n'; end;
  begin update public.running_timers set started_at = now() - interval '5 hours'; r := r || 'UPDATE STARTED_AT ACCEPTED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'update started_at denied ok' || E'\n'; end;
  begin update public.running_timers set owner_id = u2; r := r || 'UPDATE OWNER ACCEPTED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'update owner denied ok' || E'\n'; end;
  update public.running_timers set description = 'Live Text'; get diagnostics n = row_count;
  r := r || 'update description rows=' || n || E'\n';
  begin update public.running_timers set description = repeat('x', 1001); r := r || 'DESC1001 UPDATE ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'timer description 1001 rejected ok' || E'\n'; end;
  begin update public.running_timers set description = ' Rand '; r := r || 'PADDED DESC ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'timer padded description rejected ok' || E'\n'; end;
  begin perform public.finish_timer_internal((select t from public.running_timers t limit 1), null, now()); r := r || 'INTERNAL FN CALLABLE(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'internal function denied ok' || E'\n'; end;
  res := public.get_timer();
  r := r || 'get after update: description=' || (res->'timer'->>'description') || E'\n';

  -- anderer Nutzer
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.running_timers; r := r || 'u2 sees timers=' || n || ' (erwartet 0)' || E'\n';
  update public.running_timers set description = 'hacked'; get diagnostics n = row_count;
  r := r || 'u2 update rows=' || n || ' (erwartet 0)' || E'\n';
  res := public.get_timer(); r := r || 'u2 get_timer null=' || (res->'timer' = 'null'::jsonb) || E'\n';
  begin perform public.stop_timer(); r := r || 'U2 STOP ACCEPTED(bad)' || E'\n';
  exception when sqlstate 'P0002' then r := r || 'u2 stop -> no_timer ok' || E'\n'; end;
  res := public.discard_timer(); r := r || 'u2 discard: discarded=' || (res->>'discarded') || ' (erwartet false)' || E'\n';
  begin perform public.start_timer(pid); r := r || 'U2 START ON FOREIGN PROJECT ACCEPTED(bad)' || E'\n';
  exception when foreign_key_violation then r := r || 'u2 start on foreign project rejected ok' || E'\n'; end;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.running_timers; r := r || 'u1 timer still there=' || n || E'\n';

  -- anon
  reset role; set local role anon;
  begin perform public.get_timer(); r := r || 'ANON get_timer ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon get_timer denied ok' || E'\n'; end;
  begin perform public.start_timer(pid); r := r || 'ANON start_timer ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon start_timer denied ok' || E'\n'; end;
  begin perform public.stop_timer(); r := r || 'ANON stop_timer ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon stop_timer denied ok' || E'\n'; end;
  begin perform public.discard_timer(); r := r || 'ANON discard_timer ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon discard_timer denied ok' || E'\n'; end;
  begin select count(*) into n from public.running_timers; r := r || 'ANON select ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon select timers denied ok' || E'\n'; end;

  -- Eindeutigkeit
  reset role;
  begin insert into public.running_timers(owner_id, project_id) values (u1, pid2); r := r || 'SECOND TIMER ACCEPTED(bad)' || E'\n';
  exception when unique_violation then r := r || 'second timer per user rejected ok' || E'\n'; end;

  raise exception E'RESULT\n%', r;
end $$;
