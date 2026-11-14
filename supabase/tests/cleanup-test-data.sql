-- Aufräumen der Testdaten (Supabase-SQL-Editor: alles markieren, Run).
--
-- Die automatischen Tests (Playwright) legen Testkunden mit Kürzel «T-…» an und buchen Zeiteinträge auf sie.
-- In der App gibt es noch kein Löschen (kommt mit PROJ-5), darum bleiben diese Einträge sonst bestehen und
-- erscheinen unter «Heute».
--
-- Dieses Skript betrifft NUR Daten von Kunden, deren Kürzel mit «T-» beginnt. Echte Kunden (z. B. «MUS»)
-- und ihre Zeiten bleiben unberührt. Falls du selbst einen Kunden mit Kürzel «T-…» angelegt hast, ändere
-- unten das Muster oder führe zuerst nur Schritt 1 aus.

-- ===== Schritt 1: Vorschau (ändert nichts) =====
-- Zeigt, was Schritt 2 löschen würde: Anzahl Zeiteinträge und laufende Timer pro Testkunde.
select
  c.code,
  c.name,
  c.archived,
  (select count(*) from public.time_entries e
     join public.projects p on p.id = e.project_id
     where p.customer_id = c.id) as zeiteintraege,
  (select count(*) from public.running_timers t
     join public.projects p on p.id = t.project_id
     where p.customer_id = c.id) as laufende_timer
from public.customers c
where c.code like 'T-%'
order by c.code;

-- ===== Schritt 2: Löschen =====
-- Löscht alle Zeiteinträge und laufenden Timer auf Testkunden und archiviert übrig gebliebene aktive
-- Testkunden samt ihren Projekten. Kunden und Projekte selbst werden nie gelöscht (bleiben im Archiv).
-- Am Ende steht in «Results» eine Zeile mit den Anzahlen.

with
  gelöschte_timer as (
    delete from public.running_timers
    where project_id in (
      select p.id from public.projects p
      join public.customers c on c.id = p.customer_id
      where c.code like 'T-%'
    )
    returning id
  ),
  gelöschte_eintraege as (
    delete from public.time_entries
    where project_id in (
      select p.id from public.projects p
      join public.customers c on c.id = p.customer_id
      where c.code like 'T-%'
    )
    returning id
  ),
  archivierte_kunden as (
    update public.customers
      set archived = true, archived_at = now()
      where code like 'T-%' and not archived
    returning id
  ),
  archivierte_projekte as (
    update public.projects
      set archived = true, archived_at = now(), archived_with_customer = true
      where customer_id in (select id from public.customers where code like 'T-%')
        and not archived
    returning id
  )
select
  (select count(*) from gelöschte_eintraege) as zeiteintraege_geloescht,
  (select count(*) from gelöschte_timer) as timer_geloescht,
  (select count(*) from archivierte_kunden) as kunden_archiviert,
  (select count(*) from archivierte_projekte) as projekte_archiviert;

-- ===== Schritt 3: Kontrolle =====
-- Erwartet: 0 Zeiteinträge auf Testkunden und kein aktiver Testkunde.
select
  (select count(*) from public.time_entries e
     join public.projects p on p.id = e.project_id
     join public.customers c on c.id = p.customer_id
     where c.code like 'T-%') as zeiteintraege_auf_testkunden,
  (select count(*) from public.customers where code like 'T-%' and not archived) as aktive_testkunden;
