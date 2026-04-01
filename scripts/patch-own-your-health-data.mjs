#!/usr/bin/env node
/**
 * Patch own-your-health-data: add missing authors (Annie Lakey Becker, Kim Nipp).
 *
 * The Gatsby source lists 4 authors: Annie Lakey Becker, Kim Nipp, Megan Hirsch,
 * Juhan Sonin. Sanity only has Megan and Juhan. This script:
 * 1. Uploads headshot images for Annie and Kim from CloudFront
 * 2. Creates teamMember documents for both
 * 3. Adds them as authors on the feature document (before existing authors)
 *
 * Usage:
 *   node scripts/patch-own-your-health-data.mjs          # dry-run
 *   node scripts/patch-own-your-health-data.mjs --write   # apply
 */

import { createClient } from '@sanity/client'
import dotenv from 'dotenv'
import { randomBytes } from 'crypto'
import https from 'https'
import { Readable } from 'stream'

dotenv.config({ path: '.env.local' })

const write = process.argv.includes('--write')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

function key() {
  return randomBytes(6).toString('hex')
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

const AUTHORS_TO_ADD = [
  {
    _id: 'alumni-annie-becker',
    name: 'Annie Lakey Becker',
    role: 'Product Manager',
    imageUrl: 'https://dd17w042cevyt.cloudfront.net/images/about/headshot-annie-becker.jpg',
    bio: 'Annie is a Mom, Product and Project Manager based in Seattle. Passionate about Public Health and systems, her background includes roles as an academic research scientist and patient-focused neurodiagnostic technologist. She has a BS in Public Health from the University of Washington and is completing a Masters in Public Health at UNC Chapel Hill.',
  },
  {
    _id: 'alumni-kim-nipp',
    name: 'Kim Nipp',
    role: 'Designer',
    imageUrl: 'https://dd17w042cevyt.cloudfront.net/images/about/headshot-kim-nipp.jpg',
    bio: 'Kim is a designer, illustrator, and animator specializing in scientific visualization. Originally trained in behavioural neuroscience at the University of British Columbia, Kim moved on to complete their Masters of Science in Biomedical Communications, an interdisciplinary graduate program for visual media design in science and medicine offered through the Faculty of Medicine at the University of Toronto.',
  },
]

async function main() {
  // 1. Query the feature document
  const doc = await client.fetch(
    `*[_type == 'feature' && slug.current == 'own-your-health-data'][0]{_id, authors}`
  )
  if (!doc) {
    console.error('Feature document not found!')
    process.exit(1)
  }

  console.log(`Feature document: ${doc._id}`)
  console.log(`Current authors: ${doc.authors?.length || 0}`)
  if (doc.authors) {
    doc.authors.forEach((a) => console.log(`  - ${a._ref}`))
  }

  // 2. Check if teamMember documents already exist
  for (const author of AUTHORS_TO_ADD) {
    const existing = await client.fetch(`*[_id == $id][0]{_id, name}`, { id: author._id })
    if (existing) {
      console.log(`\nTeamMember ${author._id} already exists: ${existing.name}`)
      author.exists = true
    } else {
      console.log(`\nTeamMember ${author._id} does not exist — will create`)
      author.exists = false
    }
  }

  // 3. Check if already referenced as authors
  const existingRefs = (doc.authors || []).map((a) => a._ref)
  const toAddRefs = AUTHORS_TO_ADD.filter((a) => !existingRefs.includes(a._id))
  console.log(`\nAuthors to add as references: ${toAddRefs.length}`)
  toAddRefs.forEach((a) => console.log(`  + ${a._id} (${a.name})`))

  if (!write) {
    console.log('\n--- Proposed changes ---')
    for (const author of AUTHORS_TO_ADD) {
      if (!author.exists) {
        console.log(`\nCREATE teamMember: ${author._id}`)
        console.log(`  name: ${author.name}`)
        console.log(`  role: ${author.role}`)
        console.log(`  bio: ${author.bio.substring(0, 100)}...`)
        console.log(`  image: ${author.imageUrl}`)
      }
    }
    if (toAddRefs.length > 0) {
      console.log(`\nPATCH feature authors: insert ${toAddRefs.map((a) => a._id).join(', ')} before existing`)
    }
    console.log('\n[DRY RUN] Use --write to apply changes.')
    return
  }

  // 4. Upload images and create teamMember documents
  for (const author of AUTHORS_TO_ADD) {
    if (author.exists) continue

    console.log(`\nUploading image for ${author.name}...`)
    const imageBuffer = await fetchBuffer(author.imageUrl)
    const filename = author.imageUrl.split('/').pop()
    const asset = await client.assets.upload('image', imageBuffer, {
      filename,
      contentType: 'image/jpeg',
    })
    console.log(`  Uploaded: ${asset._id}`)

    const teamDoc = {
      _id: author._id,
      _type: 'teamMember',
      name: author.name,
      role: author.role,
      bio: [
        {
          _key: key(),
          _type: 'block',
          children: [
            {
              _key: key(),
              _type: 'span',
              marks: [],
              text: author.bio,
            },
          ],
          markDefs: [],
          style: 'normal',
        },
      ],
      image: {
        _type: 'image',
        asset: {
          _ref: asset._id,
          _type: 'reference',
        },
      },
    }

    await client.createOrReplace(teamDoc)
    console.log(`  Created teamMember: ${author._id}`)
  }

  // 5. Add authors to feature document (insert before existing)
  if (toAddRefs.length > 0) {
    const newAuthorRefs = toAddRefs.map((a) => ({
      _key: key(),
      _ref: a._id,
      _type: 'reference',
    }))

    // Build new authors array: new authors first, then existing
    const existingAuthors = doc.authors || []
    const allAuthors = [...newAuthorRefs, ...existingAuthors]

    await client.patch(doc._id).set({ authors: allAuthors }).commit()
    console.log(`\nPatched authors: ${allAuthors.length} total`)
  }

  console.log('\n[DONE] Patched own-your-health-data with missing authors.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
