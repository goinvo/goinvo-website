import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import calendarSchema, { publishStateOptions } from '@/sanity/schemas/marketingCalendarItem'
import {
  buildCaption,
  buildClaimPatch,
  buildFailedPatch,
  buildMedia,
  buildPublishContent,
  buildPublishedPatch,
  connectionStatus,
  getPublisher,
  instagramPublisher,
  linkedInPublisher,
  resolveSocialPlatform,
  SOCIAL_PLATFORMS,
  type PublishableItem,
} from '@/lib/marketing/publishers'

const baseItem: PublishableItem = {
  _id: 'mcal-1',
  _rev: 'rev-1',
  title: 'A post',
  status: 'scheduled',
  contentType: 'post',
  channelKey: 'instagram',
  channelPlatform: 'social',
  contentDraft: 'Hello world',
  draftHashtags: ['design', '#health'],
  socialImageUrl: 'https://cdn.example.com/a.jpg',
  socialImageAlt: 'A cover',
  frames: [],
}

describe('resolveSocialPlatform', () => {
  it('maps known channel keys to platforms', () => {
    expect(resolveSocialPlatform({ channelKey: 'linkedin' })).toBe('linkedin')
    expect(resolveSocialPlatform({ channelKey: 'Instagram' })).toBe('instagram')
  })

  it('returns null for channels without a native adapter', () => {
    expect(resolveSocialPlatform({ channelKey: 'email' })).toBeNull()
    expect(resolveSocialPlatform({ channelKey: null, channelPlatform: 'social' })).toBeNull()
  })
})

describe('buildCaption', () => {
  it('appends hashtags that are not already in the body', () => {
    const caption = buildCaption(baseItem)
    expect(caption).toBe('Hello world\n\n#design #health')
  })

  it('does not duplicate a hashtag already written into the body', () => {
    const caption = buildCaption({ ...baseItem, contentDraft: 'Loving #design today', draftHashtags: ['design'] })
    expect(caption).toBe('Loving #design today')
  })

  it('returns just the tag line when the body is empty', () => {
    const caption = buildCaption({ ...baseItem, contentDraft: '', draftHashtags: ['design'] })
    expect(caption).toBe('#design')
  })
})

describe('buildMedia', () => {
  it('collects the cover then carousel slides, de-duplicated', () => {
    const media = buildMedia({
      ...baseItem,
      socialImageUrl: 'https://cdn.example.com/a.jpg',
      frames: [
        { imageUrl: 'https://cdn.example.com/b.jpg', altText: 'B' },
        { imageUrl: 'https://cdn.example.com/a.jpg' }, // duplicate cover, dropped
        { imageUrl: '   ' }, // blank, dropped
      ],
    })
    expect(media.map((m) => m.url)).toEqual(['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'])
    expect(media[0].altText).toBe('A cover')
    expect(media[1].altText).toBe('B')
  })
})

describe('buildPublishContent', () => {
  it('prefers publishedUrl, falls back to workingUrl, and passes contentType', () => {
    const withPublished = buildPublishContent({ ...baseItem, publishedUrl: 'https://x.com/p', workingUrl: 'https://x.com/w' })
    expect(withPublished.link).toBe('https://x.com/p')
    expect(withPublished.contentType).toBe('post')

    const withWorking = buildPublishContent({ ...baseItem, publishedUrl: null, workingUrl: 'https://x.com/w' })
    expect(withWorking.link).toBe('https://x.com/w')

    const noLink = buildPublishContent({ ...baseItem, publishedUrl: null, workingUrl: null })
    expect(noLink.link).toBeUndefined()
  })
})

describe('patch builders', () => {
  const now = '2026-06-12T00:00:00.000Z'

  it('claim marks publishing and stamps the lock', () => {
    expect(buildClaimPatch(now)).toEqual({ set: { publishState: 'publishing', publishLockAt: now } })
  })

  it('published patch sets status + ids, maps permalink to publishedUrl, clears error + lock', () => {
    const patch = buildPublishedPatch({ externalId: 'abc', permalink: 'https://insta/p' }, now)
    expect(patch.set).toMatchObject({
      publishState: 'published',
      status: 'published',
      externalPostId: 'abc',
      publishedUrl: 'https://insta/p',
      publishAttemptedAt: now,
    })
    expect(patch.unset).toEqual(['publishError', 'publishLockAt'])
  })

  it('failed patch records a truncated error and clears the lock without touching status', () => {
    const patch = buildFailedPatch('x'.repeat(5000), now)
    expect(patch.set?.publishState).toBe('failed')
    expect((patch.set?.publishError as string).length).toBe(2000)
    expect(patch.set?.status).toBeUndefined()
    expect(patch.unset).toEqual(['publishLockAt'])
  })
})

describe('adapters fail closed when unconfigured', () => {
  const saved: Record<string, string | undefined> = {}
  const vars = [
    'LINKEDIN_ACCESS_TOKEN',
    'LINKEDIN_AUTHOR_URN',
    'INSTAGRAM_ACCESS_TOKEN',
    'INSTAGRAM_BUSINESS_ACCOUNT_ID',
  ]

  beforeEach(() => {
    for (const key of vars) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
  })
  afterEach(() => {
    for (const key of vars) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('reports not connected and lists missing config', () => {
    expect(linkedInPublisher.isConnected()).toBe(false)
    expect(linkedInPublisher.missingConfig()).toEqual(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN'])
    expect(instagramPublisher.isConnected()).toBe(false)
    expect(instagramPublisher.missingConfig()).toEqual([
      'INSTAGRAM_ACCESS_TOKEN',
      'INSTAGRAM_BUSINESS_ACCOUNT_ID',
    ])
  })

  it('publish() returns notConnected without doing network I/O', async () => {
    const li = await linkedInPublisher.publish({ text: 'hi', media: [] })
    expect(li.ok).toBe(false)
    if (!li.ok) expect(li.notConnected).toBe(true)

    const ig = await instagramPublisher.publish({ text: 'hi', media: [{ url: 'https://x/a.jpg', type: 'image' }] })
    expect(ig.ok).toBe(false)
    if (!ig.ok) expect(ig.notConnected).toBe(true)
  })

  it('becomes connected once both env vars are present', () => {
    process.env.LINKEDIN_ACCESS_TOKEN = 'tok'
    process.env.LINKEDIN_AUTHOR_URN = 'urn:li:organization:1'
    expect(linkedInPublisher.isConnected()).toBe(true)
    expect(linkedInPublisher.missingConfig()).toEqual([])
  })

  it('connectionStatus reports every registered platform', () => {
    const status = connectionStatus()
    expect(status.map((s) => s.platform).sort()).toEqual([...SOCIAL_PLATFORMS].sort())
  })
})

describe('registry', () => {
  it('returns the right adapter per platform', () => {
    expect(getPublisher('linkedin')).toBe(linkedInPublisher)
    expect(getPublisher('instagram')).toBe(instagramPublisher)
  })
})

describe('instagram refuses unsupported / empty content', () => {
  beforeEach(() => {
    process.env.INSTAGRAM_ACCESS_TOKEN = 'tok'
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = 'ig-1'
  })
  afterEach(() => {
    delete process.env.INSTAGRAM_ACCESS_TOKEN
    delete process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
  })

  it('rejects reels/video and text-only posts before any network call', async () => {
    const reel = await instagramPublisher.publish({ text: 'hi', media: [{ url: 'https://x/a.jpg', type: 'image' }], contentType: 'reel' })
    expect(reel.ok).toBe(false)
    if (!reel.ok) expect(reel.notConnected).toBeFalsy()

    const textOnly = await instagramPublisher.publish({ text: 'hi', media: [] })
    expect(textOnly.ok).toBe(false)
  })
})

describe('calendar schema publishing fields', () => {
  const fields = (calendarSchema.fields || []) as Array<{ name?: string; group?: string; type?: string }>
  const byName = (name: string) => fields.find((f) => f.name === name)

  it('exposes the auto-publish opt-in and worker-managed state fields', () => {
    expect(byName('autoPublish')?.type).toBe('boolean')
    expect(byName('publishState')?.type).toBe('string')
    expect(byName('externalPostId')?.type).toBe('string')
    expect(byName('publishAttemptedAt')?.type).toBe('datetime')
    expect(byName('publishError')?.type).toBe('text')
    expect(byName('socialImage')?.type).toBe('image')
  })

  it('groups publishing fields under the publishing group', () => {
    expect(byName('autoPublish')?.group).toBe('publishing')
    expect((calendarSchema.groups || []).some((g) => g.name === 'publishing')).toBe(true)
  })

  it('exports publishState options matching the worker lifecycle', () => {
    expect(publishStateOptions.map((o) => o.value)).toEqual([
      'queued',
      'publishing',
      'published',
      'failed',
      'skipped',
    ])
  })
})
