/**
 * Tell the marketing suite how much runway the studio has.
 *
 * The posture bin ("survival", "rebuild") is derived from this, so this is the
 * one number that decides what the whole suite recommends. Set it here, in the
 * Studio, or from Slack — they all write the same record.
 *
 *   npx tsx scripts/set-runway.ts --months 4.5 --basis "signed work in hand"
 *   npx tsx scripts/set-runway.ts --until 2027-01-11
 *   npx tsx scripts/set-runway.ts --confirm
 *   npx tsx scripts/set-runway.ts --signed "SoW - Acme discovery" --months 3
 *   npx tsx scripts/set-runway.ts                       # just read it
 *
 * Dry by default in the sense that reading is the no-argument behaviour; any
 * write needs an explicit flag.
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: path.resolve(process.cwd(), '.env.local'), quiet: true })
loadEnv({ quiet: true })

const args = process.argv.slice(2)
const flag = (name: string): string | undefined => {
  const at = args.indexOf(`--${name}`)
  return at >= 0 ? args[at + 1] : undefined
}
const has = (name: string) => args.includes(`--${name}`)

async function main() {
  // Imported after dotenv, because the Sanity client reads env at module load.
  const { readRunway, setRunway, confirmRunway, recordSignedWork } = await import(
    '../src/lib/marketing/runway.server'
  )
  const { formatMonths, formatRunwayDate } = await import('../src/lib/marketing/runway')

  const months = flag('months') === undefined ? undefined : Number(flag('months'))
  const until = flag('until')
  const signed = flag('signed')
  const personName = flag('by') || 'Shirley'

  let state
  if (signed) {
    if (!Number.isFinite(months) || (months as number) <= 0) {
      throw new Error('--signed needs --months: how much runway did it buy?')
    }
    state = await recordSignedWork({ label: signed, monthsAdded: months as number, personName })
  } else if (months !== undefined || until) {
    state = await setRunway({ months, certainUntil: until, basis: flag('basis'), personName })
  } else if (has('confirm')) {
    state = await confirmRunway({ personName })
  } else {
    state = await readRunway()
  }

  console.log(state.summary)
  console.log(`  posture   ${state.resolved.id} (from the ${state.resolved.source})`)
  console.log(
    `  runway    ${state.resolved.months === null ? 'not recorded' : formatMonths(state.resolved.months)}` +
      ` to ${formatRunwayDate(state.resolved.certainUntil)}`,
  )
  if (state.resolved.disagreement) console.log(`  note      ${state.resolved.disagreement}`)
  console.log(
    state.checkIn.due
      ? `  asks      ${state.checkIn.reason} ${state.checkIn.question}`
      : '  asks      nothing - recently confirmed',
  )
  const commitments = state.stored.runway?.commitments || []
  for (const commitment of commitments) {
    console.log(`  signed    ${commitment.signedAt}  ${commitment.label} (+${commitment.monthsAdded}mo)`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
