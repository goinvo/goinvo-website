import dotenv from 'dotenv'
import { createClient } from '@sanity/client'
import { featureSectionBackgroundFallbacks } from '../src/lib/featureSectionBackgroundFallbacks'

const write = process.argv.includes('--write')
const force = process.argv.includes('--force')
const slugFlagIndex = process.argv.indexOf('--slug')
const requestedSlug = slugFlagIndex >= 0 ? process.argv[slugFlagIndex + 1] : null

dotenv.config({ path: '.env.local' })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
const readToken = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_WRITE_TOKEN
const writeToken = process.env.SANITY_WRITE_TOKEN

if (!projectId || !dataset) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET in .env.local')
}

if (write && !writeToken) {
  throw new Error('Missing SANITY_WRITE_TOKEN in .env.local')
}

const fallbackEntries = Object.entries(featureSectionBackgroundFallbacks)
  .filter(([slug]) => !requestedSlug || slug === requestedSlug)

if (fallbackEntries.length === 0) {
  throw new Error(requestedSlug
    ? `No background fallback configured for slug "${requestedSlug}"`
    : 'Checked 0 feature background fallbacks')
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token: write ? writeToken : readToken,
  useCdn: false,
})

interface SanityContentBlock {
  _key?: string
  _type?: string
  background?: string
  [key: string]: unknown
}

interface FeatureBackgroundDoc {
  _id: string
  slug: string
  authorBackground?: string | null
  newsletterBackground?: string | null
  content?: SanityContentBlock[]
}

async function main() {
  const docs = await client.fetch<FeatureBackgroundDoc[]>(
    `*[_type == "feature" && slug.current in $slugs]{
      _id,
      "slug": slug.current,
      authorBackground,
      newsletterBackground,
      content
    }`,
    { slugs: fallbackEntries.map(([slug]) => slug) }
  )

  if (docs.length === 0) {
    throw new Error('Checked 0 feature documents')
  }

  const docsBySlug = new Map(docs.map((doc) => [doc.slug, doc]))

  let checked = 0
  let changed = 0

  for (const [slug, fallback] of fallbackEntries) {
    const doc = docsBySlug.get(slug)

    if (!doc?._id) {
      console.warn(`Missing feature for slug ${slug}`)
      continue
    }

    checked++

    const setFields: Record<string, string> = {}
    const changeNotes: string[] = []

    if (force || !doc.authorBackground) {
      if (doc.authorBackground !== fallback.authorBackground) {
        setFields.authorBackground = fallback.authorBackground
        changeNotes.push(
          `author ${doc.authorBackground || '(unset)'} -> ${fallback.authorBackground}`
        )
      }
    }

    if (force || !doc.newsletterBackground) {
      if (doc.newsletterBackground !== fallback.newsletterBackground) {
        setFields.newsletterBackground = fallback.newsletterBackground
        changeNotes.push(
          `newsletter ${doc.newsletterBackground || '(unset)'} -> ${fallback.newsletterBackground}`
        )
      }
    }

    let nextContent = doc.content
    if (fallback.referencesBackground && doc.content?.length) {
      let referencesUpdated = 0
      nextContent = doc.content.map((block) => {
        if (block._type !== 'references') {
          return block
        }

        if (!force && block.background) {
          return block
        }

        if (block.background === fallback.referencesBackground) {
          return block
        }

        referencesUpdated++
        return { ...block, background: fallback.referencesBackground }
      })

      if (referencesUpdated > 0) {
        changeNotes.push(`references background -> ${fallback.referencesBackground} (${referencesUpdated} block${referencesUpdated === 1 ? '' : 's'})`)
      }
    }

    if (fallback.forceNewsletterBand) {
      changeNotes.push('note: full-bleed white newsletter band still relies on runtime fallback')
    }

    const hasPatchableChanges =
      Object.keys(setFields).length > 0 ||
      JSON.stringify(nextContent) !== JSON.stringify(doc.content)

    console.log(
      `${write ? 'WRITE' : 'PLAN '} ${slug}: ${changeNotes.length > 0 ? changeNotes.join('; ') : 'no changes'}`
    )

    if (!hasPatchableChanges) {
      continue
    }

    changed++

    if (!write) {
      continue
    }

    let patch = client.patch(doc._id)

    if (Object.keys(setFields).length > 0) {
      patch = patch.set(setFields)
    }

    if (JSON.stringify(nextContent) !== JSON.stringify(doc.content)) {
      patch = patch.set({ content: nextContent })
    }

    await patch.commit()
  }

  if (checked === 0) {
    throw new Error('Checked 0 feature documents')
  }

  console.log(`Checked ${checked} feature documents`)
  console.log(`${write ? 'Updated' : 'Would update'} ${changed} feature documents`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
