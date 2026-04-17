/**
 * Add Vanessa Li as the FIRST author of Loneliness in Our Human Code.
 * Creates an external- teamMember if it doesn't exist, uploads her headshot,
 * then prepends a reference to the loneliness feature's authors array.
 *
 * Usage:
 *   node --env-file=.env.local scripts/add-vanessa-li.mjs           # dry
 *   node --env-file=.env.local scripts/add-vanessa-li.mjs --write   # apply
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

const VANESSA_ID = 'external-vanessa-li'
const HEADSHOT_URL = 'https://dd17w042cevyt.cloudfront.net/images/features/loneliness-in-our-human-code/headshot-vanessa-li.jpg'

// Check if she already exists
const existing = await client.fetch(`*[_id == $id][0]`, { id: VANESSA_ID })
console.log('Existing:', existing ? 'yes' : 'no')

const bio = [
  {
    _type: 'block',
    _key: 'bio1',
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: 'span1',
        marks: [],
        text: 'Vanessa specializes in health systems and public health modeling, with an emphasis in socio-structural factors of disease. At the time of this paper (2018), she received a Bachelor of Science in Public Policy with double minors in Business Economics and Global Health from the University of Southern California, and later a Master of Public Health from the University of Washington. As of 2020, Vanessa works as an epidemiologist at the MITRE Corporation.',
      },
    ],
  },
]

if (WRITE) {
  // Upload headshot if not exists
  let imageRef = existing?.image?.asset?._ref
  if (!imageRef) {
    console.log('Uploading headshot from', HEADSHOT_URL)
    const resp = await fetch(HEADSHOT_URL)
    if (!resp.ok) {
      console.error('Failed to fetch headshot:', resp.status)
      process.exit(1)
    }
    const buffer = Buffer.from(await resp.arrayBuffer())
    const asset = await client.assets.upload('image', buffer, {
      filename: 'headshot-vanessa-li.jpg',
    })
    imageRef = asset._id
    console.log('Uploaded asset:', imageRef)
  }

  // Create or update team member
  const memberDoc = {
    _id: VANESSA_ID,
    _type: 'teamMember',
    name: 'Vanessa Li',
    role: 'University of Washington',
    bio,
    image: { _type: 'image', asset: { _type: 'reference', _ref: imageRef } },
  }
  await client.createOrReplace(memberDoc)
  console.log('Created/updated', VANESSA_ID)

  // Prepend to loneliness feature authors
  const feature = await client.fetch(
    `*[_type == 'feature' && slug.current == 'loneliness-in-our-human-code'][0]{ _id, authors }`,
  )
  if (!feature) {
    console.error('feature not found')
    process.exit(1)
  }
  // Skip if already in list
  const alreadyHas = (feature.authors || []).some((a) => a._ref === VANESSA_ID)
  if (alreadyHas) {
    console.log('Vanessa already in authors list, skipping')
  } else {
    const newAuthors = [
      { _key: 'vanessa-li', _type: 'reference', _ref: VANESSA_ID },
      ...(feature.authors || []),
    ]
    await client.patch(feature._id).set({ authors: newAuthors }).commit()
    console.log('Added Vanessa as first author of loneliness')
  }
} else {
  console.log('(Dry run — pass --write to apply)')
}


