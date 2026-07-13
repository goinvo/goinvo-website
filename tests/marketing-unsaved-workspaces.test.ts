import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('marketing workspace unsaved-change wiring', () => {
  it('marks Research edits dirty and clears the guard after full project saves', () => {
    const source = readFileSync('src/sanity/components/marketing/ResearchWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'research project draft')")
    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'AI-assisted research project draft')")
    expect(source).toContain('await onSave(draft._id, buildResearchProjectSavePayload(draft))\n    clearUnsavedChanges()')
  })

  it('routes Strategy editor changes through the shared guard and clears it after save', () => {
    const source = readFileSync('src/sanity/components/marketing/StrategyWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain('const handleStrategyDraftChange = useCallback')
    expect(source).toContain("markUnsavedChange(MARKETING_UNSAVED_FORM_ID, 'strategy answer draft')")
    expect(source).toContain('onChange={handleStrategyDraftChange}')
    expect(source).toContain('await commitPatch(selected._id, buildStrategyPatch(section.id, draft))\n    clearUnsavedChanges()')
  })
})
