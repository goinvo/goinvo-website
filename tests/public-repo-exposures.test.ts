import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DEFAULT_MARKETING_TEAM_NAMES } from '../src/lib/marketing/team.server'

// This repository is public. The studio's real Slack channel and user ids and its real runway date were scrubbed
// from it (task_1008). The guard below names them only by SHA-256, so it cannot leak what it guards: every word
// of every tracked text file is hashed and compared.
const FORBIDDEN_SHA256 = new Set([
  '5edaf8f0fc18fbb5955d2752cb72130843e18cf4e10102be4e37afee6e5d5154', // a Slack channel id
  '485e79a9f4d92bcb78bfb05d876dce0e002d97079262bd87ac23e7d66c547e6b', // a Slack channel id
  '7b06bb93eb8df86adade3e4a56deff5082f130b1b724a163af5f2ab02cb86894', // a Slack channel id
  '3bcf386c10dda87195ddf15dc701dd354d18c62735cb3136b9c1c688c21b1ee3', // a Slack user id
  'a1f86ade1e680326a16c4969fdba2fe6f954b6f95ba5dca0be9b76e26e1301bb', // a Slack user id
  '0568e3803f0504a6c2febf0eec3eae1f2614d2f537bd9b231d1e2a565beaf51a', // the runway date
])
const TEXT = /\.(ts|tsx|js|mjs|cjs|md|json|html|css|txt|yml|yaml)$/

function sha256(word: string): string {
  return createHash('sha256').update(word).digest('hex')
}

/** Every forbidden word in a text, as the file and line it sits on. */
export function forbiddenWords(file: string, text: string): string[] {
  const hits: string[] = []
  text.split('\n').forEach((line, i) => {
    for (const word of line.match(/[A-Za-z0-9][A-Za-z0-9-]*/g) || []) {
      if (FORBIDDEN_SHA256.has(sha256(word))) hits.push(`${file}:${i + 1}`)
    }
  })
  return hits
}

describe('the public repository carries none of the studio’s private identifiers (task_1008)', () => {
  it('rule: no tracked text file contains a scrubbed Slack id or the real runway date', () => {
    const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((f) => TEXT.test(f))
    const hits = files.flatMap((f) => forbiddenWords(f, readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })

  it('falsified: a planted scrubbed id is reported, by file and line', () => {
    // Assembled from parts so this file never holds the word itself.
    const planted = ['C0B', 'SFAC', 'JY6T'].join('')
    expect(forbiddenWords('planted.ts', `const a = 1\nconst channel = '${planted}'\n`)).toEqual(['planted.ts:2'])
  })

  it('rule: the code carries no default marketing team; the deployment names it', () => {
    expect(DEFAULT_MARKETING_TEAM_NAMES).toEqual([])
  })
})
