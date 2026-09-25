import { describe, expect, it } from 'vitest'

import {
  clipSlackText,
  decodeSlackText,
  escapeSlackText,
  marquetaHandle,
  slackLink,
  slackMention,
} from '@/lib/marketing/slackText'
import { resolveOwnerName } from '@/lib/marketing/availability'
import { buildOperationStatusPatch } from '@/lib/marketing/operations'

describe('decodeSlackText', () => {
  // Fixtures are in the form Slack actually delivers, not what was typed.
  it('decodes the entities Slack escapes', () => {
    expect(decodeSlackText('prep a call with AT&amp;T')).toBe('prep a call with AT&T')
    expect(decodeSlackText('Johnson &amp; Johnson &lt;3')).toBe('Johnson & Johnson <3')
  })

  it('turns rewritten addresses back into what was typed', () => {
    expect(decodeSlackText('called <mailto:jane@mgb.org|jane@mgb.org>')).toBe('called jane@mgb.org')
    expect(decodeSlackText('prep <http://mgb.org|mgb.org>')).toBe('prep mgb.org')
    expect(decodeSlackText('see <https://example.com/a>')).toBe('see https://example.com/a')
  })

  it('names mentioned colleagues when it can, and drops broadcast mentions', () => {
    expect(decodeSlackText('<@U123> prep Jane', {})).toBe('prep Jane')
    expect(decodeSlackText('ask <@U999> about it', { U999: 'Eric' })).toBe('ask @Eric about it')
    expect(decodeSlackText('<!here> hi')).toBe('hi')
    expect(decodeSlackText('in <#C1|marketing>')).toBe('in #marketing')
  })

  it('does not mistake an escaped bracket for a token', () => {
    expect(decodeSlackText('&lt;5% of pilots&gt;')).toBe('<5% of pilots>')
  })
})

describe('escapeSlackText / clipSlackText / slackLink', () => {
  it('neutralises control sequences from records', () => {
    expect(escapeSlackText('<!here> R&D <5%')).toBe('&lt;!here&gt; R&amp;D &lt;5%')
  })

  it('never cuts an entity or a link in half', () => {
    const escaped = escapeSlackText('aaaa & bbbb')
    const clipped = clipSlackText(escaped, 7)
    expect(clipped.endsWith('…')).toBe(true)
    expect(clipped).not.toMatch(/&[a-z]*…$/)
    const linked = `intro ${slackLink('https://example.com/x', 'source')} tail`
    expect(clipSlackText(linked, 12)).toBe('intro…')
  })

  it('refuses to link anything that is not http(s)', () => {
    expect(slackLink('javascript:alert(1)', 'x')).toBe('x')
    expect(slackLink('https://a.org/p?q=1|2', 'a|b')).toBe('<https://a.org/p?q=1%7C2|a/b>')
  })

  it('mentions only real user ids', () => {
    expect(slackMention('U0B4DQ2B5D1', 'Juhan')).toBe('<@U0B4DQ2B5D1>')
    expect(slackMention('not-an-id', 'Juhan <x>')).toBe('Juhan &lt;x&gt;')
  })

  it('names Marqueta as a mention that actually works', () => {
    expect(marquetaHandle('U0B4DQ2B5D1')).toBe('<@U0B4DQ2B5D1>')
    expect(marquetaHandle(undefined)).not.toContain('@Marqueta')
  })

  it('falls back to her name alone — never "DM me", which is not wired up', () => {
    expect(marquetaHandle(undefined)).toBe('Marqueta')
    expect(marquetaHandle('')).toBe('Marqueta')
    expect(marquetaHandle(undefined)).not.toMatch(/DM/)
  })
})

describe('resolveOwnerName', () => {
  const entries = [
    { ownerName: 'Juhan', slackUserId: 'U1' },
    { ownerName: 'Shirley' },
  ]
  it('prefers the linked identity over the Slack display name', () => {
    expect(resolveOwnerName({ slackUserId: 'U1', displayName: 'Juhan Sonin', entries })).toBe('Juhan')
  })
  it('matches an exact name, and never guesses from a first name', () => {
    expect(resolveOwnerName({ slackUserId: 'U2', displayName: 'shirley', entries })).toBe('Shirley')
    expect(resolveOwnerName({ slackUserId: 'U3', displayName: 'Shirley Xu', entries })).toBe('Shirley Xu')
  })
  it('never returns an empty owner', () => {
    expect(resolveOwnerName({ entries })).toBe('Someone')
  })
})

describe('buildOperationStatusPatch', () => {
  const now = new Date('2026-09-24T12:00:00Z')

  it('refuses a move the board cannot undo', () => {
    expect(buildOperationStatusPatch({ status: 'working' }, 'dismissed', { now, action: 'x' })).toBeNull()
    expect(buildOperationStatusPatch({ status: 'done' }, 'working', { now, action: 'x' })).toBeNull()
  })

  it('stamps completedAt on done and removes it on reopen', () => {
    const done = buildOperationStatusPatch({ status: 'queued' }, 'done', { now, action: 'Done in Slack' })!
    expect(done.set).toMatchObject({ status: 'done', completedAt: now.toISOString() })
    const reopened = buildOperationStatusPatch({ status: 'done' }, 'queued', { now, action: 'Reopened' })!
    expect(reopened.unset).toContain('completedAt')
  })

  it('appends one activity entry and keeps the last twenty', () => {
    const activity = Array.from({ length: 25 }, (_, index) => ({
      _key: `a${index}`,
      at: now.toISOString(),
      actor: 'person' as const,
      action: `step ${index}`,
    }))
    const patch = buildOperationStatusPatch({ status: 'queued', activity }, 'working', {
      now,
      action: 'Unstuck in Slack',
      outcome: 'by Juhan',
      unset: ['blocker'],
    })!
    const written = patch.set.activity as Array<{ action: string }>
    expect(written).toHaveLength(20)
    expect(written.at(-1)?.action).toBe('Unstuck in Slack')
    expect(patch.unset).toEqual(['blocker'])
  })
})
