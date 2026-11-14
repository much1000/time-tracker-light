-- PROJ-5: Zeiten prüfen und korrigieren
-- Neu ist nur ein Recht: Der angemeldete Nutzer darf seine eigenen Zeiteinträge löschen.
-- Kunden, Projekte und laufende Timer bleiben unlöschbar für den Browser.
-- (Das Ändern eigener Zeiteinträge mit allen Prüfregeln besteht seit PROJ-4.)

create policy time_entries_delete_own on public.time_entries
  for delete to authenticated using (owner_id = (select auth.uid()));

grant delete on public.time_entries to authenticated;
