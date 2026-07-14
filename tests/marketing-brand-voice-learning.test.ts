import { describe, expect, it } from 'vitest'
import {
  applyBrandVoiceLearningSelection,
  createBrandVoiceLearningProposal,
  createEmptyBrandVoiceLearningProposal,
  curateBrandVoiceExamples,
  extractBrandVoiceLearningDiff,
  hasMaterialVoiceEdit,
  isNearDuplicate,
  parseBrandVoiceLearningProposal,
  projectAfterToBeforeShape,
  type BrandVoiceLearningProposal,
} from '@/lib/marketing/brandVoiceLearning'
import type { MarketingBrandVoice } from '@/lib/marketing/brandVoice'

const voice: MarketingBrandVoice = {
  _key: 'principal',
  name: 'Principal voice',
  guidance: 'Be direct, useful, and calm.',
  do: ['Lead with the useful point.'],
  avoid: ['Avoid promotional hype.'],
  examples: ['Make the decision visible.'],
  status: 'active',
  isDefault: true,
}

describe('brand voice learning copy boundary', () => {
  it('projects edited values onto the generated shape without admitting new keys or array items', () => {
    const before = {
      headline: 'Generated headline',
      caption: 'Generated caption',
      frames: [{ title: 'One', body: 'Generated body' }],
    }
    const projected = projectAfterToBeforeShape(before, {
      headline: 'Edited headline',
      caption: 'Edited caption',
      price: '$50,000',
      frames: [
        { title: 'Edited one', body: 'Edited body', evidence: 'Private proof' },
        { title: 'New frame', body: 'Must be ignored' },
      ],
      preExistingDocumentField: 'Must be ignored',
    })

    expect(projected).toEqual({
      headline: 'Edited headline',
      caption: 'Edited caption',
      frames: [{ title: 'Edited one', body: 'Edited body' }],
    })
  })

  it('extracts only the closed copy allowlist and ignores factual, accessibility, and evidence fields', () => {
    const before = {
      headline: 'Old hook',
      caption: 'Old caption',
      callToAction: 'Learn more',
      canonicalUrl: 'https://old.example',
      price: '$10',
      score: 12,
      frames: [
        {
          title: 'Old frame',
          body: 'Old body',
          altText: 'Old factual image description',
          visualDirection: 'Show the sourced chart',
          citation: 'Source A',
        },
      ],
    }
    const after = {
      ...before,
      headline: 'New hook',
      canonicalUrl: 'https://new.example',
      price: '$20',
      score: 99,
      frames: [
        {
          ...before.frames[0],
          body: 'New body',
          altText: 'New factual image description',
          citation: 'Source B',
        },
      ],
    }

    const diff = extractBrandVoiceLearningDiff('contentDraft', before, after)
    expect(diff.changedFields).toEqual(['headline', 'frames[0].body'])
    expect(diff.before).toEqual({
      headline: 'Old hook',
      caption: 'Old caption',
      callToAction: 'Learn more',
      'frames[0].title': 'Old frame',
      'frames[0].body': 'Old body',
    })
    expect(JSON.stringify(diff)).not.toMatch(/canonical|price|score|altText|citation|Source B/)
    expect(hasMaterialVoiceEdit('contentDraft', before, after)).toBe(true)
  })

  it('limits Outreach learning to the opener and excludes the mixed factual call brief', () => {
    const diff = extractBrandVoiceLearningDiff(
      'outreach',
      {
        suggestedOpener: 'Old opener',
        callBrief: 'Old brief',
        researchSummary: 'Old fact',
        priceBand: '$25k',
      },
      {
        suggestedOpener: 'New opener',
        callBrief: 'Old brief',
        researchSummary: 'New fact',
        priceBand: '$50k',
      },
    )
    expect(diff.changedFields).toEqual(['suggestedOpener'])
    expect(diff.after).toEqual({ suggestedOpener: 'New opener' })
    expect(
      hasMaterialVoiceEdit(
        'outreach',
        { suggestedOpener: 'Same', callBrief: 'Old factual brief' },
        { suggestedOpener: 'Same', callBrief: 'New factual brief' },
      ),
    ).toBe(false)
  })
})

describe('bounded brand voice proposals', () => {
  const before = {
    headline: 'A long generated opening',
    caption: 'The generated draft explains everything before reaching the decision.',
    callToAction: 'Click here to learn more',
    frames: [{ title: 'Background', body: 'Several paragraphs of setup.' }],
  }
  const after = {
    ...before,
    headline: 'Start with the decision.',
    caption: 'Start with the decision. Show the tradeoff. End with one useful next move.',
    callToAction: 'See the decision',
    frames: [{ title: 'The decision', body: 'Show the tradeoff, then the next move.' }],
  }
  const diff = extractBrandVoiceLearningDiff('contentDraft', before, after)

  it('takes identity/revision/change paths from the server and bounds generalized output', () => {
    const proposal = createBrandVoiceLearningProposal({
      voice,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        voice: { key: 'forged', name: 'Forged' },
        settingsRevision: 'forged-revision',
        changedFields: ['price', 'citation'],
        summary: 'The edit consistently moves the decision ahead of explanatory setup.',
        confidence: 'high',
        guidanceReplacement:
          'Lead with the decision, explain the tradeoff plainly, and close with one useful next move.',
        doAdditions: [
          'Put the decision before the background.',
          'End with one concrete next move.',
          'A third rule must be dropped.',
        ],
        avoidAdditions: [
          'Avoid long setup before the point.',
          'Always name GoInvo and quote $50000.',
          'Keep extra caveats out of the opening.',
        ],
        curatedExamples: [
          {
            text: 'Start with the decision.',
            principles: ['Lead with the point.', 'Use compact sentences.'],
            reason: 'A concise decision-first opening.',
          },
          {
            text: 'Start with the decision',
            principles: ['Duplicate of the first.'],
            reason: 'Near duplicate.',
          },
          {
            text: 'Invented example that is not in the final copy.',
            principles: ['Invent examples.'],
            reason: 'Must be rejected.',
          },
          {
            text: 'Show the tradeoff.',
            principles: ['Name the tension plainly.'],
            reason: 'A distinct principle from the opening.',
          },
        ],
      },
    })

    expect(proposal.voice).toEqual({ key: 'principal', name: 'Principal voice' })
    expect(proposal.settingsRevision).toBe('settings-rev-1')
    expect(proposal.changedFields).toEqual(diff.changedFields)
    expect(proposal.confidence).toBe('medium')
    expect(proposal).not.toHaveProperty('guidanceReplacement')
    expect(proposal.doAdditions).toEqual([
      'Put the decision before the background.',
      'End with one concrete next move.',
    ])
    expect(proposal.avoidAdditions).toEqual([
      'Avoid long setup before the point.',
      'Keep extra caveats out of the opening.',
    ])
    expect(proposal.curatedExamples.map((example) => example.text)).toEqual([
      'Start with the decision.',
      'Show the tradeoff.',
    ])
  })

  it('returns a low-confidence, non-applyable proposal when no general principle survives', () => {
    const proposal = createBrandVoiceLearningProposal({
      voice,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        summary: 'Only a factual correction was found.',
        confidence: 'high',
        doAdditions: ['Always cite https://example.com.'],
        avoidAdditions: [],
        curatedExamples: [],
      },
    })
    expect(proposal).toMatchObject({
      confidence: 'low',
      changedFields: [],
      doAdditions: [],
      avoidAdditions: [],
      curatedExamples: [],
    })

    expect(
      createEmptyBrandVoiceLearningProposal({
        voice,
        surface: 'contentDraft',
        settingsRevision: 'settings-rev-1',
      }),
    ).toMatchObject({ confidence: 'low', changedFields: [] })
  })

  it('keeps at most six deterministic, diverse examples', () => {
    const result = curateBrandVoiceExamples(
      [
        'Lead with the decision.',
        'Lead with the decision',
        'Show the tradeoff plainly.',
      ],
      [
        'Name one useful next step.',
        'Use a calm, direct close.',
        'Prefer a concrete verb.',
        'Keep the setup compact.',
        'A seventh distinct example.',
      ],
    )
    expect(result).toEqual([
      'Lead with the decision.',
      'Show the tradeoff plainly.',
      'Name one useful next step.',
      'Use a calm, direct close.',
      'Prefer a concrete verb.',
      'Keep the setup compact.',
    ])
    expect(isNearDuplicate('Lead with the decision.', 'Lead with the decision')).toBe(true)
    expect(isNearDuplicate('Lead with the decision.', 'Use a calm, direct close.')).toBe(false)
  })

  it('can propose a smaller complete replacement set when the existing example library is full', () => {
    const fullVoice: MarketingBrandVoice = {
      ...voice,
      examples: [
        'Make the decision visible.',
        'Show the tradeoff plainly.',
        'Name one useful next move.',
        'Use a calm, direct close.',
        'Prefer a concrete verb.',
        'Keep the setup compact.',
      ],
    }
    const proposal = createBrandVoiceLearningProposal({
      voice: fullVoice,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        summary: 'The edit leads with the decision.',
        confidence: 'high',
        doAdditions: ['Put the decision before the setup.'],
        avoidAdditions: [],
        curatedExamples: [
          {
            text: 'Make the decision visible.',
            principles: ['Use concrete phrasing.'],
            reason: 'Retains a strong existing example.',
          },
          {
            text: 'Start with the decision.',
            principles: ['Lead with the point.'],
            reason: 'A concise decision-first opening.',
          },
        ],
      },
    })

    expect(proposal.curatedExamples.map((example) => example.text)).toEqual([
      'Make the decision visible.',
      'Start with the decision.',
    ])
    expect(proposal.doAdditions).toEqual(['Put the decision before the setup.'])
  })

  it('offers only the additive Do/Avoid capacity that can actually be saved', () => {
    const nearlyFullVoice: MarketingBrandVoice = {
      ...voice,
      do: Array.from({ length: 11 }, (_, index) => `Existing Do rule ${index + 1}.`),
      avoid: Array.from({ length: 12 }, (_, index) => `Existing Avoid rule ${index + 1}.`),
    }
    const proposal = createBrandVoiceLearningProposal({
      voice: nearlyFullVoice,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        summary: 'The edit moves the decision ahead of the setup.',
        confidence: 'medium',
        doAdditions: [
          'Put the decision before the background.',
          'End with one concrete next move.',
        ],
        avoidAdditions: [
          'Avoid long setup before the point.',
          'Avoid generic promotional language.',
        ],
        curatedExamples: [],
      },
    })

    expect(proposal.doAdditions).toEqual(['Put the decision before the background.'])
    expect(proposal.avoidAdditions).toEqual([])
  })

  it('keeps Outreach learning additive and strips private or factual details and exact snippets', () => {
    const outreachDiff = extractBrandVoiceLearningDiff(
      'outreach',
      { suggestedOpener: 'I wanted to introduce our studio.' },
      {
        suggestedOpener:
          'Jane Doe, your Acme Health team cut wait times by forty two percent, so this may be useful.',
      },
    )
    const proposal = createBrandVoiceLearningProposal({
      voice,
      surface: 'outreach',
      settingsRevision: 'settings-rev-1',
      diff: outreachDiff,
      modelOutput: {
        summary: 'The edit opens with specific relevance.',
        confidence: 'high',
        guidanceReplacement: 'Rewrite the voice around this contact and claim.',
        doAdditions: [
          'mention jane doe at acme health.',
          'mention acme.',
          'Lead with a relevant reason for writing.',
        ],
        avoidAdditions: [
          'cite the forty two percent reduction.',
          'mention jane.',
          'Avoid generic flattery.',
        ],
        curatedExamples: [
          {
            text: 'Jane Doe, your Acme Health team cut wait times by forty two percent.',
            principles: ['Lead with proof.'],
            reason: 'The edited opener is more specific.',
          },
        ],
      },
    })

    expect(proposal.confidence).toBe('low')
    expect(proposal).not.toHaveProperty('guidanceReplacement')
    expect(proposal.doAdditions).toEqual(['Lead with a relevant reason for writing.'])
    expect(proposal.avoidAdditions).toEqual(['Avoid generic flattery.'])
    expect(proposal.curatedExamples).toEqual([])
    expect(JSON.stringify(proposal)).not.toMatch(
      /jane|acme|forty two percent|reduction|wait times/i,
    )
  })

  it('rejects a copied Outreach token even when it is a lowercase style word or modal', () => {
    for (const token of ['may', 'clear', 'direct', 'point']) {
      const outreachDiff = extractBrandVoiceLearningDiff(
        'outreach',
        { suggestedOpener: 'hello' },
        { suggestedOpener: `hello ${token}` },
      )
      const proposal = createBrandVoiceLearningProposal({
        voice,
        surface: 'outreach',
        settingsRevision: 'settings-rev-1',
        diff: outreachDiff,
        modelOutput: {
          summary: 'The edit changes the opening style.',
          confidence: 'high',
          doAdditions: [`mention ${token}.`, 'Lead with a relevant reason for writing.'],
          avoidAdditions: [],
          curatedExamples: [],
        },
      })

      expect(proposal.confidence).toBe('low')
      expect(proposal.doAdditions, `copied token: ${token}`).toEqual([
        'Lead with a relevant reason for writing.',
      ])
    }
  })

  it('cross-filters identical and opposite-topic Do/Avoid proposals against each other and the current voice', () => {
    const voiceWithOppositeRules: MarketingBrandVoice = {
      ...voice,
      do: ['Use plain language.'],
      avoid: ['Avoid generic flattery.'],
    }
    const proposal = createBrandVoiceLearningProposal({
      voice: voiceWithOppositeRules,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        summary: 'The edit uses compact sentences and avoids jargon.',
        confidence: 'medium',
        doAdditions: [
          'Use compact sentences.',
          'Use generic flattery.',
          'Put the decision before the background.',
        ],
        avoidAdditions: [
          'Use compact sentences.',
          'Avoid plain language.',
          'Avoid jargon.',
        ],
        curatedExamples: [],
      },
    })

    expect(proposal.doAdditions).toEqual([
      'Use compact sentences.',
      'Put the decision before the background.',
    ])
    expect(proposal.avoidAdditions).toEqual(['Avoid jargon.'])
  })

  it('cross-filters semantic style aliases across Do/Avoid polarity', () => {
    const proposal = createBrandVoiceLearningProposal({
      voice,
      surface: 'contentDraft',
      settingsRevision: 'settings-rev-1',
      diff,
      modelOutput: {
        summary: 'The edit uses shorter sentences.',
        confidence: 'medium',
        doAdditions: ['Use short sentences.'],
        avoidAdditions: ['Avoid brief sentences.'],
        curatedExamples: [],
      },
    })

    expect(proposal.doAdditions).toEqual(['Use short sentences.'])
    expect(proposal.avoidAdditions).toEqual([])
  })
})

describe('explicit brand voice proposal application', () => {
  const proposal: BrandVoiceLearningProposal = {
    voice: { key: 'principal', name: 'Principal voice' },
    surface: 'contentDraft',
    settingsRevision: 'settings-rev-1',
    summary: 'Generalized changes.',
    confidence: 'medium',
    changedFields: ['headline', 'caption'],
    guidanceReplacement: 'Lead with the decision and use compact, useful language.',
    doAdditions: ['Put the decision before the background.', 'End with one useful next move.'],
    avoidAdditions: ['Avoid long setup before the point.'],
    curatedExamples: [
      {
        text: 'Make the decision visible.',
        principles: ['Use concrete phrasing.'],
        reason: 'Retains an approved example with a distinct principle.',
      },
      {
        text: 'Start with the decision.',
        principles: ['Lead with the point.'],
        reason: 'Concise opening.',
      },
      {
        text: 'Show the tradeoff.',
        principles: ['Name the tension.'],
        reason: 'Direct middle.',
      },
    ],
  }

  it('applies the selected complete example set and persists strings, not edit history or rationale', () => {
    const applied = applyBrandVoiceLearningSelection(voice, proposal, {
      guidance: false,
      do: ['Put the decision before the background.'],
      avoid: [],
      examples: true,
    })

    expect(applied.fields).toEqual({
      do: ['Lead with the useful point.', 'Put the decision before the background.'],
      examples: [
        'Make the decision visible.',
        'Start with the decision.',
        'Show the tradeoff.',
      ],
    })
    expect(applied.fields).not.toHaveProperty('guidance')
    expect(JSON.stringify(applied.fields)).not.toMatch(
      /Concise opening|Name the tension|generatedCopy|finalCopy|changedFields/,
    )
    expect(applied.changes).toEqual({
      guidance: false,
      do: ['Put the decision before the background.'],
      avoid: [],
      examples: [
        'Make the decision visible.',
        'Start with the decision.',
        'Show the tradeoff.',
      ],
    })
  })

  it('preserves every current approved rule verbatim when appending an unrelated candidate', () => {
    const voiceWithApprovedNearDuplicates: MarketingBrandVoice = {
      ...voice,
      do: ['Lead with the useful point.', 'Lead with useful point.'],
    }
    const applied = applyBrandVoiceLearningSelection(voiceWithApprovedNearDuplicates, proposal, {
      guidance: false,
      do: ['End with one useful next move.'],
      avoid: [],
      examples: false,
    })

    expect(applied.fields.do).toEqual([
      'Lead with the useful point.',
      'Lead with useful point.',
      'End with one useful next move.',
    ])
    expect(applied.changes.do).toEqual(['End with one useful next move.'])
  })

  it('rejects selected rules that conflict across Do/Avoid polarity or with the current opposite list', () => {
    const conflictingProposal: BrandVoiceLearningProposal = {
      ...proposal,
      doAdditions: ['Use compact sentences.', 'Use generic flattery.'],
      avoidAdditions: ['Use compact sentences.'],
    }
    expect(() =>
      applyBrandVoiceLearningSelection(voice, conflictingProposal, {
        guidance: false,
        do: ['Use compact sentences.'],
        avoid: ['Use compact sentences.'],
        examples: false,
      }),
    ).toThrow(/cannot conflict about the same topic/i)

    expect(() =>
      applyBrandVoiceLearningSelection(
        { ...voice, avoid: ['Avoid generic flattery.'] },
        conflictingProposal,
        {
          guidance: false,
          do: ['Use generic flattery.'],
          avoid: [],
          examples: false,
        },
      ),
    ).toThrow(/cannot conflict about the same topic/i)
  })

  it('rejects semantic style-alias conflicts during apply, including the current opposite list', () => {
    const semanticConflictProposal: BrandVoiceLearningProposal = {
      ...proposal,
      doAdditions: ['Use short sentences.'],
      avoidAdditions: ['Avoid brief sentences.'],
    }

    expect(() =>
      applyBrandVoiceLearningSelection(voice, semanticConflictProposal, {
        guidance: false,
        do: ['Use short sentences.'],
        avoid: ['Avoid brief sentences.'],
        examples: false,
      }),
    ).toThrow(/cannot conflict about the same topic/i)

    expect(() =>
      applyBrandVoiceLearningSelection(
        { ...voice, do: ['Use short sentences.'] },
        semanticConflictProposal,
        {
          guidance: false,
          do: [],
          avoid: ['Avoid brief sentences.'],
          examples: false,
        },
      ),
    ).toThrow(/cannot conflict about the same topic/i)
  })

  it('rejects guidance replacement, unoffered selections, archived voices, and empty applications', () => {
    expect(() =>
      applyBrandVoiceLearningSelection(voice, proposal, {
        guidance: true,
        do: [],
        avoid: [],
        examples: false,
      }),
    ).toThrow(/cannot replace the voice guidance/i)
    expect(() =>
      applyBrandVoiceLearningSelection(voice, proposal, {
        guidance: false,
        do: ['Inject an arbitrary rule.'],
        avoid: [],
        examples: false,
      }),
    ).toThrow(/come from this proposal/i)
    expect(() =>
      applyBrandVoiceLearningSelection({ ...voice, status: 'archived' }, proposal, {
        guidance: true,
        do: [],
        avoid: [],
        examples: false,
      }),
    ).toThrow(/active voice/i)
    expect(() =>
      applyBrandVoiceLearningSelection(voice, proposal, {
        guidance: false,
        do: [],
        avoid: [],
        examples: false,
      }),
    ).toThrow(/Select at least one/i)
  })

  it('fails closed when a returned proposal lacks a safe identity or exact revision', () => {
    expect(parseBrandVoiceLearningProposal({ ...proposal, settingsRevision: 'bad revision' })).toBeNull()
    expect(
      parseBrandVoiceLearningProposal({ ...proposal, voice: { key: 'bad!key', name: 'Voice' } }),
    ).toBeNull()
  })
})
