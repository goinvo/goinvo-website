#!/usr/bin/env tsx
/**
 * Turn the call sheet into tasks somebody can actually do.
 *
 * The plan had "Start the weekly cadence: Mon review batch, Tue–Thu 3–5 calls,
 * Fri log + follow-ups" and "Wave 1: call the top-ranked ten warm contacts".
 * Neither is a task. The first is a description of a routine — there is no
 * moment at which you have "started a cadence" — and the second does not say
 * which ten, so doing it begins with a research problem.
 *
 * Meanwhile the call sheet knows exactly which organisations, which people,
 * what changed there, and the opening it justifies. So the concrete task is one
 * organisation: "Call Mass General Brigham — AIwithCare spinout", with the
 * people and the opener attached.
 *
 * Only VERIFIED research produces a task. An unverified signal on somebody's
 * to-do list is one they will read out on a call.
 *
 *   npx tsx scripts/generate-call-tasks.ts               # dry run
 *   npx tsx scripts/generate-call-tasks.ts --apply
 *   npx tsx scripts/generate-call-tasks.ts --apply --retire-vague
 */
import path from 'node:path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'
import { buildOutreachCallSheet, firstNameFor } from '@/lib/marketing/callSheet'
import { MARKETING_OPERATION_TYPE } from '@/lib/marketing/operations'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const retireVague = args.includes('--retire-vague')

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset:
    process.env.NEXT_PUBLIC_MARKETING_INTERNAL_DATASET || process.env.SANITY_OUTREACH_DATASET || 'outreach',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

/**
 * Umbrella items that describe a routine rather than name a piece of work.
 * Matched on sourceKey so a re-worded title cannot quietly resurrect them.
 */
const VAGUE_SOURCE_KEYS = ['exec-plan-2026q4/phase1/weekly-cadence']

/** End of the current week — a call task with no date sorts behind everything. */
function endOfWeekIso(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7))
  date.setUTCHours(17, 0, 0, 0)
  return date.toISOString()
}

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

async function main() {
  const [research, contacts, offers, vague] = await Promise.all([
    client.fetch(
      '*[_type == "marketingOrgResearch" && verification.status == "verified"]{organization, recentSignal, reachableAbout, suggestedOfferKey, context, verification}',
    ),
    client.fetch(
      '*[_type == "marketingContact" && defined(organization)]{_id, name, role, organization, email, status}',
    ),
    client.fetch('*[_type == "marketingOffer" && status == "active"]{key, title, oneLiner}'),
    client.fetch<{ _id: string; title: string; sourceKey?: string }[]>(
      `*[_type == "${MARKETING_OPERATION_TYPE}" && sourceKey in $keys && status != "dismissed"]{_id, title, sourceKey}`,
      { keys: VAGUE_SOURCE_KEYS },
    ),
  ])

  const sheet = buildOutreachCallSheet({ research, contacts, offers, limit: 8, maxContactsPerOrg: 4 })
  console.log(`${sheet.length} organisations with verified research and someone to call`)
  console.log('')

  let created = 0
  for (const entry of sheet) {
    const _id = `${MARKETING_OPERATION_TYPE}.call-${slug(entry.organization)}`
    // Dedupe: two people at one company can share a first name, and "Contact
    // Lisa, Lisa" reads like a bug. Anyone without a usable name is listed by
    // email rather than guessed at.
    const people = [
      ...new Set(entry.contacts.map((contact) => firstNameFor(contact) || contact.email || 'someone')),
    ].join(', ')

    const doc = {
      _id,
      _type: MARKETING_OPERATION_TYPE,
      title: `Call ${entry.organization}`,
      kind: 'outreach',
      status: 'queued',
      priority: entry.contacts.length >= 4 ? 'high' : 'normal',
      origin: 'manual',
      autonomy: 'humanReview',
      ownerName: 'Juhan',
      targetView: 'outreach',
      sourceKey: `call-sheet/${slug(entry.organization)}`,
      estimatedMinutes: 15,
      dueAt: endOfWeekIso(),
      whyNow: entry.signal,
      // The concrete instruction: who, and what to open with.
      nextAction: `Contact ${people} at ${entry.organization}. Open with: ${entry.opening}`,
      summary: `Verified: “${entry.quote}” — ${entry.sourceUrl}`,
      ...(entry.offer?.key ? { suggestedOfferKey: entry.offer.key } : {}),
    }

    console.log(`  ${entry.organization.padEnd(26)} ${entry.contacts.length} contact(s) · ${_id}`)
    console.log(`     ${doc.nextAction.slice(0, 110)}`)

    if (apply) {
      // createIfNotExists: re-running must never duplicate a call task or wipe
      // a note somebody added after it was created.
      await client.createIfNotExists(doc)
      created += 1
    }
  }

  if (vague.length) {
    console.log('')
    console.log('Umbrella items that describe a routine rather than a task:')
    for (const item of vague) console.log(`  ${item.title}`)
    if (apply && retireVague) {
      for (const item of vague) {
        await client
          .patch(item._id)
          .set({
            status: 'dismissed',
            lastOutcome:
              'Replaced by one concrete task per organisation from the verified call sheet. ' +
              'A cadence is a habit, not something that can be marked done.',
          })
          .commit()
      }
      console.log(`  → dismissed ${vague.length}`)
    } else if (apply) {
      console.log('  (left alone — pass --retire-vague to dismiss them)')
    }
  }

  console.log('')
  if (apply) console.log(`Wrote ${created} call tasks.`)
  else console.log('Dry run — nothing written. Re-run with --apply.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
