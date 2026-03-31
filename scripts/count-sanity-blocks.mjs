import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_READ_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const slugs = [
  'oral-history-goinvo',
  'bathroom-to-healthroom',
  'loneliness-in-our-human-code',
  'care-plans',
  'healing-us-healthcare',
  'digital-healthcare',
  'healthcare-ai',
  'healthcare-dollars',
]

async function main() {
  for (const slug of slugs) {
    const f = await client.fetch(
      `*[_type == "feature" && slug.current == $slug][0]{
        title,
        "blocks": count(content),
        "imageBlocks": count(content[_type == "image"]),
        "hasAuthors": defined(authors) && count(authors) > 0
      }`,
      { slug }
    )
    if (f) {
      console.log(`${slug}: ${f.blocks} blocks, ${f.imageBlocks} images, authors=${f.hasAuthors}`)
    } else {
      console.log(`${slug}: NOT FOUND IN SANITY`)
    }
  }
}

main().catch(console.error)
