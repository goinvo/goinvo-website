import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@sanity/client'

const write = process.argv.includes('--write')
const gatsbyDir = 'C:/Users/quest/Programming/GoInvo/goinvo.com/src/case-studies'

dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.NEXT_PUBLIC_SANITY_DATASET) {
  throw new Error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET in .env.local')
}

if (write && !process.env.SANITY_WRITE_TOKEN) {
  throw new Error('Missing SANITY_WRITE_TOKEN in .env.local')
}

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: write ? process.env.SANITY_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN,
  useCdn: false,
})

const caseStudyQuery = `*[_type == "caseStudy" && slug.current == $slug][0]{
  _id,
  slug,
  displayTags,
  metadataLayout
}`

function extractDisplayedTags(source) {
  const match = source.match(/<span class="text--uppercase text--gray text--bold text--spacing text--md">Tags:<\/span>\s*([^\n<]+)/i)
  return match ? match[1].trim() : ''
}

function extractMetadataLayout(source) {
  const timeIndex = source.indexOf('>Time:</span>')
  const tagsIndex = source.indexOf('>Tags:</span>')
  if (timeIndex < 0 || tagsIndex < 0 || tagsIndex <= timeIndex) return 'stacked'
  const between = source.slice(timeIndex, tagsIndex).replace(/^.*>Time:<\/span>/s, '')
  return /\n\s*\n/.test(between) ? 'stacked' : 'inline'
}

const files = fs.readdirSync(gatsbyDir).filter((file) => file.endsWith('.mdx')).sort()
if (files.length === 0) {
  throw new Error('Checked 0 case studies')
}

let checked = 0
let changed = 0

for (const file of files) {
  const slug = file.replace(/\.mdx$/, '')
  const source = fs.readFileSync(path.join(gatsbyDir, file), 'utf8')
  const displayTags = extractDisplayedTags(source)
  const metadataLayout = extractMetadataLayout(source)
  const doc = await client.fetch(caseStudyQuery, { slug })

  if (!doc?._id) {
    console.warn(`Missing caseStudy for slug ${slug}`)
    continue
  }

  checked++
  const current = doc.displayTags || ''
  const currentLayout = doc.metadataLayout || 'stacked'
  const changedForDoc = current !== displayTags || currentLayout !== metadataLayout
  if (changedForDoc) {
    changed++
  }

  console.log(
    `${write ? 'WRITE' : 'PLAN '} ${slug}: tags "${current || '(none)'}" -> "${displayTags || '(none)'}", layout "${currentLayout}" -> "${metadataLayout}"`,
  )

  if (!write || !changedForDoc) continue

  const patch = client.patch(doc._id)
  if (displayTags) {
    await patch.set({ displayTags, metadataLayout }).commit()
  } else {
    await patch.set({ metadataLayout }).unset(['displayTags']).commit()
  }
}

if (checked === 0) {
  throw new Error('Checked 0 case studies')
}

console.log(`Checked ${checked} case studies`)
console.log(`${write ? 'Updated' : 'Would update'} ${changed} case studies`)
