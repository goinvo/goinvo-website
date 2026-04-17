import crypto from 'node:crypto'
import { config as loadEnv } from 'dotenv'
import { createClient } from 'next-sanity'

loadEnv({ path: '.env.local' })

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

if (!projectId || !token) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN/SANITY_API_WRITE_TOKEN')
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2025-01-01',
  useCdn: false,
  token,
})

const STAFFPLAN_IMAGE_URL =
  'https://dd17w042cevyt.cloudfront.net/images/case-studies/staffplan/staffplan_my_staffplan.jpg'

function randomKey() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function blockText(block) {
  if (!block || block._type !== 'block') return ''
  return (block.children || [])
    .map((child) => child.text || '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeSectionTitle(text) {
  return {
    _key: randomKey(),
    _type: 'block',
    style: 'sectionTitle',
    markDefs: [],
    children: [
      {
        _key: randomKey(),
        _type: 'span',
        marks: [],
        text,
      },
    ],
  }
}

function replaceAt(content, matcher, replacementFactory) {
  const index = content.findIndex(matcher)
  if (index === -1) return false
  content.splice(index, 1, replacementFactory(content[index], index))
  return true
}

function removeAt(content, matcher) {
  const index = content.findIndex(matcher)
  if (index === -1) return false
  content.splice(index, 1)
  return true
}

function insertBefore(content, matcher, title) {
  const index = content.findIndex(matcher)
  if (index === -1) return false
  const prev = content[index - 1]
  if (prev?._type === 'block' && prev.style === 'sectionTitle' && blockText(prev) === title) {
    return false
  }
  content.splice(index, 0, makeSectionTitle(title))
  return true
}

async function ensureStaffplanImageBlock() {
  const existing = await client.fetch(
    `*[_type == "sanity.imageAsset" && originalFilename == "staffplan_my_staffplan.jpg"][0]{_id}`
  )

  let assetId = existing?._id
  if (!assetId) {
    const response = await fetch(STAFFPLAN_IMAGE_URL)
    if (!response.ok) {
      throw new Error(`Failed to download StaffPlan image: ${response.status} ${response.statusText}`)
    }
    const asset = await client.assets.upload(
      'image',
      Buffer.from(await response.arrayBuffer()),
      { filename: 'staffplan_my_staffplan.jpg' }
    )
    assetId = asset._id
  }

  return {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: assetId,
    },
    alt: 'My StaffPlan',
  }
}

async function main() {
  const [staffplanImageBlock, refs, docs] = await Promise.all([
    ensureStaffplanImageBlock(),
    client.fetch(
      `*[
        (_type == "caseStudy" && slug.current in ["hgraph"]) ||
        (_type == "feature" && slug.current in ["bathroom-to-healthroom","open-source-healthcare"])
      ]{_id,"slug":slug.current}`
    ),
    client.fetch(
      `*[_type == "caseStudy" && slug.current in ["3m-coderyte","commonhealth-smart-health-cards","fastercures-health-data-basics","insidetracker-nutrition-science","mitre-state-of-us-healthcare","staffplan","wuxi-nextcode-familycode"]]{_id,title,heading,upNext,content,"slug":slug.current}`
    ),
  ])

  const refBySlug = new Map(refs.map((doc) => [doc.slug, doc._id]))
  const desiredInsideTrackerUpNext = [
    refBySlug.get('bathroom-to-healthroom'),
    refBySlug.get('hgraph'),
    refBySlug.get('open-source-healthcare'),
  ].filter(Boolean)

  let patchCount = 0

  for (const doc of docs) {
    const content = [...(doc.content || [])]
    const patch = {}
    let changed = false

    if (doc.slug === 'mitre-state-of-us-healthcare') {
      if (doc.title !== 'Showing & Telling National Healthcare Stories') {
        patch.title = 'Showing & Telling National Healthcare Stories'
        changed = true
      }
      if (doc.heading !== 'What’s the Status of US Healthcare?') {
        patch.heading = 'What’s the Status of US Healthcare?'
        changed = true
      }
      changed =
        insertBefore(
          content,
          (block) => blockText(block) === 'Fast sketching and prototyping',
          'Solution'
        ) || changed
      changed =
        insertBefore(
          content,
          (block) => blockText(block) === 'Open Source Scientific Storytelling',
          'Results'
        ) || changed
    }

    if (doc.slug === 'insidetracker-nutrition-science') {
      changed =
        insertBefore(
          content,
          (block) => blockText(block) === 'Straight-forward information design tops',
          'Solution'
        ) || changed
      changed =
        insertBefore(
          content,
          (block) => blockText(block) === '10 years in the wild',
          'Results'
        ) || changed

      const currentUpNext = (doc.upNext || [])
        .map((ref) => ref?._ref)
        .filter(Boolean)

      if (JSON.stringify(currentUpNext) !== JSON.stringify(desiredInsideTrackerUpNext)) {
        patch.upNext = desiredInsideTrackerUpNext.map((_ref) => ({
          _type: 'reference',
          _ref,
        }))
        changed = true
      }
    }

    if (doc.slug === 'commonhealth-smart-health-cards') {
      changed =
        insertBefore(
          content,
          (block) =>
            block?._type === 'image' &&
            block.caption === 'Walkthrough of SMART Health Cards displayed on the CommonHealth website, courtesy of TCP (4)',
          'Results'
        ) || changed
    }

    if (doc.slug === '3m-coderyte') {
      changed =
        removeAt(
          content,
          (block) =>
            block?._type === 'block' &&
            blockText(block).startsWith('The software worked so well that the backlog of coding was passed and')
        ) || changed
    }

    if (doc.slug === 'fastercures-health-data-basics') {
      if (doc.title !== 'Health Data Basics') {
        patch.title = 'Health Data Basics'
        changed = true
      }
      if (doc.heading !== 'Engaging Patients to Understand Health Data') {
        patch.heading = 'Engaging Patients to Understand Health Data'
        changed = true
      }
    }

    if (doc.slug === 'staffplan') {
      changed =
        replaceAt(
          content,
          (block) =>
            block?._type === 'block' &&
            blockText(block) === '!My StaffPlan' &&
            (block.markDefs || []).some((def) => def.href?.includes('staffplan_my_staffplan.jpg')),
          (block) => ({
            ...staffplanImageBlock,
            _key: block._key || randomKey(),
          })
        ) || changed

      changed =
        replaceAt(
          content,
          (block) => block?._type === 'block' && blockText(block) === 'Try StaffPlan',
          (block) => ({
            _key: block._key || randomKey(),
            _type: 'buttonGroup',
            layout: 'centered',
            buttons: [
              {
                _key: randomKey(),
                external: true,
                label: 'Try StaffPlan',
                url: 'https://staffplan.com/',
                variant: 'secondary',
              },
            ],
          })
        ) || changed
    }

    if (doc.slug === 'wuxi-nextcode-familycode') {
      changed =
        insertBefore(
          content,
          (block) => blockText(block) === 'Design changes business through research, validation, and evidence',
          'Results'
        ) || changed
    }

    if (!changed) continue

    patch.content = content
    await client.patch(doc._id).set(patch).commit()
    patchCount += 1
    console.log(`Patched ${doc.slug}: ${doc._id}`)
  }

  if (patchCount === 0) {
    console.log('No requested work-content fixes were needed.')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
