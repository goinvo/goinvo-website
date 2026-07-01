/**
 * Upload a local file to Sanity as a file asset and print its public CDN URL.
 *
 * One-off hosting helper: gives a large media file (e.g. a video) a stable,
 * CDN-served https://cdn.sanity.io/files/... URL without creating a document —
 * the same re-hosting pattern the Rendomat ingest route uses for Reels.
 *
 *   node scripts/upload-video-asset.mjs "C:/path/to/video.mp4" [--title "Label"]
 *
 * Env (from .env.local): NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 * and a write token (SANITY_API_WRITE_TOKEN or SANITY_WRITE_TOKEN).
 */
import { createClient } from '@sanity/client'
import { createReadStream, statSync } from 'fs'
import { basename, extname } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const filePath = process.argv[2]
const titleFlagIdx = process.argv.indexOf('--title')
const title = titleFlagIdx > -1 ? process.argv[titleFlagIdx + 1] : undefined

if (!filePath || filePath.startsWith('--')) {
  console.error('usage: node scripts/upload-video-asset.mjs <file> [--title "Label"]')
  process.exit(1)
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_WRITE_TOKEN

if (!projectId) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID in .env.local')
  process.exit(1)
}
if (!token) {
  console.error('Missing write token (SANITY_API_WRITE_TOKEN or SANITY_WRITE_TOKEN) in .env.local')
  process.exit(1)
}

let size
try {
  size = statSync(filePath).size
} catch {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

const ext = extname(filePath).toLowerCase()
const contentType =
  ext === '.mp4' ? 'video/mp4' : ext === '.mov' ? 'video/quicktime' : ext === '.webm' ? 'video/webm' : 'application/octet-stream'

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

console.log(`Uploading ${basename(filePath)} (${(size / 1048576).toFixed(1)} MB) to Sanity ${projectId}/${dataset} ...`)
console.time('upload')

try {
  const asset = await client.assets.upload('file', createReadStream(filePath), {
    filename: basename(filePath),
    contentType,
    ...(title ? { title } : {}),
  })
  console.timeEnd('upload')
  console.log('\n=== UPLOAD COMPLETE ===')
  console.log('assetId         :', asset._id)
  console.log('originalFilename:', asset.originalFilename)
  console.log('size            :', asset.size, 'bytes')
  console.log('mimeType        :', asset.mimeType)
  console.log('PUBLIC URL      :', asset.url)
} catch (err) {
  console.timeEnd('upload')
  console.error('\nUPLOAD FAILED:', err?.message || err)
  process.exit(1)
}
