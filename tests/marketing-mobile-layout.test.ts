import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('compact marketing workspace layout containment', () => {
  const gridCases = [
    {
      file: 'ResearchWorkspace.tsx',
      template: 'minmax(240px, 320px) minmax(0, 1fr)',
      label: 'research project master/detail grid',
    },
    {
      file: 'ResearchWorkspace.tsx',
      template: 'minmax(220px, 1fr) minmax(150px, 0.4fr) auto',
      label: 'research question editor row',
    },
    {
      file: 'StrategyWorkspace.tsx',
      template: 'minmax(180px, auto) minmax(0, 1fr)',
      label: 'strategy readiness grid',
    },
    {
      file: 'StrategyWorkspace.tsx',
      template: 'minmax(220px, 0.7fr) minmax(0, 1.5fr)',
      label: 'strategy section master/detail grid',
    },
    {
      file: 'StrategyWorkspace.tsx',
      template: 'minmax(220px, 0.8fr) minmax(0, 1.2fr)',
      label: 'strategy answer/editor grid',
    },
    {
      file: 'AnalyticsWorkspace.tsx',
      template: 'minmax(220px, 1fr) minmax(260px, 1.3fr) 220px',
      label: 'analytics connection row',
    },
  ]

  it.each(gridCases)('stacks the $label below the marketing mobile breakpoint', ({ file, template }) => {
    const source = readFileSync(`src/sanity/components/marketing/${file}`, 'utf8')
    const templateIndex = source.indexOf(`gridTemplateColumns: '${template}'`)

    expect(templateIndex, `Expected to find ${template} in ${file}`).toBeGreaterThan(-1)
    const openingTagStart = source.lastIndexOf('<div', templateIndex)
    const openingTagEnd = source.indexOf('>', templateIndex)
    const openingTag = source.slice(openingTagStart, openingTagEnd + 1)

    expect(openingTag).toContain('data-mobile-stack="true"')
  })

  it('stacks the analytics shell before the client compact-layout hook settles', () => {
    const source = readFileSync('src/sanity/components/marketing/AnalyticsWorkspace.tsx', 'utf8')

    expect(source).toContain('<div data-mobile-stack="true" style={workspaceGridStyle}>')
  })

  it('keeps the calendar month actions horizontally reachable without widening the workspace', () => {
    const source = readFileSync('src/sanity/components/marketing/CalendarWorkspace.tsx', 'utf8')

    expect(source).toContain('<div data-mobile-scroll="true" style={{ display: \'flex\', gap: 8 }}>')
  })

  it('enforces the project minimum tap size for compact calendar controls', () => {
    const calendar = readFileSync('src/sanity/components/marketing/CalendarWorkspace.tsx', 'utf8')
    const marketingTool = readFileSync('src/sanity/tools/marketingTool.tsx', 'utf8')

    expect(calendar.match(/data-mobile-tap-target="true"/g)).toHaveLength(2)
    expect(marketingTool).toContain('[data-marketing-tool] [data-mobile-tap-target="true"]')
    expect(marketingTool).toContain('min-width: 24px !important;')
    expect(marketingTool).toContain('min-height: 24px !important;')
  })

  it('uses responsive tracker, contact, and evidence cards instead of mobile spreadsheets', () => {
    const source = readFileSync('src/sanity/components/marketing/OutreachWorkspace.tsx', 'utf8')

    expect(source.match(/<div data-outreach-desktop-table="true"/g)).toHaveLength(3)
    expect(source.match(/<div data-outreach-mobile-list="true"/g)).toHaveLength(3)
    expect(source).toContain('[data-outreach-desktop-table="true"] { display: none !important; }')
    expect(source).toContain('[data-outreach-mobile-list="true"] { display: grid !important; }')
    expect(source).toContain('Outreach progress tracker')
    expect(source).toContain('Recommended next')
    expect(source).toContain('Search name, organization, owner, or email')
    expect(source).toContain('Search project, client, technique, or outcome')
  })
})
