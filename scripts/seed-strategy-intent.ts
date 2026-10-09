/**
 * Seed Marqueta's first intent draft from what the studio has already decided.
 *
 *   npx tsx scripts/seed-strategy-intent.ts --notes <private-file> --by <name>          # dry run: shows what it would send
 *   npx tsx scripts/seed-strategy-intent.ts --notes <private-file> --by <name> --write  # stores the notes and drafts
 *   npx tsx scripts/seed-strategy-intent.ts                                              # reads the current intent
 *
 * The notes are the decisions already taken (positioning, segments, the
 * turnaround verdict, the quarter's plan). They are business facts, so they
 * live in a file OUTSIDE this public repository and are written only to the
 * private outreach dataset — never committed, never printed in CI. The draft is
 * a DRAFT: someone approves it in Slack (`Marqueta, intent`) or it stays one.
 */
import { readFileSync } from 'node:fs'
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
  const { readIntent, seedIntentContext } = await import('../src/lib/marketing/strategyIntent.server')
  const { intentProblems } = await import('../src/lib/marketing/strategyIntent')

  const notesPath = flag('notes')
  if (!notesPath) {
    const current = await readIntent()
    if (!current) {
      console.log('No intent yet. Seed one with --notes <private-file> --by <name> --write.')
      return
    }
    console.log(JSON.stringify({ status: current.status, version: current.version, endState: current.endState, objectives: current.objectives }, null, 2))
    const problems = intentProblems(current, new Date())
    console.log(problems.length ? `Before it can be approved: ${problems.join(' ')}` : 'Ready to approve.')
    return
  }

  const resolved = path.resolve(notesPath)
  // Windows paths are case-insensitive (C:\ and c:\ are the same folder).
  const fold = (value: string) => (process.platform === 'win32' ? value.toLowerCase() : value)
  if (fold(resolved).startsWith(fold(path.resolve(process.cwd()) + path.sep))) {
    throw new Error('The notes file is inside the repository. Keep it outside: it holds business facts and this repo is public.')
  }
  const notes = readFileSync(resolved, 'utf8').trim()
  const by = (flag('by') || '').trim()
  if (!notes) throw new Error('The notes file is empty.')
  if (!by) throw new Error('Say who is seeding it: --by <name>.')

  if (!has('write')) {
    console.log(`Dry run. Would store ${notes.length} characters of notes as the intent's context and ask Marqueta to draft from them, by ${by}.`)
    console.log('Re-run with --write to do it.')
    return
  }

  const result = await seedIntentContext({ notes, by })
  if (!result.ok) {
    console.error(`Not drafted: ${result.message}`)
    process.exit(1)
  }
  const problems = intentProblems(result.intent, new Date())
  console.log(`Drafted version ${result.intent.version} (${result.intent.status}) with ${result.intent.objectives.length} objective(s).`)
  console.log(problems.length ? `Before it can be approved: ${problems.join(' ')}` : 'Ready for someone to approve in Slack: `Marqueta, intent`.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
