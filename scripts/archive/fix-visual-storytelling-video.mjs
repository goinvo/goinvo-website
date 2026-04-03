import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env.local') })

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const DOC_ID = 'tl9t9UEN5oC6RJHCTXXqqM'
const IMAGE_KEY = '7mpc2ha27u3'

async function run() {
  // Step 1: Fix caption on the genai-trauma-room-characters-3.jpg image block
  // This image currently has caption "4. Animation created..." but should be "3. Final image post-processing..."
  const captionPath = `content[_key=="${IMAGE_KEY}"].caption`
  const newCaption = '3. Final image post-processing completed in Photoshop with additional characters added in Procreate.'

  console.log('Step 1: Fixing caption on characters image...')
  await client.patch(DOC_ID)
    .set({ [captionPath]: newCaption })
    .commit()
  console.log('Caption updated.')

  // Step 2: Insert a videoEmbed block after the characters image
  console.log('Step 2: Inserting videoEmbed block after characters image...')
  const videoBlock = {
    _type: 'videoEmbed',
    _key: 'genaiVideoTraumaAnimation',
    url: 'https://dd17w042cevyt.cloudfront.net/videos/features/visual-storytelling-with-genai/genai-trauma-room-characters-animation.mp4',
    caption: '4. Animation created with Midjourney Video using the final post-processed image as the starting frame.',
  }

  await client.patch(DOC_ID)
    .insert('after', `content[_key=="${IMAGE_KEY}"]`, [videoBlock])
    .commit()
  console.log('VideoEmbed block inserted.')

  // Verify
  const doc = await client.fetch(
    `*[_id == $id][0]{content[]{_type, _key, caption, url}}`,
    { id: DOC_ID }
  )
  const area = doc.content.filter(b =>
    b._key === IMAGE_KEY ||
    b._key === 'genaiVideoTraumaAnimation' ||
    b._key === 'cw3neqqpkav'
  )
  console.log('\nVerification - blocks around the fix:')
  area.forEach(b => console.log(' ', b._type, '|', b._key, '|', b.caption || b.url || ''))
}

run().catch(e => { console.error('Error:', e.message); process.exit(1) })
