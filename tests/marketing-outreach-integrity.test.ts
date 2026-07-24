import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  OUTREACH_CONTACT_EDIT_FIELDS,
  beginRequestGeneration,
  buildOutreachContactEditPatch,
  catalogContainsOfferTitle,
  catalogPromotionIdentity,
  createOutreachContactEditDraft,
  createPendingKeyRegistry,
  haveSameTrimmedFields,
  isCurrentRequestGeneration,
  isOutreachRevisionConflict,
  validateOutreachContactMethods,
} from '@/lib/marketing/outreachIntegrity'

describe('outreach contact edit integrity', () => {
  it('limits the editor to contact data and excludes pipeline/history fields', () => {
    expect(OUTREACH_CONTACT_EDIT_FIELDS).not.toContain('status')
    expect(OUTREACH_CONTACT_EDIT_FIELDS).not.toContain('interactions')
    expect(OUTREACH_CONTACT_EDIT_FIELDS).not.toContain('closedValue')

    const base = { name: 'Alice', email: 'old@example.com' }
    const draft = {
      ...createOutreachContactEditDraft(base),
      email: 'new@example.com',
      status: 'won',
      interactions: 'erase-history',
    }
    const patch = buildOutreachContactEditPatch(base, draft, {
      linkedinUrl: null,
      followUpAt: null,
    })

    expect(patch).toMatchObject({
      set: { email: 'new@example.com' },
      unset: [],
      dirtyFields: ['email'],
      identityChanged: false,
    })
    expect(patch.set).not.toHaveProperty('status')
    expect(patch.set).not.toHaveProperty('interactions')
  })

  it('patches only changed fields and explicitly unsets a cleared value', () => {
    const base = {
      name: 'Alice',
      organization: 'Acme',
      phone: '617-555-0100',
      followUpAt: '2026-07-30T12:00:00.000Z',
    }
    const draft = {
      ...createOutreachContactEditDraft(base),
      organization: '  Acme Health  ',
      phone: '',
      followUpAt: '2026-08-04',
    }

    expect(
      buildOutreachContactEditPatch(base, draft, {
        linkedinUrl: null,
        followUpAt: '2026-08-04T12:00:00.000Z',
      }),
    ).toEqual({
      set: {
        organization: 'Acme Health',
        followUpAt: '2026-08-04T12:00:00.000Z',
      },
      unset: ['phone'],
      dirtyFields: ['organization', 'phone', 'followUpAt'],
      identityChanged: true,
      brandVoiceChanged: false,
    })
  })

  it('treats unchanged trimmed wording as a no-op', () => {
    expect(
      haveSameTrimmedFields(
        { suggestedOpener: 'Hello there', callBrief: 'Ask about timing' },
        { suggestedOpener: '  Hello there ', callBrief: 'Ask about timing\n' },
        ['suggestedOpener', 'callBrief'],
      ),
    ).toBe(true)
    expect(
      haveSameTrimmedFields(
        { title: 'Pre-mortem', oneLiner: 'Find failure early' },
        { title: 'Pre-mortem', oneLiner: 'Find a failure early' },
        ['title', 'oneLiner'],
      ),
    ).toBe(false)
  })

  it('rejects newly entered invalid email and phone values without blocking untouched legacy data', () => {
    const validBase = { name: 'Alice', email: 'alice@example.com', phone: '+1 617 555 0100' }

    expect(
      validateOutreachContactMethods(validBase, {
        ...createOutreachContactEditDraft(validBase),
        email: 'not-an-email',
      }),
    ).toMatch(/Email must be a complete address/)
    expect(
      validateOutreachContactMethods(validBase, {
        ...createOutreachContactEditDraft(validBase),
        phone: 'call the front desk',
      }),
    ).toMatch(/Phone must contain a dialable/)
    expect(
      validateOutreachContactMethods(
        { name: 'Legacy', email: 'old-invalid-value' },
        {
          ...createOutreachContactEditDraft({ name: 'Legacy', email: 'old-invalid-value' }),
          organization: 'Corrected Org',
        },
      ),
    ).toBeNull()
  })
})

describe('outreach pending-operation guards', () => {
  it('rejects a duplicate begin and preserves unrelated pending work', () => {
    const pending = createPendingKeyRegistry()

    expect(pending.begin('alice')).toBe(true)
    expect(pending.begin('alice')).toBe(false)
    expect(pending.begin('bob')).toBe(true)

    pending.finish('alice')

    expect(pending.has('alice')).toBe(false)
    expect(pending.has('bob')).toBe(true)
    expect([...pending.values()]).toEqual(['bob'])
  })

  it('recognizes API and message-shaped revision conflicts', () => {
    expect(isOutreachRevisionConflict({ statusCode: 409 })).toBe(true)
    expect(isOutreachRevisionConflict({ status: 409 })).toBe(true)
    expect(isOutreachRevisionConflict(new Error('revision was modified'))).toBe(true)
    expect(isOutreachRevisionConflict(new Error('network unavailable'))).toBe(false)
  })

  it('lets only the newest load generation publish its response', () => {
    const counter = { current: 0 }
    const slowRequest = beginRequestGeneration(counter)
    const newerRequest = beginRequestGeneration(counter)

    expect(isCurrentRequestGeneration(counter, slowRequest)).toBe(false)
    expect(isCurrentRequestGeneration(counter, newerRequest)).toBe(true)
  })
})

describe('catalog promotion identity', () => {
  it('uses a stable case-and-whitespace-insensitive identity per offer title', () => {
    const first = catalogPromotionIdentity('  Adoption   Rescue ')
    const second = catalogPromotionIdentity('adoption rescue')

    expect(first).toBeTruthy()
    expect(first).toBe(second)
    expect(catalogPromotionIdentity('Capacity planning')).not.toBe(first)
  })

  it('detects an existing catalog entry without case-sensitive duplicates', () => {
    expect(
      catalogContainsOfferTitle(
        [{ title: 'Pre-Mortem Workshop' }, { title: 'Adoption Rescue' }],
        ' pre-mortem   workshop ',
      ),
    ).toBe(true)
    expect(catalogContainsOfferTitle([{ title: 'Pre-Mortem Workshop' }], 'Capacity')).toBe(false)
  })
})

describe('OutreachWorkspace integrity wiring', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/sanity/components/marketing/OutreachWorkspace.tsx'),
    'utf8',
  )

  it('locks contact edits to the editor-opening revision and hard deletes through a guarded transaction', () => {
    expect(source).toContain('.ifRevisionId(contactEditSession.openedRevision)')
    expect(source).toContain('.ifRevisionId(current._rev as string)')
    expect(source).toContain('.delete(current._id)')
    expect(source).not.toContain('await outreachClient.delete(contact._id)')
  })

  it('reconciles identity claims atomically with identity edits and hard deletion', () => {
    const saveStart = source.indexOf('const saveContactEdit = async () =>')
    const deleteStart = source.indexOf('const deleteContact = async (contact: MarketingContact) =>')
    const saveSource = source.slice(saveStart, deleteStart)
    const deleteEnd = source.indexOf('const seedOffers = async () =>', deleteStart)
    const deleteSource = source.slice(deleteStart, deleteEnd)

    expect(saveStart).toBeGreaterThan(-1)
    expect(deleteStart).toBeGreaterThan(saveStart)
    expect(saveSource).toContain('fetchMarketingContactIdentityClaims(outreachClient, editingContactId)')
    expect(saveSource).toContain('buildMarketingContactIdentityClaims(nextContactIdentity, editingContactId)')
    expect(saveSource).toContain('outreachClient.transaction().patch(patch)')
    expect(saveSource).toContain('transaction.delete(claimId)')
    expect(saveSource).toContain('transaction.create(claim)')

    expect(deleteEnd).toBeGreaterThan(deleteStart)
    expect(deleteSource).toContain('fetchMarketingContactIdentityClaims(outreachClient, contact._id)')
    expect(deleteSource).toContain('transaction.delete(claim._id)')
    expect(deleteSource).toContain('transaction.delete(current._id)')
  })

  it('does not render an editable contact-status control', () => {
    expect(source).not.toContain('data-outreach-contact-field="status"')
    expect(source).toContain('Approve research or log an interaction to change pipeline status.')
  })
})
