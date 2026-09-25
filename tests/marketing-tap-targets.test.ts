import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('marketing minimum tap targets', () => {
  it('keeps guide step-completion controls at least 24 by 24 pixels', () => {
    const source = readFileSync('src/sanity/tools/gettingStarted.tsx', 'utf8')
    const stepCheck = source.match(/stepCheck:\s*\{([\s\S]*?)\n\s*\},/)

    expect(stepCheck, 'Expected the guide stepCheck style').not.toBeNull()
    const width = Number(stepCheck?.[1].match(/\bwidth:\s*(\d+)/)?.[1])
    const height = Number(stepCheck?.[1].match(/\bheight:\s*(\d+)/)?.[1])
    expect(width, 'Expected a numeric guide stepCheck width').toBeGreaterThanOrEqual(24)
    expect(height, 'Expected a numeric guide stepCheck height').toBeGreaterThanOrEqual(24)
  })

  it('keeps each Work Evidence project disclosure at least 24 pixels high', () => {
    const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')
    const expander = source.match(
      /<button\s+type="button"\s+aria-expanded=\{expandedId === doc\._id\}([\s\S]*?)<\/button>/,
    )

    expect(expander, 'Expected the Work Evidence project disclosure button').not.toBeNull()
    expect(expander?.[1]).toContain('minWidth: 24')
    expect(expander?.[1]).toContain('minHeight: 24')
  })

  it('enlarges the Link Tree Featured checkbox and its wrapping label to 24 pixels', () => {
    const source = readFileSync('src/sanity/components/marketing/LinkTreeWorkspace.tsx', 'utf8')
    const featuredControl = source.match(
      /<label style=\{\{([^}]*)\}\}>\s*<input\s+type="checkbox"\s+style=\{\{([^}]*)\}\}/,
    )

    expect(featuredControl, 'Expected the Link Tree Featured checkbox label').not.toBeNull()
    expect(featuredControl?.[1]).toContain('minHeight: 24')
    expect(featuredControl?.[2]).toContain('width: 24')
    expect(featuredControl?.[2]).toContain('height: 24')
  })

  it('enlarges every Research method checkbox on compact screens', () => {
    const source = readFileSync('src/sanity/components/marketing/ResearchWorkspace.tsx', 'utf8').replace(/\r\n/g, '\n')

    expect(source).toContain('type="checkbox"\n                data-mobile-tap-target="true"')
  })

  it('keeps the log form’s outcome chips and the call outline’s Copy buttons easy to hit', () => {
    const outreach = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')
    const chip = outreach.match(/onClick=\{\(\) => chooseLogOutcome\(contact, outcome\.key\)\}\s*style=\{\{([\s\S]*?)\}\}\s*>/)
    expect(chip, 'Expected the outcome chip button').not.toBeNull()
    expect(Number(chip?.[1].match(/minHeight:\s*(\d+)/)?.[1])).toBeGreaterThanOrEqual(24)

    const panel = readFileSync('src/sanity/components/marketing/CallOutlinePanel.tsx', 'utf8')
    const copy = panel.match(/const copyButton = \{([^}]*)\}/)
    expect(copy, 'Expected the outline Copy button style').not.toBeNull()
    expect(Number(copy?.[1].match(/minHeight:\s*(\d+)/)?.[1])).toBeGreaterThanOrEqual(24)
  })

  it('keeps the Add Contacts row actions easy to hit', () => {
    const source = readFileSync('src/sanity/components/marketing/ContactIntakeGrid.tsx', 'utf8')
    const removeButton = source.match(
      /aria-label=\{`Remove \$\{row\.name\} from Add Contacts`\}([\s\S]*?)style=\{\{ \.\.\.controlStyle, minHeight: 40/,
    )

    expect(removeButton, 'Expected the Add Contacts row remove button').not.toBeNull()
  })
})
