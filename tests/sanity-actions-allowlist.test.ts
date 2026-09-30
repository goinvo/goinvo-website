import { beforeEach, describe, expect, it, vi } from 'vitest'

// Rule: the public server actions in src/lib/sanity-actions.ts must never run a query or purge a tag the caller
// chose. A server action is a public POST endpoint; refetchQuery runs with the server's read token, so an open query
// string reads the whole dataset once production is private (task_2160, task_1008).

const fetch = vi.fn(async () => ({ ok: true }))
const withConfig = vi.fn(() => ({ fetch }))
const revalidateTag = vi.fn()

vi.mock('@/sanity/lib/client', () => ({ client: { withConfig } }))
vi.mock('@/sanity/env', () => ({ previewToken: 'server-token' }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }))
vi.mock('next/cache', () => ({ revalidateTag }))

const { refetchQuery, revalidateSanityTags } = await import('../src/lib/sanity-actions')
const { caseStudyBySlugQuery, featureBySlugQuery } = await import('../src/sanity/lib/queries')

beforeEach(() => {
  fetch.mockClear()
  withConfig.mockClear()
  revalidateTag.mockClear()
})

describe('refetchQuery allowlist', () => {
  it('runs the two page queries LiveData uses, with only the slug passed on', async () => {
    await refetchQuery(caseStudyBySlugQuery, { slug: 'ipsos-facto' })
    await refetchQuery(featureBySlugQuery, { slug: 'health-visualizations' })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch).toHaveBeenLastCalledWith(featureBySlugQuery, { slug: 'health-visualizations' })
  })

  it.each([
    ['a query the caller wrote', '{"chatThreads": count(*[_type == "chatThread"])}', { slug: 'x' }],
    ['an allowed query plus a trailing projection', `${caseStudyBySlugQuery} {_id}`, { slug: 'x' }],
    ['no slug', caseStudyBySlugQuery, undefined],
    ['a non-string slug', caseStudyBySlugQuery, { slug: ['a', 'b'] }],
    ['a slug that is not a slug', caseStudyBySlugQuery, { slug: '*' }],
    ['an extra parameter', caseStudyBySlugQuery, { slug: 'x', type: 'chatThread' }],
  ])('refuses %s without touching Sanity', async (_label, query, params) => {
    await expect(refetchQuery(query, params as never)).rejects.toThrow('cannot be refetched')
    expect(withConfig).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('revalidateSanityTags', () => {
  it('revalidates real sync tags', async () => {
    await revalidateSanityTags(['s1:KwGL3g', 's1:abc_DEF-9'])
    expect(revalidateTag).toHaveBeenCalledWith('sanity:s1:KwGL3g', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledWith('sanity:s1:abc_DEF-9', { expire: 0 })
  })

  it('ignores anything that is not a sync tag, and purges nothing when none are left', async () => {
    await revalidateSanityTags(['homepage', 'sanity:fetch-sync-tags', 's1:', 's1:a b', 42 as never])
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
