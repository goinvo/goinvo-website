import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('marketing workspace unsaved-change wiring', () => {
  it('marks Research edits dirty and clears the guard after full project saves', () => {
    const source = readFileSync('src/sanity/components/marketing/ResearchWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'research project draft')")
    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'AI-assisted research project draft')")
    expect(source).toContain('await onSave(draft._id, buildResearchProjectSavePayload(draft))\n    clearUnsavedChanges()')
    expect(source).toContain("Opening another research project will discard the unsaved edits in this project. Continue?")
    expect(source).toContain('confirmDiscardUnsavedChange(MARKETING_UNSAVED_FORM_ID, message)')
    expect(source).toContain('onClick={() => selectProject(project._id)}')
  })

  it('routes Strategy editor changes through the shared guard and clears it after save', () => {
    const source = readFileSync('src/sanity/components/marketing/StrategyWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain('const handleStrategyDraftChange = useCallback')
    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'strategy answer draft')")
    expect(source).toContain('onChange={handleStrategyDraftChange}')
    expect(source).toContain('await commitPatch(selected._id, buildStrategyPatch(section.id, draft))\n    clearUnsavedChanges(MARKETING_UNSAVED_FORM_ID)')
    expect(source).toContain('confirmDiscardUnsavedChange(MARKETING_UNSAVED_FORM_ID, message)')
    expect(source).toContain('onClick={() => selectStrategySection(candidate.id)}')
    expect(source).toContain('onClick={() => selectStrategyAnswer(item._id)}')
    expect(source).toContain("selectWorkspaceMode('campaigns')")
    expect(source).toContain('saveStrategyWorkingDraft(section.id, selected._id, nextDraft, selected._updatedAt)')
    expect(source).not.toContain('<CampaignWorkspace')
    expect(source).not.toContain('<FunnelWorkspace')
    expect(source).toContain('Open Campaigns in Make')
    expect(source).toContain('Open Funnels in Make')
    expect(source).toContain("{workspaceMode === 'foundation' && <div")
  })

  it('guards each Outreach draft and clears only the form that was saved or cancelled', () => {
    const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain("markUnsavedChange(OUTREACH_INTAKE_UNSAVED_ID, 'contact intake draft')")
    expect(source).toContain('clearUnsavedChanges(OUTREACH_INTAKE_UNSAVED_ID)')
    expect(source).toContain('unsavedId={OUTREACH_LOG_UNSAVED_ID}')
    expect(source).toContain('clearUnsavedChanges(OUTREACH_LOG_UNSAVED_ID)')
    expect(source).toContain('unsavedId={OUTREACH_BRIEF_UNSAVED_ID}')
    expect(source).toContain('clearUnsavedChanges(OUTREACH_BRIEF_UNSAVED_ID)')
    const briefSave = source.slice(source.indexOf('const saveBriefEdit'), source.indexOf('const saveLog'))
    expect(briefSave).toContain("const unset = ['researchReviewedAt']")
    expect(briefSave).toContain('if (contact._rev) patch = patch.ifRevisionId(contact._rev)')
    expect(source).toContain('unsavedId={OUTREACH_CONTACT_UNSAVED_ID}')
    expect(source).toContain('clearUnsavedChanges(OUTREACH_CONTACT_UNSAVED_ID)')
    expect(source).toContain('unsavedId={OUTREACH_EVIDENCE_UNSAVED_ID}')
    expect(source).toContain('clearUnsavedChanges(OUTREACH_EVIDENCE_UNSAVED_ID)')
  })

  it('guards brand voice edits until they are saved, discarded, or reloaded', () => {
    const source = readFileSync('src/sanity/components/marketing/MarketingBrandVoiceSetting.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain("export const MARKETING_BRAND_VOICE_UNSAVED_ID = 'marketing-brand-voice-settings'")
    expect(source).toContain("markUnsavedChange(MARKETING_BRAND_VOICE_UNSAVED_ID, 'brand voice library')")
    expect(source).toContain('ifRevisionId(revision)')
    expect(source.match(/clearUnsavedChanges\(MARKETING_BRAND_VOICE_UNSAVED_ID\)/g)?.length).toBeGreaterThanOrEqual(3)
    expect(source).toContain('disabled={!dirty || saving || loading}')
    expect(source).toContain('Discard edits')
    expect(source).toContain('Reload saved voices')
  })
})
