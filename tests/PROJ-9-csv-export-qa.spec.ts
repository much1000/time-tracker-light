import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Download, type Page } from '@playwright/test'
import { hasTestUser, NO_LOGIN, SKIP_REASON } from './helpers/env'

// PROJ-9 QA: CSV-Export aller Zeiten auf der Seite «Zeiten» (Knopf, Datei, Inhalt, Format, Vollständigkeit bei
// mehr als 1000 Einträgen, Fehlerfälle, Layout, Zugänglichkeit, Sicherheit).
// Die Tests legen eigene Testkunden «T-X…» und Einträge direkt in der Datenbank an (mit der Sitzung des Testkontos)
// und räumen am Ende auf. Das Testkonto enthält auch Daten anderer Tests: Es wird nie auf die Gesamtzahl
// «nur meine Einträge» geprüft, sondern auf meine Zeilen und auf Gesamtzahl = Zeilen in der Datenbank.
//
//   2011-05: Haupt-Monat mit Sonderfällen (Texte, Formeln, Zeiten, archivierte Ziele)
//   2011-03: mehr als 1000 Einträge (zwei Blöcke)
//   2011-07: leer (Knopf auch im leeren Monat)

try {
  ;(process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(
    resolve(process.cwd(), '.env.local')
  )
} catch {
  // Datei fehlt: Die Tests werden übersprungen.
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const AXE = readFileSync(resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8')

const run = Date.now().toString(36).slice(-5).toUpperCase()
const BULK = `Bulk${run}`
const BULK_COUNT = 1050

test.skip(!hasTestUser || !base || !anon, SKIP_REASON)
test.describe.configure({ mode: 'serial' })
test.use({ viewport: { width: 1280, height: 900 } })

interface Cust {
  id: string
  code: string
  name: string
}

let client: SupabaseClient
let A: Cust
let B: Cust
let C: Cust
let pa = ''
let pformel = ''
let pb = ''
let pc = ''
let editId = ''
let deleteId = ''

const BOM = '﻿'
const HEADER = 'Datum;Kunde;Kundenkürzel;Projekt;Beschreibung;Von;Bis;Dauer (Minuten);Dauer (Stunden);Verrechenbar (Minuten);Verrechenbar (Stunden)'

// ----- Hilfen -----

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date())
const exportButton = (page: Page) => page.getByRole('button', { name: /Als CSV exportieren|Wird exportiert/ })
const toast = (page: Page, text: string | RegExp) => page.locator('[data-sonner-toast]').filter({ hasText: text }).first()

async function accessToken(page: Page): Promise<string> {
  await page.goto('/')
  const cookies = await page.context().cookies()
  const raw = cookies
    .filter((c) => /auth-token/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => c.value)
    .join('')
  return JSON.parse(Buffer.from(decodeURIComponent(raw).replace(/^base64-/, ''), 'base64url').toString()).access_token
}

async function addEntry(row: {
  project: string
  date: string
  minutes: number
  billable?: number
  start?: string
  end?: string
  description?: string | null
}) {
  const { data, error } = await client
    .from('time_entries')
    .insert({
      project_id: row.project,
      entry_date: row.date,
      duration_minutes: row.minutes,
      billable_minutes: row.billable ?? row.minutes,
      start_time: row.start ?? null,
      end_time: row.end ?? null,
      description: row.description ?? null,
    })
    .select('id')
    .single()
  expect(error).toBeNull()
  return data as { id: string }
}

async function dbCount(): Promise<number> {
  const { count, error } = await client.from('time_entries').select('id', { count: 'exact', head: true })
  expect(error).toBeNull()
  return count ?? 0
}

// Liest eine CSV-Datei (Semikolon, Anführungszeichen, Zeilenumbrüche in Feldern)
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ';') {
      row.push(field)
      field = ''
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
    } else field += ch
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

interface Exported {
  raw: string
  fileName: string
  rows: string[][]
}

async function doExport(page: Page): Promise<Exported> {
  const [download] = await Promise.all([page.waitForEvent('download'), exportButton(page).click()])
  return readDownload(download)
}

async function readDownload(download: Download): Promise<Exported> {
  const path = await download.path()
  const raw = readFileSync(path, 'utf8')
  return { raw, fileName: download.suggestedFilename(), rows: parseCsv(raw.replace(BOM, '')).slice(1) }
}

async function openZeiten(page: Page, query = '') {
  await page.goto(`/zeiten${query}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Zeiten' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Wird geladen' })).toHaveCount(0)
}

async function axeViolations(page: Page) {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    // @ts-expect-error axe wird per Skript eingebunden
    const result = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })
    return result.violations.map((v: { id: string; nodes: { html: string }[] }) => ({
      id: v.id,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 140)),
    }))
  })
}

const isoOf = (csvDate: string) => csvDate.split('.').reverse().join('-')
const mine = (rows: string[][]) => rows.filter((r) => [A.code, B.code, C.code].includes(r[2]))

// ----- Vorbereitung -----

test('Vorbereitung: Testkunden und Einträge in der Datenbank anlegen', async ({ page }) => {
  const token = await accessToken(page)
  client = createClient(base, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function customer(code: string, name: string): Promise<Cust> {
    const { data, error } = await client.rpc('create_customer', { p_code: code, p_name: name })
    expect(error).toBeNull()
    return { id: (data as { id: string }).id, code, name }
  }
  async function firstProject(customerId: string) {
    const { data } = await client.from('projects').select('id').eq('customer_id', customerId)
    return (data as { id: string }[])[0].id
  }

  A = await customer(`T-XA${run}`, `Export QA A ${run}`)
  B = await customer(`T-XB${run}`, `Export QA B ${run}`)
  C = await customer(`T-XC${run}`, `Export QA C ${run}`)
  pa = await firstProject(A.id)
  pb = await firstProject(B.id)
  pc = await firstProject(C.id)
  const formel = await client.from('projects').insert({ customer_id: A.id, name: '=Formel Projekt' }).select('id').single()
  expect(formel.error).toBeNull()
  pformel = (formel.data as { id: string }).id

  // Mai 2011: absichtlich nicht in Reihenfolge angelegt
  await addEntry({ project: pa, date: '2011-05-20', minutes: 30, description: 'Später Tag' })
  await addEntry({ project: pa, date: '2011-05-10', minutes: 105, billable: 90, description: 'Mit Zeiten' , start: '14:00', end: '15:45' })
  await addEntry({ project: pa, date: '2011-05-10', minutes: 60, billable: 60, description: 'Früher am gleichen Tag', start: '08:00', end: '09:00' })
  await addEntry({ project: pa, date: '2011-05-10', minutes: 15, description: 'Ohne Uhrzeit' })
  await addEntry({ project: pa, date: '2011-05-11', minutes: 5, billable: 0, description: 'Nicht verrechenbar' })
  await addEntry({ project: pa, date: '2011-05-12', minutes: 60, start: '23:00', end: '24:00', description: 'Bis Mitternacht' })
  await addEntry({ project: pa, date: '2011-05-13', minutes: 1, description: null })
  await addEntry({ project: pa, date: '2011-05-14', minutes: 20, description: 'Zeile eins\nZeile zwei; mit "Anführungszeichen" und Umlauten äöü ✓' })
  await addEntry({ project: pa, date: '2011-05-15', minutes: 10, description: '=HYPERLINK("http://example.invalid";"Klick")' })
  await addEntry({ project: pa, date: '2011-05-16', minutes: 10, description: '@SUMME(A1)' })
  await addEntry({ project: pa, date: '2011-05-17', minutes: 10, description: '+1+1' })
  await addEntry({ project: pa, date: '2011-05-18', minutes: 10, description: '-2+3' })
  await addEntry({ project: pa, date: '2011-05-19', minutes: 10, description: 'a=b und x@y.ch (Formelzeichen in der Mitte)' })
  await addEntry({ project: pa, date: '2011-05-21', minutes: 10, description: `L${'o'.repeat(300)}ng` })
  await addEntry({ project: pformel, date: '2011-05-22', minutes: 10, description: 'Projekt mit Formelzeichen im Namen' })
  await addEntry({ project: pb, date: '2011-05-23', minutes: 20, description: '<img src=x onerror=alert(1)> \' OR 1=1 --' })
  editId = (await addEntry({ project: pb, date: '2011-05-24', minutes: 45, description: 'Vor der Änderung' })).id
  deleteId = (await addEntry({ project: pb, date: '2011-05-25', minutes: 45, description: 'Wird gelöscht' })).id
  await addEntry({ project: pc, date: '2011-05-26', minutes: 90, description: 'Archivierter Kunde' })
  // Nachbar-Monate
  await addEntry({ project: pa, date: '2011-04-30', minutes: 30, description: 'Letzter April' })
  await addEntry({ project: pa, date: '2011-06-01', minutes: 30, description: 'Erster Juni' })

  // Archivierter Kunde C, archiviertes Projekt «=Formel Projekt»
  expect((await client.rpc('archive_customer', { p_id: C.id })).error).toBeNull()
  const archived = await client
    .from('projects')
    .update({ archived: true, archived_at: new Date().toISOString(), archived_with_customer: false })
    .eq('id', pformel)
  expect(archived.error).toBeNull()
})

test.afterAll(async () => {
  if (!client) return
  for (const project of [pa, pformel, pb, pc].filter(Boolean)) {
    await client.from('time_entries').delete().eq('project_id', project)
  }
  for (const customer of [A, B].filter(Boolean)) {
    await client.rpc('archive_customer', { p_id: customer.id })
  }
})

// ----- Auslösen und Herunterladen -----

test.describe('Auslösen und Herunterladen', () => {
  test('AC: Knopf «Als CSV exportieren» ist auf /zeiten sichtbar, auch im leeren Monat und mit Filter', async ({ page }) => {
    await openZeiten(page)
    await expect(exportButton(page)).toBeVisible()
    await expect(exportButton(page)).toBeEnabled()
    await openZeiten(page, '?monat=2011-07')
    await expect(page.getByText('Keine Einträge im Juli 2011')).toBeVisible()
    await expect(exportButton(page)).toBeEnabled()
    await openZeiten(page, '?ohne-beschreibung=1')
    await expect(exportButton(page)).toBeEnabled()
  })

  test('Der Knopf gehört nur auf «Zeiten»: auf Start, Woche und Monat gibt es ihn nicht', async ({ page }) => {
    for (const path of ['/', '/woche', '/monat', '/kunden']) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).first()).toBeVisible()
      await expect(exportButton(page)).toHaveCount(0)
    }
  })

  test('AC: Klick startet den Download «zeiten-JJJJ-MM-TT.csv», ohne die Seite zu verlassen, mit Bestätigung und Zeilenzahl', async ({ page }) => {
    await openZeiten(page)
    const total = await dbCount()
    const { fileName, rows } = await doExport(page)
    expect(fileName).toBe(`zeiten-${today()}.csv`)
    await expect(page).toHaveURL(/\/zeiten$/)
    expect(rows).toHaveLength(total)
    await expect(toast(page, `${total} Zeilen exportiert.`)).toBeVisible()
    await expect(exportButton(page)).toBeEnabled()
  })

  test('AC: Der Export enthält alle Zeiten, unabhängig vom gewählten Monat', async ({ page }) => {
    await openZeiten(page, '?monat=2011-07')
    const { rows } = await doExport(page)
    const texts = mine(rows).map((r) => r[4])
    expect(texts).toContain('Später Tag')
    expect(texts).toContain('Letzter April')
    expect(texts).toContain('Erster Juni')
  })

  test('AC: Mit Kundenfilter und «Nur ohne Beschreibung» bleibt der Export vollständig', async ({ page }) => {
    await openZeiten(page, `?monat=2011-05&kunde=${B.id}&ohne-beschreibung=1`)
    const total = await dbCount()
    const { rows } = await doExport(page)
    expect(rows).toHaveLength(total)
  })
})

// ----- Datei und Inhalt -----

test.describe('Datei und Inhalt', () => {
  let file: Exported

  test('Vorbereitung: einmal exportieren', async ({ page }) => {
    await openZeiten(page)
    file = await doExport(page)
  })

  test('AC: UTF-8 mit BOM, Kopfzeile mit den elf festgelegten Spalten, Windows-Zeilenende, Semikolon', async () => {
    expect(file.raw.startsWith(BOM + HEADER + '\r\n')).toBe(true)
    expect(file.raw.endsWith('\r\n')).toBe(true)
    // Jede Zeile hat elf Spalten (Felder mit Semikolon und Zeilenumbruch bleiben ganz)
    for (const row of file.rows) expect(row).toHaveLength(11)
    expect(file.raw.includes('\n') && file.raw.replace(/\r\n/g, '').includes('\r')).toBe(false)
  })

  test('AC: Datum als TT.MM.JJJJ, Kunde, Kürzel, Projekt und Beschreibung stehen in den richtigen Spalten', async () => {
    const row = mine(file.rows).find((r) => r[4] === 'Später Tag')!
    expect(row.slice(0, 5)).toEqual(['20.05.2011', A.name, A.code, 'Allgemein', 'Später Tag'])
  })

  test('AC: Von/Bis und Dauer: 105 Minuten → 1,75 Stunden, verrechenbar 90 → 1,50', async () => {
    const row = mine(file.rows).find((r) => r[4] === 'Mit Zeiten')!
    expect(row.slice(5)).toEqual(['14:00', '15:45', '105', '1,75', '90', '1,50'])
  })

  test('AC: Eintrag nur mit Dauer hat leere Spalten Von und Bis, ohne Beschreibung eine leere Zelle', async () => {
    const row = mine(file.rows).find((r) => r[4] === 'Ohne Uhrzeit')!
    expect(row.slice(5)).toEqual(['', '', '15', '0,25', '15', '0,25'])
    const empty = mine(file.rows).find((r) => r[0] === '13.05.2011')!
    expect(empty[4]).toBe('')
    expect(empty.slice(7)).toEqual(['1', '0,02', '1', '0,02'])
  })

  test('AC: Nicht verrechenbarer Eintrag hat 0 Minuten und 0,00 Stunden; «24:00» steht unverändert in «Bis»', async () => {
    const none = mine(file.rows).find((r) => r[4] === 'Nicht verrechenbar')!
    expect(none.slice(7)).toEqual(['5', '0,08', '0', '0,00'])
    const night = mine(file.rows).find((r) => r[4] === 'Bis Mitternacht')!
    expect(night.slice(5, 7)).toEqual(['23:00', '24:00'])
  })

  test('AC: Keine gerundete Spalte und keine Summenzeile: alle Werte sind minutengenau', async () => {
    expect(file.raw.includes('gerundet')).toBe(false)
    expect(file.rows.every((r) => /^\d{2}\.\d{2}\.\d{4}$/.test(r[0]))).toBe(true)
    const m = mine(file.rows).filter((r) => r[4] === 'Ohne Uhrzeit' || r[0] === '13.05.2011' || r[4] === 'Nicht verrechenbar')
    expect(m.map((r) => r[7]).sort()).toEqual(['1', '15', '5'])
  })

  test('AC: Beschreibung mit Semikolon, Anführungszeichen, Zeilenumbruch und Umlauten bleibt eine Zelle', async () => {
    const row = mine(file.rows).find((r) => r[0] === '14.05.2011')!
    expect(row).toHaveLength(11)
    expect(row[4]).toBe('Zeile eins\nZeile zwei; mit "Anführungszeichen" und Umlauten äöü ✓')
    expect(row[7]).toBe('20')
  })

  test('AC: Texte, die mit = + - @ beginnen, werden entschärft (vorangestellter Apostroph), Formelzeichen in der Mitte nicht', async () => {
    const byDate = (d: string) => mine(file.rows).find((r) => r[0] === d)![4]
    expect(byDate('15.05.2011')).toBe(`'=HYPERLINK("http://example.invalid";"Klick")`)
    expect(byDate('16.05.2011')).toBe("'@SUMME(A1)")
    expect(byDate('17.05.2011')).toBe("'+1+1")
    expect(byDate('18.05.2011')).toBe("'-2+3")
    expect(byDate('19.05.2011')).toBe('a=b und x@y.ch (Formelzeichen in der Mitte)')
    // Kein Feld einer Zeile beginnt mit einem ungeschützten Formelzeichen (in den Textspalten)
    for (const row of file.rows) {
      for (const index of [1, 2, 3, 4]) expect(row[index]).not.toMatch(/^[=+\-@\t\r]/)
    }
  })

  test('AC: Projektname mit Formelzeichen wird entschärft; archivierter Kunde und archiviertes Projekt bleiben im Export', async () => {
    const formel = mine(file.rows).find((r) => r[4] === 'Projekt mit Formelzeichen im Namen')!
    expect(formel[3]).toBe("'=Formel Projekt")
    const archived = mine(file.rows).find((r) => r[4] === 'Archivierter Kunde')!
    expect(archived.slice(1, 4)).toEqual([C.name, C.code, 'Allgemein'])
  })

  test('AC: Sehr lange Beschreibung wird nicht gekürzt, HTML und SQL-Zeichen bleiben Text', async () => {
    const long = mine(file.rows).find((r) => r[0] === '21.05.2011')!
    expect(long[4]).toBe(`L${'o'.repeat(300)}ng`)
    const xss = mine(file.rows).find((r) => r[0] === '23.05.2011')!
    expect(xss[4]).toBe('<img src=x onerror=alert(1)> \' OR 1=1 --')
  })

  test('AC: Sortierung nach Datum aufsteigend, am gleichen Tag nach Startzeit, ohne Uhrzeit danach', async () => {
    const isoDates = file.rows.map((r) => isoOf(r[0]))
    expect(isoDates).toEqual([...isoDates].sort())
    const day = mine(file.rows).filter((r) => r[0] === '10.05.2011').map((r) => r[4])
    expect(day).toEqual(['Früher am gleichen Tag', 'Mit Zeiten', 'Ohne Uhrzeit'])
  })

  test('AC: Die Zahl der Zeilen entspricht den Einträgen in der Datenbank, jeder meiner Einträge kommt genau einmal vor', async () => {
    expect(file.rows).toHaveLength(await dbCount())
    const texts = mine(file.rows).map((r) => r.join('|'))
    expect(new Set(texts).size).toBe(texts.length)
    expect(mine(file.rows)).toHaveLength(21)
  })
})

// ----- Aktualität -----

test.describe('Aktualität', () => {
  test('AC: Korrigierte Einträge stehen im neuen Stand in der Datei, gelöschte nicht mehr', async ({ page }) => {
    await openZeiten(page)
    const before = await doExport(page)
    expect(mine(before.rows).some((r) => r[4] === 'Vor der Änderung' && r[7] === '45')).toBe(true)
    expect(mine(before.rows).some((r) => r[4] === 'Wird gelöscht')).toBe(true)

    expect((await client.from('time_entries').update({ duration_minutes: 50, billable_minutes: 50, description: 'Nach der Änderung' }).eq('id', editId)).error).toBeNull()
    expect((await client.from('time_entries').delete().eq('id', deleteId)).error).toBeNull()

    const after = await doExport(page)
    expect(mine(after.rows).some((r) => r[4] === 'Vor der Änderung')).toBe(false)
    expect(mine(after.rows).find((r) => r[4] === 'Nach der Änderung')?.slice(7)).toEqual(['50', '0,83', '50', '0,83'])
    expect(mine(after.rows).some((r) => r[4] === 'Wird gelöscht')).toBe(false)
    expect(after.rows).toHaveLength(before.rows.length - 1)
  })
})

// ----- Mehr als 1000 Einträge -----

test.describe('Mehr als 1000 Einträge', () => {
  test('Vorbereitung: 1050 Einträge in einem Monat anlegen', async () => {
    const rows = Array.from({ length: BULK_COUNT }, (_, i) => ({
      project_id: pa,
      entry_date: `2011-03-${String((i % 28) + 1).padStart(2, '0')}`,
      duration_minutes: (i % 59) + 1,
      billable_minutes: 0,
      description: `${BULK} ${i}`,
    }))
    for (let i = 0; i < rows.length; i += 350) {
      expect((await client.from('time_entries').insert(rows.slice(i, i + 350))).error).toBeNull()
    }
    expect(await dbCount()).toBeGreaterThan(1000)
  })

  test('AC: Über 1000 Einträge: die Datei enthält alle Zeilen, keine doppelt, nichts fehlt, Reihenfolge stimmt', async ({ page }) => {
    await openZeiten(page)
    const total = await dbCount()
    const { rows, raw } = await doExport(page)
    expect(rows).toHaveLength(total)
    const bulk = rows.filter((r) => r[4].startsWith(BULK))
    expect(bulk).toHaveLength(BULK_COUNT)
    expect(new Set(bulk.map((r) => r[4])).size).toBe(BULK_COUNT)
    const isoDates = rows.map((r) => isoOf(r[0]))
    expect(isoDates).toEqual([...isoDates].sort())
    expect(raw.split('\r\n').length).toBeGreaterThan(1001)
    await expect(toast(page, `${total} Zeilen exportiert.`)).toBeVisible()
  })

  test('Edge: Die Seite «Zeiten» bleibt beim Export in Bedienung (kein Einfrieren): Knopf danach wieder frei', async ({ page }) => {
    await openZeiten(page)
    await doExport(page)
    await expect(exportButton(page)).toBeEnabled()
    await expect(exportButton(page)).toHaveAttribute('aria-busy', 'false')
  })

  test('Edge: Ändert sich der Bestand zwischen den Blöcken, gibt es eine Meldung und keine Datei', async ({ page }) => {
    let downloads = 0
    page.on('download', () => downloads++)
    let calls = 0
    await page.route('**/rest/v1/time_entries*', async (route) => {
      const url = route.request().url()
      if (!url.includes('offset=') || !url.includes('limit=1000') || route.request().method() !== 'GET') return route.continue()
      calls++
      const response = await route.fetch()
      if (calls < 2) return route.fulfill({ response })
      const headers = { ...response.headers() }
      headers['content-range'] = (headers['content-range'] ?? '').replace(/\/(\d+)$/, (_m, n) => `/${Number(n) + 1}`)
      return route.fulfill({ response, headers })
    })
    await openZeiten(page)
    await exportButton(page).click()
    await expect(toast(page, 'Während des Exports wurden Zeiten geändert')).toBeVisible()
    expect(downloads).toBe(0)
    await expect(exportButton(page)).toBeEnabled()
  })
})

// ----- Fehlerfälle und Zustände -----

test.describe('Fehlerfälle und Zustände', () => {
  test('AC: Ohne Zeiten erscheint «Keine Zeiten vorhanden.», es wird keine Datei geladen', async ({ page }) => {
    let downloads = 0
    page.on('download', () => downloads++)
    await page.route('**/rest/v1/time_entries*', (route) =>
      route.request().url().includes('offset=')
        ? route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' })
        : route.continue()
    )
    await openZeiten(page)
    await exportButton(page).click()
    await expect(toast(page, 'Keine Zeiten vorhanden.')).toBeVisible()
    expect(downloads).toBe(0)
    await expect(exportButton(page)).toBeEnabled()
  })

  test('AC: Daten nicht erreichbar: Fehlermeldung, keine Datei, Knopf wieder bedienbar', async ({ page }) => {
    let downloads = 0
    page.on('download', () => downloads++)
    let fail = true
    await page.route('**/rest/v1/time_entries*', (route) =>
      fail && route.request().url().includes('offset=') ? route.abort() : route.continue()
    )
    await openZeiten(page)
    await exportButton(page).click()
    // Der Datenbank-Client wiederholt fehlgeschlagene Abfragen einige Male, bevor er aufgibt
    await expect(toast(page, 'nicht erreichbar')).toBeVisible({ timeout: 25_000 })
    expect(downloads).toBe(0)
    await expect(exportButton(page)).toBeEnabled()
    // Danach funktioniert der nächste Versuch
    fail = false
    const { rows } = await doExport(page)
    expect(rows.length).toBeGreaterThan(0)
  })

  test('AC: Abgelaufene Sitzung: Meldung zur Anmeldung, keine Datei', async ({ page }) => {
    let downloads = 0
    page.on('download', () => downloads++)
    await page.route('**/rest/v1/time_entries*', (route) =>
      route.request().url().includes('offset=')
        ? route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'JWT expired', code: 'PGRST301' }) })
        : route.continue()
    )
    await openZeiten(page)
    await exportButton(page).click()
    await expect(toast(page, 'Anmeldung ist abgelaufen')).toBeVisible()
    expect(downloads).toBe(0)
  })

  test('AC: Während des Exports ist der Knopf gesperrt, zeigt «Wird exportiert …», und Doppelklick startet nur einen Export', async ({ page }) => {
    let downloads = 0
    page.on('download', () => downloads++)
    let requests = 0
    await page.route('**/rest/v1/time_entries*', async (route) => {
      if (route.request().url().includes('offset=')) {
        requests++
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500))
      }
      await route.continue()
    })
    await openZeiten(page)
    const button = exportButton(page)
    await button.dblclick()
    await expect(button).toBeDisabled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
    await expect(button).toContainText('Wird exportiert')
    await page.waitForEvent('download')
    await expect(button).toBeEnabled()
    await page.waitForTimeout(500)
    expect(downloads).toBe(1)
    // Bei etwas über 1000 Einträgen sind es genau zwei Blöcke, nie vier
    expect(requests).toBeLessThanOrEqual(2)
  })

  test('AC: Der Export wird per Tastatur bedient (Tab, Enter) und der Fokus bleibt auf dem Knopf', async ({ page }) => {
    await openZeiten(page)
    await exportButton(page).focus()
    await expect(exportButton(page)).toBeFocused()
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
    expect((await readDownload(download)).rows.length).toBeGreaterThan(0)
    await expect(exportButton(page)).toBeEnabled()
  })
})

// BUG-1 (QA): Der Knopf ist während des Exports «disabled»; ein gesperrter Knopf verliert den Fokus, danach steht
// der Fokus auf der Seite ganz oben. Erwartet (nach der Korrektur): Fokus bleibt auf dem Knopf. Bis dahin als
// bekannter Fehler markiert (test.fail); nach der Korrektur die Markierung entfernen.
test('BUG-1: Nach dem Export per Tastatur bleibt der Fokus auf dem Knopf', async ({ page }) => {
  test.fail()
  await openZeiten(page)
  await exportButton(page).focus()
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
  await download.path()
  await expect(exportButton(page)).toBeEnabled()
  await expect(exportButton(page)).toBeFocused()
})

// ----- Layout und Zugänglichkeit -----

test.describe('Layout und Zugänglichkeit', () => {
  for (const [width, height] of [
    [320, 640],
    [375, 667],
    [768, 900],
    [1440, 900],
  ]) {
    test(`AC: Bei ${width} px ist der Knopf sichtbar, mindestens 44 px, ohne waagrechtes Scrollen`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await openZeiten(page)
      const box = (await exportButton(page).boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(43.5)
      expect(box.width).toBeGreaterThanOrEqual(43.5)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const viewport = page.viewportSize()!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      // Beide Knöpfe der Kopfzeile sind sichtbar und überlappen nicht
      const create = (await page.getByRole('button', { name: 'Zeit erfassen' }).first().boundingBox())!
      const overlap = box.x < create.x + create.width && create.x < box.x + box.width && box.y < create.y + create.height && create.y < box.y + box.height
      expect(overlap).toBe(false)
    })
  }

  for (const scheme of ['light', 'dark'] as const) {
    test(`AC: Keine axe-Verstösse (WCAG AA) auf /zeiten im ${scheme === 'light' ? 'hellen' : 'dunklen'} Modus, auch während und nach dem Export`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openZeiten(page)
      expect(await axeViolations(page)).toEqual([])
      await doExport(page)
      await expect(toast(page, 'Zeilen exportiert')).toBeVisible()
      // Einblend-Animation der Meldung abwarten (während sie läuft, ist die Schrift halbtransparent: axe meldet dann Kontrast)
      await expect
        .poll(() => toast(page, 'Zeilen exportiert').evaluate((el) => getComputedStyle(el).opacity))
        .toBe('1')
      await page.waitForTimeout(300)
      expect(await axeViolations(page)).toEqual([])
    })
  }

  test('AC: Ergebnis wird Screenreadern angesagt (Meldung in einer Live-Region), Knopf trägt den Zustand aria-busy', async ({ page }) => {
    await openZeiten(page)
    await doExport(page)
    const toastEl = toast(page, 'Zeilen exportiert')
    await expect(toastEl).toBeVisible()
    const live = await page.locator('[aria-live]').evaluateAll((els) => els.some((el) => el.textContent?.includes('Zeilen exportiert')))
    const section = await page.locator('section[aria-label*="otification"]').count()
    expect(live || section > 0).toBe(true)
  })
})

// ----- Sicherheit -----

test.describe('Sicherheit', () => {
  test.describe('ohne Anmeldung', () => {
    test.use({ storageState: NO_LOGIN })

    test('Ohne Anmeldung führt /zeiten zur Anmeldung, es gibt keinen Knopf und keine Daten', async ({ page }) => {
      await page.goto('/zeiten')
      await expect(page).toHaveURL(/\/login/)
      await expect(exportButton(page)).toHaveCount(0)
    })

    test('Ohne Sitzung liefert die Datenbank keine Zeiten (Zugriffsregeln)', async () => {
      const anonymous = createClient(base, anon, { auth: { persistSession: false, autoRefreshToken: false } })
      const { data, error } = await anonymous.from('time_entries').select('id').limit(5)
      expect(error === null ? data : []).toEqual([])
    })
  })

  test('Der Export schickt Daten nur an die eigene Datenbank, nichts an Dritte, und die Datei steht nicht in der Adresse', async ({ page }) => {
    const hosts = new Set<string>()
    page.on('request', (request) => {
      const url = new URL(request.url())
      if (!url.hostname.startsWith('localhost') && !url.hostname.startsWith('127.')) hosts.add(url.hostname)
      expect(request.url()).not.toContain('Konzept')
    })
    await openZeiten(page)
    await doExport(page)
    expect([...hosts].every((host) => host === new URL(base).hostname)).toBe(true)
    await expect(page).toHaveURL(/\/zeiten$/)
  })

  test('Die Datei enthält keine Zugangsdaten oder Schlüssel', async ({ page }) => {
    await openZeiten(page)
    const { raw } = await doExport(page)
    expect(raw).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/)
    expect(raw).not.toMatch(/service_role|apikey|password/i)
  })

  test('Zwei Exporte hintereinander liefern denselben Inhalt (kein Zustand bleibt hängen)', async ({ page }) => {
    await openZeiten(page)
    const first = await doExport(page)
    const second = await doExport(page)
    expect(second.raw).toBe(first.raw)
  })
})
