import { describe, expect, it } from 'vitest'

import {
  normalizeStoredOutreachIntakePreview,
  prepareContactIntakePaste,
  spreadsheetContactDraftLine,
} from '@/sanity/components/marketing/OutreachWorkspace'

describe('outreach intake reload storage', () => {
  it('rejects a malformed preview without making the source rows unusable', () => {
    expect(
      normalizeStoredOutreachIntakePreview([
        { name: 'Stored Person', organization: { unexpected: true } },
      ]),
    ).toBeNull()
    expect(
      normalizeStoredOutreachIntakePreview([
        { name: 'Stored Person', duplicate: 'yes' },
      ]),
    ).toBeNull()
  })

  it('normalizes a valid cached preview and preserves reviewed duplicate state', () => {
    expect(
      normalizeStoredOutreachIntakePreview([
        {
          name: '  Stored Person  ',
          organization: '  Acme  ',
          email: ' PERSON@EXAMPLE.COM ',
          duplicate: true,
          duplicateReason: ' already saved ',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        name: 'Stored Person',
        organization: 'Acme',
        email: 'person@example.com',
        duplicate: true,
        duplicateReason: 'already saved',
      }),
    ])
  })

  it('rejects previews that exceed the shared field and contact limits', () => {
    expect(normalizeStoredOutreachIntakePreview([{ name: 'x'.repeat(161) }])).toBeNull()
    expect(
      normalizeStoredOutreachIntakePreview(
        Array.from({ length: 201 }, (_, index) => ({ name: `Person ${index}` })),
      ),
    ).toBeNull()
  })

  it('keeps headerless rows copied from Excel instead of losing them in the spreadsheet parser', () => {
    expect(
      prepareContactIntakePaste('Alice Adams\tAcme Health\nBob Brown\tExample Labs'),
    ).toEqual({
      kind: 'rows',
      text: 'Alice Adams — Acme Health\nBob Brown — Example Labs',
    })
    expect(
      prepareContactIntakePaste('Name\tCompany\tEmail\nAlice Adams\tAcme Health\talice@example.com'),
    ).toMatchObject({ kind: 'spreadsheet', fileName: 'pasted-from-excel.tsv' })
    expect(
      prepareContactIntakePaste('Lead Name\tEmployer\nAlias Person\tAlias Company'),
    ).toMatchObject({ kind: 'spreadsheet', fileName: 'pasted-from-excel.tsv' })
    expect(prepareContactIntakePaste('Single Person\tSingle Company')).toEqual({
      kind: 'rows',
      text: 'Single Person — Single Company',
    })
  })

  it('keeps long spreadsheet rows aligned by deterministic source id', () => {
    const shared = {
      name: 'Same Name',
      organization: 'Same Organization',
      role: 'R'.repeat(160),
      howWeKnow: 'H'.repeat(500),
      sourceRow: 2,
      sourceSheet: 'Contacts',
    }
    const first = spreadsheetContactDraftLine({
      ...shared,
      sourceId: 'spreadsheet-11111111',
      email: 'first@example.com',
    })
    const second = spreadsheetContactDraftLine({
      ...shared,
      sourceId: 'spreadsheet-22222222',
      email: 'second@example.com',
    })

    expect(first).not.toBe(second)
    expect(first).toContain('spreadsheet-11111111')
    expect(second).toContain('spreadsheet-22222222')
    expect(first.length).toBeLessThanOrEqual(500)
    expect(second.length).toBeLessThanOrEqual(500)
  })
})
