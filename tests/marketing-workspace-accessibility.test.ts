import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { saveMarketingAiModelChange } from '@/sanity/components/marketing/MarketingAiModelSetting'
import { requestMarketingAssist } from '@/sanity/components/marketing/marketingAssistRequest'
import { Select } from '@/sanity/tools/marketingTool'

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

    expect(seo).toContain('aria-label="Page audit URL"')
    expect(seo).toContain('aria-label="Citation check URL"')
    expect(outreach).toContain('aria-label="Contacts to add"')
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
})
