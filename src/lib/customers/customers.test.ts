import { beforeEach, describe, expect, it } from 'vitest'
import { describeRepositoryError, RepositoryError } from './errors'
import { InMemoryCustomersRepository } from './in-memory-repository'
import { customerSchema, projectSchema } from './schemas'

describe('customerSchema', () => {
  it('speichert das Kürzel in Grossbuchstaben und entfernt Leerzeichen am Rand', () => {
    const result = customerSchema.parse({ code: '  mus-1 ', name: '  Muster AG  ' })
    expect(result).toEqual({ code: 'MUS-1', name: 'Muster AG' })
  })

  it('verlangt Kürzel und Name', () => {
    const result = customerSchema.safeParse({ code: '   ', name: '' })
    expect(result.success).toBe(false)
    const messages = result.error?.issues.map((issue) => issue.message)
    expect(messages).toContain('Bitte gib ein Kürzel ein.')
    expect(messages).toContain('Bitte gib einen Namen ein.')
  })

  it('akzeptiert das Kürzel nur mit 2 bis 10 Zeichen', () => {
    expect(customerSchema.safeParse({ code: 'A', name: 'x' }).success).toBe(false)
    expect(customerSchema.safeParse({ code: 'AB', name: 'x' }).success).toBe(true)
    expect(customerSchema.safeParse({ code: 'A'.repeat(10), name: 'x' }).success).toBe(true)
    expect(customerSchema.safeParse({ code: 'A'.repeat(11), name: 'x' }).success).toBe(false)
  })

  it('lässt im Kürzel nur Buchstaben, Ziffern und Bindestrich zu', () => {
    for (const code of ['MÜ', 'AB CD', 'AB_CD', 'AB.CD', 'AB<', "A'B", 'AB😀']) {
      expect(customerSchema.safeParse({ code, name: 'x' }).success, code).toBe(false)
    }
    expect(customerSchema.safeParse({ code: 'a-1', name: 'x' }).success).toBe(true)
  })

  it('begrenzt den Namen auf 100 Zeichen und lässt Sonderzeichen zu', () => {
    expect(customerSchema.safeParse({ code: 'AB', name: 'x'.repeat(100) }).success).toBe(true)
    expect(customerSchema.safeParse({ code: 'AB', name: 'x'.repeat(101) }).success).toBe(false)
    expect(customerSchema.safeParse({ code: 'AB', name: 'Müller & Söhne <b>😀' }).success).toBe(true)
  })
})

describe('projectSchema', () => {
  it('macht die Projektnummer optional und entfernt Leerzeichen am Rand', () => {
    expect(projectSchema.parse({ name: ' Relaunch ', number: '' })).toEqual({
      name: 'Relaunch',
      number: '',
    })
    expect(projectSchema.parse({ name: 'x', number: ' P-1 ' }).number).toBe('P-1')
  })

  it('begrenzt Name auf 100 und Projektnummer auf 30 Zeichen', () => {
    expect(projectSchema.safeParse({ name: 'x'.repeat(101), number: '' }).success).toBe(false)
    expect(projectSchema.safeParse({ name: 'x', number: 'n'.repeat(30) }).success).toBe(true)
    expect(projectSchema.safeParse({ name: 'x', number: 'n'.repeat(31) }).success).toBe(false)
    expect(projectSchema.safeParse({ name: '  ', number: '' }).success).toBe(false)
  })
})

describe('describeRepositoryError', () => {
  it('meldet Duplikate am passenden Feld, bei Treffern im Archiv mit Zusatz', () => {
    expect(describeRepositoryError(new RepositoryError('duplicate-code'))).toEqual({
      field: 'code',
      message: 'Dieses Kürzel gibt es schon.',
    })
    expect(describeRepositoryError(new RepositoryError('duplicate-name', { inArchive: true }))).toEqual({
      field: 'name',
      message: 'Diesen Kunden gibt es schon (im Archiv).',
    })
    expect(describeRepositoryError(new RepositoryError('duplicate-project')).message).toBe(
      'Dieses Projekt gibt es bei diesem Kunden schon.'
    )
  })

  it('übersetzt andere Fehler ohne Feld und fällt auf eine allgemeine Meldung zurück', () => {
    expect(describeRepositoryError(new RepositoryError('unreachable')).field).toBeUndefined()
    expect(describeRepositoryError(new Error('boom')).message).toBe(
      'Das hat nicht geklappt. Bitte versuche es erneut.'
    )
    expect(describeRepositoryError(null).message).toContain('nicht geklappt')
  })
})

describe('InMemoryCustomersRepository', () => {
  let repo: InMemoryCustomersRepository

  beforeEach(() => {
    repo = new InMemoryCustomersRepository(0)
  })

  async function kind(promise: Promise<unknown>): Promise<string | undefined> {
    try {
      await promise
    } catch (error) {
      return error instanceof RepositoryError ? error.kind : 'other'
    }
    return undefined
  }

  it('legt mit dem Kunden automatisch das Projekt «Allgemein» an', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const detail = await repo.getCustomer(customer.id)

    expect(detail?.projects.map((p) => [p.name, p.number, p.archived])).toEqual([
      ['Allgemein', null, false],
    ])
    expect((await repo.listCustomers())[0].activeProjectCount).toBe(1)
  })

  it('sortiert Kunden nach Kürzel und Projekte nach Name', async () => {
    const b = await repo.createCustomer({ code: 'BBB', name: 'B' })
    await repo.createCustomer({ code: 'AAA', name: 'A' })
    await repo.createProject(b.id, { name: 'Zeta' })
    await repo.createProject(b.id, { name: 'Beta' })

    expect((await repo.listCustomers()).map((c) => c.code)).toEqual(['AAA', 'BBB'])
    expect((await repo.getCustomer(b.id))?.projects.map((p) => p.name)).toEqual([
      'Allgemein',
      'Beta',
      'Zeta',
    ])
  })

  it('lehnt doppelte Kürzel und Namen ab (Gross-/Kleinschreibung egal, auch gegen das Archiv)', async () => {
    const first = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })

    expect(await kind(repo.createCustomer({ code: 'mus', name: 'Anders' }))).toBe('duplicate-code')
    expect(await kind(repo.createCustomer({ code: 'XYZ', name: 'muster ag' }))).toBe('duplicate-name')

    await repo.archiveCustomer(first.id)
    await expect(repo.createCustomer({ code: 'MUS', name: 'Neu' })).rejects.toMatchObject({
      kind: 'duplicate-code',
      inArchive: true,
    })
  })

  it('zählt den eigenen Eintrag beim Bearbeiten nicht als Duplikat', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const updated = await repo.updateCustomer(customer.id, { code: 'MUS', name: 'Muster AG neu' })
    expect(updated.name).toBe('Muster AG neu')
  })

  it('erlaubt gleiche Projektnamen bei verschiedenen Kunden, aber nicht beim selben Kunden', async () => {
    const a = await repo.createCustomer({ code: 'AAA', name: 'A' })
    const b = await repo.createCustomer({ code: 'BBB', name: 'B' })

    // «Allgemein» gibt es bei beiden schon automatisch.
    expect(await kind(repo.createProject(a.id, { name: 'allgemein' }))).toBe('duplicate-project')
    expect(await kind(repo.createProject(b.id, { name: 'Relaunch' }))).toBeUndefined()
    expect(await kind(repo.createProject(a.id, { name: 'Relaunch' }))).toBeUndefined()
  })

  it('erlaubt dieselbe Projektnummer mehrfach und speichert leere Nummern als «keine»', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const one = await repo.createProject(customer.id, { name: 'Eins', number: 'P-1' })
    const two = await repo.createProject(customer.id, { name: 'Zwei', number: 'P-1' })
    const three = await repo.createProject(customer.id, { name: 'Drei', number: '   ' })

    expect([one.number, two.number, three.number]).toEqual(['P-1', 'P-1', null])
  })

  it('archiviert beim Kunden alle aktiven Projekte und aktiviert nur diese wieder', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const keep = await repo.createProject(customer.id, { name: 'Früher einzeln archiviert' })
    const together = await repo.createProject(customer.id, { name: 'Mit dem Kunden' })
    await repo.archiveProject(keep.id)

    await repo.archiveCustomer(customer.id)
    let detail = await repo.getCustomer(customer.id)
    expect(detail?.customer.archived).toBe(true)
    expect(detail?.projects.every((p) => p.archived)).toBe(true)

    await repo.reactivateCustomer(customer.id)
    detail = await repo.getCustomer(customer.id)
    expect(detail?.customer.archived).toBe(false)
    const state = Object.fromEntries(detail!.projects.map((p) => [p.name, p.archived]))
    expect(state).toEqual({
      Allgemein: false,
      'Mit dem Kunden': false,
      'Früher einzeln archiviert': true,
    })
    expect(detail?.projects.find((p) => p.id === together.id)?.archivedWithCustomer).toBe(false)
  })

  it('lässt ein Projekt unter einem archivierten Kunden nicht einzeln reaktivieren', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const project = (await repo.getCustomer(customer.id))!.projects[0]
    await repo.archiveCustomer(customer.id)

    expect(await kind(repo.reactivateProject(project.id))).toBe('customer-archived')
    expect(await kind(repo.createProject(customer.id, { name: 'Neu' }))).toBe('customer-archived')
  })

  it('reaktiviert ein einzeln archiviertes Projekt bei aktivem Kunden', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const project = (await repo.getCustomer(customer.id))!.projects[0]
    await repo.archiveProject(project.id)
    expect((await repo.listCustomers())[0].activeProjectCount).toBe(0)

    await repo.reactivateProject(project.id)
    expect((await repo.listCustomers())[0].activeProjectCount).toBe(1)
  })

  it('wirkt Änderungen von Kürzel und Name überall (Projekte verweisen nur auf die ID)', async () => {
    const customer = await repo.createCustomer({ code: 'MUS', name: 'Muster AG' })
    await repo.updateCustomer(customer.id, { code: 'NEU', name: 'Neuer Name' })

    const detail = await repo.getCustomer(customer.id)
    expect(detail?.customer).toMatchObject({ code: 'NEU', name: 'Neuer Name' })
    expect(detail?.projects[0].customerId).toBe(customer.id)
  })

  it('kennt kein Löschen und meldet unbekannte Einträge als «nicht gefunden»', async () => {
    expect('deleteCustomer' in repo).toBe(false)
    expect('deleteProject' in repo).toBe(false)
    expect(await repo.getCustomer('gibt-es-nicht')).toBeNull()
    expect(await kind(repo.updateCustomer('gibt-es-nicht', { code: 'AB', name: 'x' }))).toBe(
      'not-found'
    )
    expect(await kind(repo.archiveProject('gibt-es-nicht'))).toBe('not-found')
  })
})
