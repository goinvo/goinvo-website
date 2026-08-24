import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveMarketingAiModelChange } from '@/sanity/components/marketing/MarketingAiModelSetting'
import { WorkUpdateIntake } from '@/sanity/components/marketing/WorkUpdateIntake'
import { requestMarketingAssist } from '@/sanity/components/marketing/marketingAssistRequest'
import { GuidanceChecklist, Select } from '@/sanity/tools/marketingTool'

const originalProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const originalWindow = globalThis.window

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalProjectId === undefined) delete process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  else process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = originalProjectId
  if (originalWindow === undefined) delete (globalThis as { window?: Window }).window
  else (globalThis as { window?: Window }).window = originalWindow
})

describe('authenticated marketing workspace requests', () => {
  it('sends the Studio session header to the marketing assistant', async () => {
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = 'test-project'
    ;(globalThis as { window?: Partial<Window> }).window = {
      localStorage: {
        getItem: vi.fn(() => JSON.stringify({ token: 'studio-session-token' })),
      } as unknown as Storage,
    }
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ usedAi: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await requestMarketingAssist({ kind: 'strategyAsset', draft: { title: 'Test' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/marketing/assist',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-sanity-session': 'studio-session-token',
        }),
      }),
    )
  })

  it('surfaces an assistant authentication failure instead of returning fallback data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'Studio sign-in required.' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(requestMarketingAssist({ kind: 'researchProject', draft: {} })).rejects.toThrow(
      'Studio sign-in required.',
    )
  })
})

describe('AI model persistence', () => {
  it('rolls back the optimistic model and returns a visible error on save failure', async () => {
    const setModel = vi.fn()
    const commit = vi.fn().mockRejectedValue(new Error('Permission denied'))
    const set = vi.fn().mockReturnValue({})
    const patch = vi.fn((
      _id: string,
      update: (patchBuilder: { set: typeof set }) => unknown,
    ) => {
      update({ set })
      return { commit }
    })
    const createIfNotExists = vi.fn().mockReturnValue({ patch })
    const transaction = vi.fn().mockReturnValue({ createIfNotExists })

    const error = await saveMarketingAiModelChange({
      client: { transaction } as never,
      nextModel: 'claude-sonnet-4-6',
      previousModel: 'claude-opus-4-8',
      setModel,
    })

    expect(setModel.mock.calls.map(([model]) => model)).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-8',
    ])
    expect(error).toBe('Permission denied. Your previous selection was restored.')
    expect(createIfNotExists).toHaveBeenCalledWith({ _id: 'marketingSettings', _type: 'marketingSettings' })
    expect(patch).toHaveBeenCalledWith('marketingSettings', expect.any(Function))
    expect(set).toHaveBeenCalledWith({ aiModel: 'claude-sonnet-4-6' })
  })

  it('keeps the new model after Sanity confirms the save', async () => {
    const setModel = vi.fn()
    const commit = vi.fn().mockResolvedValue({ _id: 'marketingSettings' })
    const set = vi.fn().mockReturnValue({})
    const patch = vi.fn((
      _id: string,
      update: (patchBuilder: { set: typeof set }) => unknown,
    ) => {
      update({ set })
      return { commit }
    })
    const createIfNotExists = vi.fn().mockReturnValue({ patch })
    const transaction = vi.fn().mockReturnValue({ createIfNotExists })

    const error = await saveMarketingAiModelChange({
      client: { transaction } as never,
      nextModel: 'claude-sonnet-4-6',
      previousModel: 'claude-opus-4-8',
      setModel,
    })

    expect(setModel).toHaveBeenCalledOnce()
    expect(setModel).toHaveBeenCalledWith('claude-sonnet-4-6')
    expect(set).toHaveBeenCalledWith({ aiModel: 'claude-sonnet-4-6' })
    expect(error).toBeNull()
  })
})

describe('workspace accessible names', () => {
  it('renders the shared Select accessible name', () => {
    const markup = renderToStaticMarkup(
      createElement(Select, {
        ariaLabel: 'Analytics source',
        value: 'ga4',
        options: [{ title: 'Google Analytics 4', value: 'ga4' }],
        onChange: () => undefined,
      }),
    )

    expect(markup).toContain('aria-label="Analytics source"')
  })

  it('makes the compact Next actions preview decorative and the disclosure operable', () => {
    const source = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')

    expect(source).toContain('id="marketing-next-actions-list"')
    expect(source).toContain('aria-controls="marketing-next-actions-list"')
    expect(source).toContain('aria-expanded={nextActionsExpanded}')
    expect(source).toContain('data-next-actions-preview="true"')
    expect(source).toContain('aria-hidden="true"')
    expect(source).toContain("pointerEvents: 'none'")
    expect(source).toContain("maskImage: 'linear-gradient(to bottom")
    expect(source).toContain('`Collapse to top ${NEXT_ACTIONS_INITIAL_COUNT}`')
  })

  it('makes the rough work-update handoff understandable without exposing structured marketing fields', () => {
    const intake = readFileSync('src/sanity/components/marketing/WorkUpdateIntake.tsx', 'utf8')
    const tool = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')

    expect(intake).toContain('htmlFor="marketing-work-update"')
    expect(intake).toContain('id="marketing-work-update"')
    expect(intake).toContain("aria-describedby={`marketing-work-update-help marketing-work-update-safety marketing-work-update-count${error ? ' marketing-work-update-error' : ''}`}")
    expect(intake).toContain('role="status"')
    expect(intake).toContain('aria-live="polite"')
    expect(intake).toContain('role="alert"')
    expect(intake).toContain('What the handoff will do')
    expect(intake).toContain('Marqueta’s private shared desk')
    expect(intake).not.toContain('type="checkbox"')
    expect(intake).toContain('Nothing changes until you hand this off')
    expect(intake).toContain('never publishes, contacts anyone, approves claims, changes brand voice, deletes records, or spends paid research credits')
    expect(intake).toContain('tabIndex={-1}')
    expect(intake).toContain('minHeight: 42')
    expect(tool).toContain('markUnsavedChange(MARKETER_BRIEF_UNSAVED_ID')
    expect(tool).toContain('clearUnsavedChanges(MARKETER_BRIEF_UNSAVED_ID)')
  })

  it('renders one labeled conversational work-update input with a non-destructive starting state', () => {
    const markup = renderToStaticMarkup(
      createElement(WorkUpdateIntake, {
        existingProjects: [],
        onAdopt: async () => ({
          operationId: 'marketingOperation.test',
          projectId: 'test-project',
          title: 'Test project',
          reused: false,
          createdResults: 0,
        }),
        onOpenOperations: () => undefined,
        onOpenResearch: () => undefined,
      }),
    )

    expect(markup).toContain('data-work-update-intake="true"')
    expect(markup).toContain('<label for="marketing-work-update"')
    expect(markup).toContain('<textarea id="marketing-work-update"')
    expect(markup).toContain('Messy notes are fine')
    expect(markup).toContain('Plan the marketing updates')
    expect(markup).not.toContain('Hand this to Marketing (1 change)')
    expect(markup).not.toContain('type="checkbox"')
  })

  it('gives Marqueta’s shared desk semantic structure and explicit mutation names', () => {
    const source = readFileSync('src/sanity/components/marketing/MarketingOperationsBoard.tsx', 'utf8')

    expect(source).toContain('aria-labelledby="marketing-operations-title"')
    expect(source).toContain('aria-label="Filter Marketing’s desk"')
    expect(source).toContain('aria-pressed={active}')
    expect(source).toContain('<caption')
    expect(source).toContain('<th scope="col"')
    expect(source).toContain('aria-label={`Accountable owner for ${item.title}`}')
    expect(source).toContain('aria-label={`Due date for ${item.title}`}')
    expect(source).toContain('aria-label={`Mark ${item.title} done`}')
    expect(source).toContain('aria-label={`Answer Marketing for ${item.title}`}')
    expect(source).toContain('aria-label={`Save answer for ${item.title} and return it to Marketing`}')
    expect(source).toContain('role="status" aria-live="polite"')
    expect(source).toContain('Publishing, outreach, paid research, claim approval, deletion, and brand-voice changes always wait for a person')
  })

  it('gives every shared Select in the audited workspaces an explicit name', () => {
    const files = [
      'ResearchWorkspace.tsx',
      'AnalyticsWorkspace.tsx',
      'LinkTreeWorkspace.tsx',
      'CalendarWorkspace.tsx',
      'MarketingAiModelSetting.tsx',
    ]
    let selectCount = 0
    const missingNames: string[] = []

    for (const file of files) {
      const path = `src/sanity/components/marketing/${file}`
      const source = readFileSync(path, 'utf8')
      const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const visit = (node: ts.Node) => {
        if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sourceFile) === 'Select') {
          selectCount += 1
          const hasName = node.attributes.properties.some(
            (property) => ts.isJsxAttribute(property) && property.name.getText(sourceFile) === 'ariaLabel',
          )
          if (!hasName) missingNames.push(`${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`)
        }
        ts.forEachChild(node, visit)
      }
      visit(sourceFile)
    }

    expect(selectCount, 'Expected to audit the workspace selectors').toBeGreaterThan(20)
    expect(missingNames).toEqual([])
  })

  it('labels the Link Tree upload and evidence action column', () => {
    const linkTree = readFileSync('src/sanity/components/marketing/LinkTreeWorkspace.tsx', 'utf8')
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(linkTree).toContain('htmlFor={`link-cover-${item._id}`}')
    expect(linkTree).toContain('id={`link-cover-${item._id}`}')
    expect(linkTree).toContain('Upload cover image')
    expect(outreach).toContain("['Project', 'Client', 'Techniques', 'Highlights', 'Status', 'Actions']")
  })

  it('labels the SEO audit, citation check, and outreach intake controls', () => {
    const seo = readFileSync('src/sanity/components/SeoWorkspace.tsx', 'utf8')
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')
    const intakeGrid = readFileSync('src/sanity/components/marketing/ContactIntakeGrid.tsx', 'utf8')

    expect(seo).toContain('aria-label="Page audit URL"')
    expect(seo).toContain('aria-label="Citation check URL"')
    expect(outreach).toContain('aria-label="Contacts to add"')
    expect(outreach).toContain('aria-label="Type one contact and press Enter, or paste a list"')
    expect(intakeGrid).toContain('aria-label="Contact drafts ready to check"')
    expect(intakeGrid).toContain('aria-label={`Remove ${row.name} from Add Contacts`}')
    expect(outreach).toContain('Enter adds one row.')
    expect(outreach).toContain("event.key === 'Enter' && !event.nativeEvent.isComposing")
    expect(outreach).toContain("if (!/\\r?\\n/.test(pastedText) && !pastedText.includes('\\t')) return")
    expect(outreach).toContain('const paste = prepareContactIntakePaste(pastedText)')
    expect(outreach).toContain('disabled={intakeBusy !== null}')
    expect(outreach).toContain("aria-label={`Suggested opener for ${contact.name || 'contact'}`}")
    expect(outreach).toContain("aria-label={`Call brief for ${contact.name || 'contact'}`}")
  })

  it('makes the outreach progress tracker understandable and operable without color', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain('<caption style=')
    expect(outreach).toContain('scope="col"')
    expect(outreach).toContain('scope="row"')
    expect(outreach).toContain('Recommended next')
    expect(outreach).toContain('aria-label="Recommended next outreach"')
    expect(outreach).toContain('aria-label={`Channel options for ${row.name}`}')
    expect(outreach).toContain('aria-label={`Edit contact info for ${row.name}`}')
    expect(outreach).toContain('aria-label={`Change modality for ${row.name}`}')
    expect(outreach).toContain('aria-label={`Copy opener for ${row.name}`}')
    expect(outreach).toContain('<strong>Do this:</strong> {row.nextStep}')
    expect(outreach).toContain('aria-label={`${option?.title || draft.channel} recommendation rule')
    expect(outreach).toContain('Nothing is sent automatically')
  })

  it('supports direct follow-up scheduling and prefilled email review', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain("row.repairTarget === 'followUpSchedule'")
    expect(outreach).toContain('data-outreach-contact-field="followUpAt"')
    expect(outreach).toContain('data-outreach-contact-field="nextStep"')
    expect(outreach).toContain('subject=${encodeURIComponent(subject)}')
    expect(outreach).toContain('body=${encodeURIComponent(body)}')
    expect(outreach).toContain("unset.push('closedAt', 'closedValue', 'closeReason')")
    expect(outreach).not.toContain('data-outreach-contact-field="status"')
    expect(outreach).toContain('Approve research or log an interaction to change pipeline status.')
    expect(outreach).toContain('Show completed contacts')
  })

  it('routes channel-rule blockers to a labelled, focused channel editor', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain("else if (row.editFields.includes('channelOverrides')) startChannelOptions(contact)")
    expect(outreach).toContain('ref={channelOptionsEditorRef}')
    expect(outreach).toContain('aria-labelledby="outreach-channel-options-heading"')
    expect(outreach).toContain('Only one channel can be Preferred; choosing another returns the previous one to Auto.')
    expect(outreach).toContain('panel.focus({ preventScroll: true })')
  })

  it('labels and focuses revealed tracker brief and interaction-log regions', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain('ref={trackerDetailRef}')
    expect(outreach).toContain('aria-labelledby="outreach-tracker-detail-heading"')
    expect(outreach).toContain('ref={logPanelRef}')
    expect(outreach).toContain('aria-labelledby="outreach-log-panel-heading"')
    expect(outreach).toMatch(/ref=\{trackerDetailRef\}[\s\S]{0,240}tabIndex=\{-1\}/)
    expect(outreach).toMatch(/ref=\{logPanelRef\}[\s\S]{0,240}tabIndex=\{-1\}/)
    expect(outreach).toMatch(/ref=\{channelOptionsEditorRef\}[\s\S]{0,240}tabIndex=\{-1\}/)
  })

  it('discloses saved channel rules in the modality badge and explanation', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain("function trackerChannelRuleSummary(row: OutreachProgressRow): string")
    expect(outreach).toContain("'Channel rules applied'")
    expect(outreach).toContain("'Channel rules block outreach'")
    expect(outreach).toContain('<strong>Saved channel rules:</strong> {channelRuleSummary}')
  })

  it('keeps the SEO ideas table horizontally reachable on compact screens', () => {
    const seo = readFileSync('src/sanity/components/SeoWorkspace.tsx', 'utf8')

    expect(seo).toContain('data-mobile-scroll="true" style={{ maxWidth: \'100%\', overflowX: \'auto\' }}')
  })

  it('gives each offer catalog field a row-specific accessible name', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(outreach).toContain(
      'aria-label={`One-liner for ${offer.title || offer.key} (${offer.key || offer._id})`}',
    )
    expect(outreach).toContain(
      'aria-label={`Price band for ${offer.title || offer.key} (${offer.key || offer._id})`}',
    )
  })

  it('labels each unwrapped template funnel-stage selector', () => {
    const source = readFileSync('src/sanity/components/marketing/TemplateWorkspace.tsx', 'utf8')

    expect(source).toContain('ariaLabel={`Funnel stage ${index + 1}`}')
  })

  it('keeps the AI model section at heading level two', () => {
    const source = readFileSync('src/sanity/components/marketing/MarketingAiModelSetting.tsx', 'utf8')

    expect(source).toContain('<h2 style=')
    expect(source).not.toContain('<h3 style=')
  })

  it('keeps the financial-posture Settings section at heading level two', () => {
    const source = readFileSync('src/sanity/components/marketing/MarketingFinancialPostureSetting.tsx', 'utf8')

    expect(source).toContain('<h2 style=')
    expect(source).not.toContain('<h3 style=')
  })

  it('gives the brand voice library explicit names and save feedback', () => {
    const source = readFileSync('src/sanity/components/marketing/MarketingBrandVoiceSetting.tsx', 'utf8')

    expect(source).toContain('<h2 style=')
    expect(source).toContain('aria-label={`Voice name ${index + 1}`}')
    expect(source).toContain('aria-label={`Best used for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('aria-label={`Status for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('aria-label={`Voice guidance for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('aria-label={`Do rules for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('aria-label={`Avoid rules for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('aria-label={`Representative snippets for ${voice.name || `voice ${index + 1}`}`}')
    expect(source).toContain('name="marketing-default-brand-voice"')
    expect(source).toContain('{notice && <div role="status"')
    expect(source).toContain('{error && <div role="alert"')
  })

  it('communicates checklist completion with text as well as color', () => {
    const html = renderToStaticMarkup(
      createElement(GuidanceChecklist, {
        title: 'Publish checks',
        items: [
          { label: 'Public URL added', done: true },
          { label: 'Analytics connected', done: false },
        ],
      }),
    )

    expect(html).toContain('aria-label="Publish checks: 1 of 2 complete"')
    expect(html).toContain('role="list"')
    expect(html).toContain('Done:')
    expect(html).toContain('To do:')
  })
})
