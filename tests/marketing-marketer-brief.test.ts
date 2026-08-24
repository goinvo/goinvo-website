import { describe, expect, it } from 'vitest'
import {
  MARKETER_BRIEF_AUTOMATIC_METHODS,
  MARKETER_BRIEF_MAX_LENGTH,
  buildMarketerBriefAssistPayload,
  buildMarketerBriefResearchDocument,
  buildMarketerBriefResearchPatch,
  findReusableMarketerBriefProject,
  normalizeMarketerBriefProject,
  type MarketerBriefProject,
  type MarketerBriefProposal,
} from '@/sanity/components/marketing/marketerBrief'

describe('Tell Marqueta brief privacy and normalization', () => {
  it('isolates the raw coworker update in the bounded assistant prompt', () => {
    const rawUpdate = `Private client launch ${'x'.repeat(MARKETER_BRIEF_MAX_LENGTH)}`
    const payload = buildMarketerBriefAssistPayload(rawUpdate)

    expect(Object.keys(payload)).toEqual(['kind', 'draft', 'prompt'])
    expect(payload).toMatchObject({
      kind: 'researchProject',
      draft: {
        title: '',
        status: 'draft',
        researchType: 'topic',
        intakeMode: 'coworkerUpdate',
      },
    })
    expect(payload.prompt).toHaveLength(MARKETER_BRIEF_MAX_LENGTH)
    expect(JSON.stringify(payload.draft)).not.toContain('Private client launch')
    expect(payload.draft).not.toHaveProperty('internalNotes')
  })

  it('normalizes only supported project values and drops document identity fields', () => {
    const proposal = {
      summary: 'Research the launch before making campaign records.',
      researchProject: {
        _id: 'forged-project-id',
        _rev: 'forged-revision',
        title: 'Care navigation launch',
        status: 'published',
        researchType: 'unsupported-type',
        campaignObjective: 'unsupported-objective',
        language: 'de',
        goals: ['Understand demand', 'understand demand', '', 42],
        methods: ['survey', 'unsupported-method', 'survey'],
        collaborators: [
          {
            name: 'Priya',
            relationshipType: 'invented-relationship',
            contributionType: 'invented-contribution',
            availabilityStart: '2027-02-30',
            status: 'published',
          },
        ],
        researchQuestions: [
          {
            _key: 'known-question',
            question: 'Who needs this?',
            method: 'audienceInterview',
            status: 'readyToBrief',
          },
          {
            question: 'Who needs this?',
            method: 'survey',
            status: 'scheduled',
          },
          {
            question: 'What evidence already exists?',
            method: 'unsupported-method',
            status: 'unsupported-status',
          },
        ],
        unknownField: 'must not survive',
      },
    } as unknown as MarketerBriefProposal

    const normalized = normalizeMarketerBriefProject(proposal)

    expect(normalized).toMatchObject({
      title: 'Care navigation launch research project',
      status: 'researching',
      researchType: 'topic',
      campaignObjective: 'awareness',
      language: 'en',
      goals: ['Understand demand'],
      methods: ['cmsScan', 'survey'],
    })
    expect(normalized).not.toHaveProperty('_id')
    expect(normalized).not.toHaveProperty('_rev')
    expect(normalized).not.toHaveProperty('unknownField')
    expect(normalized.researchQuestions).toHaveLength(2)
    expect(normalized.researchQuestions[0]).toMatchObject({
      _key: 'known-question',
      _type: 'researchQuestion',
      method: 'audienceInterview',
      status: 'readyToBrief',
    })
    expect(normalized.researchQuestions[1]).toMatchObject({
      _type: 'researchQuestion',
      method: 'deskResearch',
      status: 'idea',
    })
    expect(normalized.collaborators[0]).toMatchObject({
      name: 'Priya',
      relationshipType: '',
      contributionType: '',
      availabilityStart: '',
      status: 'idea',
    })
  })

  it('never copies the raw note or proposal metadata into the saved document', () => {
    const rawNote = 'CONFIDENTIAL-COWORKER-NOTE-9471'
    const proposal = {
      summary: 'A safe normalized summary.',
      rationale: [rawNote],
      siteReferences: [{ title: rawNote, url: 'https://example.com' }],
      researchProject: {
        title: 'Care navigation',
        brief: 'Investigate the audience and available evidence.',
        internalNotes: rawNote,
      },
      rawNote,
    } as unknown as MarketerBriefProposal

    const document = buildMarketerBriefResearchDocument(proposal)
    const serialized = JSON.stringify(document)

    expect(document._type).toBe('marketingResearchProject')
    expect(document.internalNotes).toContain('The raw coworker note was not saved.')
    expect(serialized).not.toContain(rawNote)
    expect(document).not.toHaveProperty('summary')
    expect(document).not.toHaveProperty('rationale')
    expect(document).not.toHaveProperty('siteReferences')
  })

  it('keeps only HTTP(S) URLs, strips fragments, and deduplicates destinations', () => {
    const normalized = normalizeMarketerBriefProject({
      researchProject: {
        title: 'URL safety',
        canonicalUrl: 'https://GoInvo.com/work/care-navigation/#private-section',
        seedUrls: [
          'javascript:alert(1)',
          'file:///private/brief.txt',
          'mailto:someone@example.com',
          'https://user:password@example.com/private',
          'https://goinvo.com/work/care-navigation/?duplicate=1#other-section',
          'http://example.org/source#notes',
          'http://example.org/source#duplicate',
        ],
      },
    })

    expect(normalized.canonicalUrl).toBe('https://goinvo.com/work/care-navigation/')
    expect(normalized.seedUrls).toEqual([
      'https://goinvo.com/work/care-navigation/',
      'http://example.org/source',
    ])
    expect(JSON.stringify(normalized.seedUrls)).not.toMatch(/javascript:|file:|mailto:|#|private/i)
  })

  it('always includes the bounded automatic CMS scan method', () => {
    expect(MARKETER_BRIEF_AUTOMATIC_METHODS).toEqual(['cmsScan'])
    expect(
      normalizeMarketerBriefProject({
        researchProject: { title: 'Independent update', methods: ['stakeholderInterview'] },
      }).methods,
    ).toEqual(['cmsScan', 'stakeholderInterview'])
    expect(
      buildMarketerBriefResearchDocument({
        researchProject: { title: 'Independent update', methods: ['not-a-method'] },
      }).methods,
    ).toEqual(['cmsScan'])
  })
})

describe('Tell Marqueta project reuse and merge behavior', () => {
  const proposal: MarketerBriefProposal = {
    researchProject: {
      title: 'Care navigation launch',
      canonicalUrl: 'https://goinvo.com/work/care-navigation/#overview',
    },
  }

  it('reuses one exact destination match but refuses an ambiguous match', () => {
    const exact = findReusableMarketerBriefProject(
      [
        {
          _id: 'project-1',
          title: 'Existing care navigation research project',
          status: 'researching',
          canonicalUrl: 'https://goinvo.com/work/care-navigation/',
        },
        {
          _id: 'project-2',
          title: 'Different project',
          status: 'researching',
          canonicalUrl: 'https://goinvo.com/work/another-project/',
        },
      ],
      proposal,
    )

    expect(exact).toMatchObject({
      project: { _id: 'project-1' },
      reason: 'same canonical destination',
    })

    const ambiguousProjects: MarketerBriefProject[] = [
      {
        _id: 'project-a',
        title: 'Care navigation launch research project',
        status: 'researching',
        canonicalUrl: 'https://goinvo.com/work/care-navigation/',
      },
      {
        _id: 'project-b',
        title: 'Care navigation launch research project',
        status: 'reviewing',
        canonicalUrl: 'http://goinvo.com/work/care-navigation#duplicate',
      },
    ]
    expect(findReusableMarketerBriefProject(ambiguousProjects, proposal)).toBeNull()
  })

  it('preserves reviewed existing fields while appending distinct new context', () => {
    const existing: MarketerBriefProject = {
      _id: 'project-1',
      status: 'draft',
      brief: 'Keep the existing brief.',
      audience: 'Existing health-system leaders',
      goals: ['Preserve the existing goal'],
      campaignObjective: 'qualifiedConversations',
      positioning: 'Keep the approved positioning.',
      canonicalUrl: 'https://goinvo.com/work/existing/',
      seedKeywords: ['care navigation'],
      seedUrls: ['https://source.example/existing'],
      targetGeography: 'ca',
      language: 'es',
      methods: ['stakeholderInterview'],
      researchQuestions: [
        {
          _key: 'existing-question',
          _type: 'researchQuestion',
          question: 'What do leaders need?',
          whyItMatters: 'Existing rationale',
          method: 'stakeholderInterview',
          status: 'needsSource',
        },
      ],
      collaborators: [
        {
          _key: 'existing-collaborator',
          _type: 'researchCollaborator',
          name: 'Alex',
          organization: 'Example Health',
          topicArea: 'Care access',
          notes: 'Existing collaboration note',
        },
      ],
      internalNotes: 'Keep this internal note.',
    }
    const patch = buildMarketerBriefResearchPatch(existing, {
      researchProject: {
        title: 'Fresh work',
        brief: 'Add the new launch context.',
        audience: 'Do not replace the reviewed audience',
        goals: ['Preserve the existing goal', 'Add a launch goal'],
        campaignObjective: 'awareness',
        positioning: 'Do not replace approved positioning.',
        canonicalUrl: 'https://goinvo.com/work/incoming/',
        seedKeywords: ['care navigation', 'patient access'],
        seedUrls: ['https://source.example/existing#duplicate', 'https://source.example/new'],
        targetGeography: 'us',
        language: 'en',
        methods: ['survey'],
        researchQuestions: [
          {
            question: 'What do leaders need?',
            whyItMatters: 'Duplicate must not replace the reviewed question',
            method: 'survey',
          },
          {
            question: 'What evidence supports the launch?',
            method: 'sourceReview',
          },
        ],
        collaborators: [
          {
            name: 'Alex',
            organization: 'Example Health',
            topicArea: 'Care access',
            notes: 'Duplicate must not replace the reviewed collaborator',
          },
          {
            name: 'Sam',
            organization: 'Community Clinic',
            topicArea: 'Patient access',
          },
        ],
      },
    })

    expect(patch).toMatchObject({
      status: 'researching',
      audience: 'Existing health-system leaders',
      goals: ['Preserve the existing goal', 'Add a launch goal'],
      campaignObjective: 'qualifiedConversations',
      positioning: 'Keep the approved positioning.',
      canonicalUrl: 'https://goinvo.com/work/existing/',
      seedKeywords: ['care navigation', 'patient access'],
      seedUrls: [
        'https://source.example/existing',
        'https://goinvo.com/work/incoming/',
        'https://source.example/new',
      ],
      targetGeography: 'ca',
      language: 'es',
      methods: ['stakeholderInterview', 'cmsScan', 'survey'],
    })
    expect(patch.brief).toBe('Keep the existing brief.\n\nNew work context: Add the new launch context.')
    expect(patch.researchQuestions).toHaveLength(2)
    expect(patch.researchQuestions[0]).toMatchObject({
      _key: 'existing-question',
      whyItMatters: 'Existing rationale',
      method: 'stakeholderInterview',
    })
    expect(patch.researchQuestions[1]).toMatchObject({
      question: 'What evidence supports the launch?',
      method: 'sourceReview',
    })
    expect(patch.collaborators).toHaveLength(2)
    expect(patch.collaborators[0]).toMatchObject({
      _key: 'existing-collaborator',
      notes: 'Existing collaboration note',
    })
    expect(patch.collaborators[1]).toMatchObject({
      name: 'Sam',
      organization: 'Community Clinic',
    })
    expect(patch.internalNotes).toContain('Keep this internal note.')
    expect(patch.internalNotes).toContain('The raw note was not saved')
  })
})
