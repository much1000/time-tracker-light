-- PROJ-5: Prüfung des Löschrechts für Zeiteinträge.
-- Ausführen im Supabase-SQL-Editor (alles markieren, Run). Das Skript legt Testdaten an, prüft und
-- bricht am Ende bewusst mit einem Fehler «RESULT ...» ab: Dadurch wird ALLES zurückgerollt (nichts bleibt
-- in der Datenbank, auch keine echten Einträge werden gelöscht: gelöscht wird nur, was das Skript selbst
-- in dieser Transaktion angelegt hat). Der Text des Fehlers ist das Ergebnis: Jede Zeile muss «ok» oder den
-- erwarteten Wert zeigen, Zeilen mit «(bad)» wären Fehler.
-- Die zwei Nutzer-IDs unten sind echte Konten dieses Projekts.

do $$
declare
  u1 uuid := '150d508a-6fa5-41e6-8af4-d0e4560327de';
  u2 uuid := '17bb69ca-f2e7-4b05-9ee4-e08c3ac67263';
  r text := '';
  c public.customers; pid uuid; pid2 uuid; e1 uuid; e2 uuid; e3 uuid; n int; total_before int;
  today date := (now() at time zone 'Europe/Zurich')::date;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  c := public.create_customer('T-QDL1', 'Loeschen Test');
  select id into pid from public.projects where customer_id = c.id and name = 'Allgemein';
  insert into public.projects(customer_id, name) values (c.id, 'Zweit') returning id into pid2;
  insert into public.time_entries(project_id, entry_date, duration_minutes, billable_minutes, description) values (pid, today, 30, 30, 'E1') returning id into e1;
  insert into public.time_entries(project_id, entry_date, duration_minutes, billable_minutes, description) values (pid, today, 40, 40, 'E2') returning id into e2;
  insert into public.time_entries(project_id, entry_date, duration_minutes, billable_minutes, start_time, end_time) values (pid2, today - 40, 120, 120, '22:00', '24:00') returning id into e3;
  select count(*) into total_before from public.time_entries where owner_id = u1;
  r := r || 'angelegt: eigene Eintraege gesamt=' || total_before || E'\n';

  -- anderer Nutzer: sieht nichts, kann nichts löschen oder ändern, auch ohne Bedingung nicht
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  select count(*) into n from public.time_entries; r := r || 'u2 sieht Eintraege=' || n || ' (erwartet 0)' || E'\n';
  delete from public.time_entries where id = e1; get diagnostics n = row_count;
  r := r || 'u2 delete gezielt rows=' || n || ' (erwartet 0)' || E'\n';
  delete from public.time_entries; get diagnostics n = row_count;
  r := r || 'u2 delete ohne Bedingung rows=' || n || ' (erwartet 0)' || E'\n';
  update public.time_entries set description = 'hacked'; get diagnostics n = row_count;
  r := r || 'u2 update rows=' || n || ' (erwartet 0)' || E'\n';

  -- Besitzer: Einträge des Besitzers sind unverändert da
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  select count(*) into n from public.time_entries where owner_id = u1;
  r := r || 'u1 Eintraege nach u2-Versuchen=' || n || ' (erwartet ' || total_before || ')' || E'\n';
  select count(*) into n from public.time_entries where description = 'hacked'; r := r || 'u1 Eintraege mit hacked=' || n || ' (erwartet 0)' || E'\n';

  -- Ändern: verschieben auf anderes Datum und Projekt, Anlegezeitpunkt bleibt
  update public.time_entries set entry_date = today - 5, project_id = pid2, description = 'E1 geaendert' where id = e1; get diagnostics n = row_count;
  r := r || 'u1 update rows=' || n || E'\n';
  select count(*) into n from public.time_entries where id = e1 and entry_date = today - 5 and project_id = pid2; r := r || 'verschoben ok=' || n || E'\n';
  begin update public.time_entries set entry_date = today + 1 where id = e1; r := r || 'UPDATE FUTURE ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'update auf Zukunft abgelehnt ok' || E'\n'; end;
  begin update public.time_entries set billable_minutes = 999 where id = e1; r := r || 'UPDATE BILLABLE>DUR ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'update verrechenbar>Dauer abgelehnt ok' || E'\n'; end;
  begin update public.time_entries set owner_id = u2 where id = e1; get diagnostics n = row_count;
    select count(*) into n from public.time_entries where id = e1 and owner_id = u1; r := r || 'owner unveraendert=' || n || ' (erwartet 1)' || E'\n';
  exception when others then r := r || 'owner update: ' || sqlerrm || E'\n'; end;

  -- Archiviertes Projekt: Bearbeiten ohne Wechsel ok, Wechsel auf archiviertes nicht
  perform public.archive_customer(c.id);
  update public.time_entries set description = 'auf archiviert korrigiert' where id = e2; get diagnostics n = row_count;
  r := r || 'archiviertes Projekt bearbeiten rows=' || n || ' (erwartet 1)' || E'\n';
  begin update public.time_entries set project_id = pid2 where id = e2; r := r || 'MOVE TO ARCHIVED ACCEPTED(bad)' || E'\n';
  exception when check_violation then r := r || 'verschieben auf archiviertes Projekt abgelehnt ok' || E'\n'; end;
  perform public.reactivate_customer(c.id);

  -- Löschen: nur eigene, genau eine Zeile; ein zweites Mal ohne Wirkung
  delete from public.time_entries where id = e2; get diagnostics n = row_count;
  r := r || 'u1 delete e2 rows=' || n || ' (erwartet 1)' || E'\n';
  delete from public.time_entries where id = e2; get diagnostics n = row_count;
  r := r || 'u1 delete e2 nochmal rows=' || n || ' (erwartet 0)' || E'\n';
  select count(*) into n from public.time_entries where owner_id = u1; r := r || 'u1 Eintraege uebrig=' || n || ' (erwartet ' || (total_before - 1) || ')' || E'\n';
  -- Eintrag bis 24:00 lässt sich löschen
  delete from public.time_entries where id = e3; get diagnostics n = row_count; r := r || 'u1 delete 24:00-Eintrag rows=' || n || E'\n';

  -- Kunden, Projekte, Timer: kein Löschrecht
  begin delete from public.projects where id = pid; r := r || 'PROJECT DELETE ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'projects delete verweigert ok' || E'\n'; end;
  begin delete from public.customers where id = c.id; r := r || 'CUSTOMER DELETE ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'customers delete verweigert ok' || E'\n'; end;
  begin delete from public.running_timers; r := r || 'TIMER DELETE ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'running_timers delete verweigert ok' || E'\n'; end;

  -- Ohne Anmeldung
  reset role; set local role anon;
  begin delete from public.time_entries; r := r || 'ANON DELETE ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon delete verweigert ok' || E'\n'; end;
  begin select count(*) into n from public.time_entries; r := r || 'ANON SELECT ALLOWED(bad)' || E'\n';
  exception when insufficient_privilege then r := r || 'anon select verweigert ok' || E'\n'; end;

  reset role;
  raise exception E'RESULT\n%', r;
end $$;
