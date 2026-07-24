import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildContactIntakeRows,
  ContactIntakeGrid,
  CONTACT_INTAKE_PAGE_SIZE,
  contactIntakeDraftLimitError,
  filterAndSortContactIntakeRows,
  parseContactIntakeDraftLine,
} from '@/sanity/components/marketing/ContactIntakeGrid'

describe('contact intake grid', () => {
  it('turns manual and suggested lines into useful table properties', () => {
    expect(parseContactIntakeDraftLine('Sarah Chen — VP Product at Medtronic — met at HIMSS 2023')).toMatchObject({
      name: 'Sarah Chen',
      organization: 'Medtronic',
      role: 'VP Product',
      relationship: 'met at HIMSS 2023',
      source: 'Manual',
    })
    expect(
      parseContactIntakeDraftLine(
        '3M — account placeholder — organization: 3M — how we know: Past client',
      ),
    ).toMatchObject({
      name: '3M',
      organization: '3M',
      relationship: 'Past client',
      source: 'Past work',
    })
    expect(
      parseContactIntakeDraftLine(
        'Ada Lovelace — Analytical Engines — warm introduction — ada@example.com',
      ),
    ).toMatchObject({
      name: 'Ada Lovelace',
      organization: 'Analytical Engines',
      relationship: 'warm introduction',
      contactDetails: 'ada@example.com',
    })
    expect(parseContactIntakeDraftLine('Grace Hopper — person — organization: US Navy')).toMatchObject({
      name: 'Grace Hopper',
      organization: 'US Navy',
      role: '',
    })
  })

  it('keeps same-name strong identities as unique, distinguishable preview rows', () => {
    const rows = buildContactIntakeRows(
      ['Alex Smith — Acme — email: alex.one@example.com', 'Alex Smith — Acme — email: alex.two@example.com'],
      [
        { name: 'Alex Smith', organization: 'Acme', email: 'alex.one@example.com', sourceLine: 'Alex Smith — Acme — email: alex.one@example.com' },
        { name: 'Alex Smith', organization: 'Acme', email: 'alex.two@example.com', sourceLine: 'Alex Smith — Acme — email: alex.two@example.com' },
      ],
    )
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((row) => row.id)).size).toBe(2)
    expect(rows.map((row) => row.contactDetails)).toEqual([
      'alex.one@example.com',
      'alex.two@example.com',
    ])
  })

  it('filters every visible property and sorts without changing source indexes', () => {
    const rows = buildContactIntakeRows(
      ['Zoe Zebra — Zeta', 'Ada Alpha — Acme', 'Mina Middle — Meridian'],
      null,
    )
    const filtered = filterAndSortContactIntakeRows(rows, {
      query: 'acme',
      state: 'draft',
      sort: 'name',
      direction: 'asc',
    })
    expect(filtered.map((row) => [row.name, row.entryIndex])).toEqual([['Ada Alpha', 1]])

    const sorted = filterAndSortContactIntakeRows(rows, { sort: 'name', direction: 'desc' })
    expect(sorted.map((row) => row.name)).toEqual(['Zoe Zebra', 'Mina Middle', 'Ada Alpha'])
    expect(rows.map((row) => row.name)).toEqual(['Zoe Zebra', 'Ada Alpha', 'Mina Middle'])
  })

  it('labels duplicate preview rows and preserves their reason', () => {
    const [row] = buildContactIntakeRows(['Ada Alpha — Acme'], [
      {
        name: 'Ada Alpha',
        organization: 'Acme',
        sourceLine: 'Ada Alpha — Acme',
        duplicate: true,
        duplicateReason: 'matches an existing email',
      },
    ])
    expect(row).toMatchObject({
      state: 'duplicate',
      stateLabel: 'Already exists · will skip',
      duplicateReason: 'matches an existing email',
    })
  })

  it('keeps every source row visible when the name check omits one', () => {
    const rows = buildContactIntakeRows(
      ['Ada Alpha — Acme', 'Grace Gamma — Globex'],
      [{ name: 'Ada Alpha', organization: 'Acme', sourceLine: 'Ada Alpha — Acme' }],
    )

    expect(rows).toHaveLength(2)
    expect(rows.map((row) => [row.name, row.state, row.stateLabel])).toEqual([
      ['Ada Alpha', 'ready', 'Ready to add'],
      ['Grace Gamma', 'draft', 'Not parsed · check this row'],
    ])
  })

  it('labels locally mapped workbook rows as spreadsheet sources', () => {
    expect(
      parseContactIntakeDraftLine(
        'Ada Lovelace — organization: Analytical Engines — email: ada@example.com — source: spreadsheet',
      ),
    ).toMatchObject({
      name: 'Ada Lovelace',
      organization: 'Analytical Engines',
      contactDetails: 'ada@example.com',
      source: 'Spreadsheet',
      owner: '',
      segment: '',
      warmth: '',
    })
  })

  it('never accepts equal-count substitutions or extra model contacts by position', () => {
    const substituted = buildContactIntakeRows(
      ['Alice Adams — Acme', 'Bob Brown — Beta'],
      [
        { name: 'Mallory', sourceLine: 'invented row one' },
        { name: 'Eve', sourceLine: 'invented row two' },
      ],
    )

    expect(substituted).toHaveLength(4)
    expect(substituted.every((row) => row.state === 'draft')).toBe(true)
    expect(substituted.filter((row) => row.stateLabel === 'Unmatched result · check')).toHaveLength(2)
    expect(substituted.filter((row) => row.stateLabel === 'Not parsed · check this row')).toHaveLength(2)

    const reordered = buildContactIntakeRows(
      ['Alice Adams — Acme', 'Bob Brown — Beta'],
      [
        { name: 'Bob Brown', sourceLine: 'Bob Brown — Beta' },
        { name: 'Alice Adams', sourceLine: 'Alice Adams — Acme' },
      ],
    )
    expect(reordered.map((row) => [row.name, row.entryIndex, row.state])).toEqual([
      ['Bob Brown', 1, 'ready'],
      ['Alice Adams', 0, 'ready'],
    ])
  })

  it('shows spreadsheet routing fields before a contact can be saved', () => {
    const [row] = buildContactIntakeRows(
      ['Ada Lovelace — organization: Analytical Engines — owner: Alex — segment: research — warmth: hot — source: spreadsheet'],
      [{
        name: 'Ada Lovelace',
        organization: 'Analytical Engines',
        owner: 'Alex',
        segment: 'research',
        warmth: 'hot',
        sourceLine: 'Ada Lovelace — organization: Analytical Engines — owner: Alex — segment: research — warmth: hot — source: spreadsheet',
      }],
    )

    expect(row).toMatchObject({ owner: 'Alex', segment: 'research', warmth: 'hot', state: 'ready' })
  })

  it('shows exactly the reviewed fields that will be sent in the create payload', () => {
    const sourceLine = 'Alice Adams — role: VP Product — email: alice@example.com — organization: Acme'
    const [row] = buildContactIntakeRows(
      [sourceLine],
      [{ name: 'Alice Adams', organization: 'Acme', sourceLine }],
    )

    expect(row).toMatchObject({
      name: 'Alice Adams',
      organization: 'Acme',
      role: '',
      contactDetails: '',
      state: 'ready',
    })
  })

  it('renders a labelled property table with filter, sort, edit, and delete controls', () => {
    const html = renderToStaticMarkup(
      createElement(ContactIntakeGrid, {
        entries: ['Ada Alpha — VP Product at Acme — met at HIMSS'],
        preview: null,
        onEdit: () => undefined,
        onRemove: () => undefined,
      }),
    )
    expect(html).toContain('aria-label="Contact drafts ready to check"')
    expect(html).toContain('aria-label="Filter contact drafts"')
    expect(html).toContain('aria-label="Sort contact drafts"')
    expect(html).toContain('Edit Ada Alpha in Add Contacts')
    expect(html).toContain('Remove Ada Alpha from Add Contacts')
    expect(html).toContain('VP Product')
    expect(html).toContain('Acme')
  })

  it('bounds a large table to one page of rendered rows', () => {
    const entries = Array.from(
      { length: CONTACT_INTAKE_PAGE_SIZE + 20 },
      (_, index) => `Person ${String(index).padStart(3, '0')} — Organization ${index}`,
    )
    const html = renderToStaticMarkup(
      createElement(ContactIntakeGrid, {
        entries,
        preview: null,
        onEdit: () => undefined,
        onRemove: () => undefined,
      }),
    )
    expect((html.match(/<tr/g) || []).length).toBe(CONTACT_INTAKE_PAGE_SIZE + 1)
    expect(html).toContain(`Rows 1–${CONTACT_INTAKE_PAGE_SIZE} of ${entries.length}`)
    expect(html).toContain('Next rows')
  })

  it('rejects limit-plus-one rows before they reach the browser table or API', () => {
    expect(contactIntakeDraftLimitError([], 'x'.repeat(2_001))).toMatch(/under 2,000 characters/)
    expect(
      contactIntakeDraftLimitError(
        Array.from({ length: 200 }, (_, index) => `Person ${index}`),
        'One contact too many',
      ),
    ).toMatch(/at most 200 contacts/)
    expect(contactIntakeDraftLimitError(['Ada — Acme'], ' ada   —   acme ')).toBeNull()
  })
})
