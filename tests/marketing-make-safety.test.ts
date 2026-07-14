import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

import { buildCreatePayload, buildLinkFromPost, MarketingValidationError } from '@/lib/marketing'
import { linkInBioItemsQuery } from '@/sanity/lib/queries'
import {
  isCalendarItemPublishReady,
  normalizeDraftContentFrames,
  normalizeFunnelStages,
} from '@/sanity/tools/marketingTool'

const source = (path: string) => readFileSync(path, 'utf8')

describe('marketing Make workflow safety', () => {
  it('preserves image-only calendar frames and nested funnel content references', () => {
    const image = { _type: 'image', asset: { _type: 'reference', _ref: 'image-slide' } }
    const [frame] = normalizeDraftContentFrames([{ _key: 'frame-1', image }])
    expect(frame).toMatchObject({ _key: 'frame-1', _type: 'draftFrame', image })

    const content = [{ _key: 'content-1', _type: 'reference' as const, _ref: 'calendar-item-1' }]
    const [stage] = normalizeFunnelStages([{ _key: 'stage-1', stage: 'action', content }])
    expect(stage.content).toEqual(content)
  })

  it('requires scheduled calendar items to have a publish date and time', () => {
    expect(() =>
      buildCreatePayload('marketingCalendarItem', {
        title: 'Scheduled without a date',
        status: 'scheduled',
      }),
    ).toThrow(MarketingValidationError)

    try {
      buildCreatePayload('marketingCalendarItem', { title: 'Scheduled without a date', status: 'scheduled' })
    } catch (error) {
      expect((error as MarketingValidationError).missing).toContain('publishAt')
    }
  })

  it('treats only published or due scheduled calendar items as link-ready', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T16:00:00.000Z'))
    try {
      expect(isCalendarItemPublishReady({ status: 'published' } as never)).toBe(true)
      expect(isCalendarItemPublishReady({ status: 'scheduled' } as never)).toBe(false)
      expect(isCalendarItemPublishReady({ status: 'scheduled', publishAt: '2026-07-14T15:59:00.000Z' } as never)).toBe(true)
      expect(isCalendarItemPublishReady({ status: 'scheduled', publishAt: '2026-07-14T16:01:00.000Z' } as never)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('builds public Quick Links only from a Published URL and preserves its exact time', () => {
    expect(() =>
      buildLinkFromPost({
        _id: 'calendar-1',
        title: 'Private working draft',
        status: 'published',
        workingUrl: 'https://private.example.test/draft',
      }),
    ).toThrow(/publishedUrl/)

    const link = buildLinkFromPost({
      _id: 'calendar-2',
      title: 'Public post',
      status: 'scheduled',
      publishAt: '2026-07-14T16:45:00.000Z',
      publishedUrl: 'https://www.example.test/public',
    })
    expect(link.url).toBe('https://www.example.test/public')
    expect(link.publishAt).toBe('2026-07-14T16:45:00.000Z')
  })

  it('makes the public query honor the Quick Link record itself', () => {
    expect(linkInBioItemsQuery).toContain('status == "active"')
    expect(linkInBioItemsQuery).toContain('defined(url)')
    expect(linkInBioItemsQuery).not.toContain('calendarItem->status')
    expect(linkInBioItemsQuery).not.toContain('references(^._id)')

    const linksPage = source('src/app/links/page.tsx')
    expect(linksPage).not.toContain('fallbackLinks')
    expect(linksPage).not.toContain('link.url || siteConfig.url')
  })

  it('keeps previews record-keyed, saved-state-only, and stale-response safe', () => {
    const calendar = source('src/sanity/components/marketing/CalendarWorkspace.tsx')
    const preview = source('src/sanity/components/marketing/PublishPreview.tsx')
    expect(calendar).toContain('<PublishPreview key={item._id}')
    expect(preview).toContain('hasUnsavedChanges')
    expect(preview).toContain('requestVersion.current === version')
    expect(preview).toContain('Preview saved post')
    expect(calendar).toContain("!['published', 'canceled'].includes(draft.status || '')")
  })

  it('does not mistake connected accounts for a verified publishing pipeline', () => {
    const statusComponent = source('src/sanity/components/marketing/PublishConnectionStatus.tsx')
    const statusRoute = source('src/app/api/marketing/publish/status/route.ts')
    expect(statusComponent).not.toContain('Ready to auto-publish')
    expect(statusComponent).toContain('authenticatedMarketingRequest')
    expect(statusComponent).toContain('verify the scheduling trigger')
    expect(statusRoute).toContain('assertStudioWriterOrApiKey')
    expect(statusRoute).toContain('queueConfigured')
    expect(statusRoute).toContain('triggerVerificationRequired: true')
  })

  it('blocks reference-bearing deletes before mutation and warns on template conversion', () => {
    for (const path of [
      'src/sanity/components/marketing/CalendarWorkspace.tsx',
      'src/sanity/components/marketing/ChannelWorkspace.tsx',
      'src/sanity/components/marketing/TemplateWorkspace.tsx',
      'src/app/api/marketing/doc/[type]/[id]/route.ts',
    ]) {
      const text = source(path)
      expect(text.indexOf('*[references($id)]')).toBeGreaterThan(-1)
      expect(text.indexOf('*[references($id)]')).toBeLessThan(text.indexOf('client.delete('))
    }
    const documentRoute = source('src/app/api/marketing/doc/[type]/[id]/route.ts')
    expect(documentRoute).not.toContain('channelDeleteCascade(')

    const channel = source('src/sanity/components/marketing/ChannelWorkspace.tsx')
    expect(channel).toContain('disabled={saving || usage.total > 0}')
    expect(channel).toContain('disabled={usage.total > 0}')
    expect(channel).toContain('disabled={usageCount > 0}')
    expect(channel).toContain('locked until those records are reassigned or disconnected')

    const template = source('src/sanity/components/marketing/TemplateWorkspace.tsx')
    expect(template).toContain('Convert and save')
    expect(template).toContain('permanently removes')

    const funnel = source('src/sanity/components/marketing/FunnelWorkspace.tsx')
    expect(funnel).toContain('Add stage to draft')
    expect(funnel).toContain('onChange={(nextStage) => updateStage')
    expect(funnel).toContain('Remove</button>')
  })
})
