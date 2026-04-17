/**
 * Add Kathy Mikk as a contributor on own-your-health-data.
 * Gatsby has 4 contributors (Eric Benoit, Kathy Mikk, Harry Sleeper, Colleen Tang Poy)
 * but Sanity only has 3 — Kathy Mikk is missing entirely.
 *
 * Usage:
 *   node --env-file=.env.local scripts/add-kathy-mikk.mjs           # dry
 *   node --env-file=.env.local scripts/add-kathy-mikk.mjs --write   # apply
 */
import { createClient } from 'next-sanity'
import 'dotenv/config'

const WRITE = process.argv.includes('--write')
const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: WRITE_TOKEN,
})

const KATHY_ID = 'alumni-kathy-mikk'

const existing = await client.fetch(`*[_id == $id][0]`, { id: KATHY_ID })
console.log('Existing:', existing ? 'yes' : 'no')

if (WRITE) {
  // Create alumni team member (no image, no bio — Gatsby just lists the name)
  if (!existing) {
    await client.createOrReplace({
      _id: KATHY_ID,
      _type: 'teamMember',
      name: 'Kathy Mikk',
      isAlumni: true,
    })
    console.log('Created', KATHY_ID)
  }

  // Add to own-your-health-data contributors after Eric Benoit
  const feature = await client.fetch(
    `*[_type == 'feature' && slug.current == 'own-your-health-data'][0]{ _id, contributors }`,
  )
  if (!feature) {
    console.error('feature not found')
    process.exit(1)
  }
  const alreadyHas = (feature.contributors || []).some((c) => c.author?._ref === KATHY_ID)
  if (alreadyHas) {
    console.log('Kathy already in contributors, skipping')
  } else {
    // Order should be: Eric Benoit, Kathy Mikk, Harry Sleeper, Colleen Tang Poy
    // Current contributors: Colleen, Harry, Eric — reorder + add Kathy
    const newContribs = [
      {
        _key: 'cont-eric',
        _type: 'authorCredit',
        author: { _type: 'reference', _ref: 'team-eric-benoit' },
      },
      {
        _key: 'cont-kathy',
        _type: 'authorCredit',
        author: { _type: 'reference', _ref: KATHY_ID },
      },
      {
        _key: 'cont-harry',
        _type: 'authorCredit',
        author: { _type: 'reference', _ref: 'teamMember-harry-sleeper' },
      },
      {
        _key: 'cont-colleen',
        _type: 'authorCredit',
        author: { _type: 'reference', _ref: 'alumni-colleen-tang-poy' },
      },
    ]
    await client.patch(feature._id).set({ contributors: newContribs }).commit()
    console.log('Updated own-your-health-data contributors')
  }
} else {
  console.log('(Dry run — pass --write to apply)')
}


