import { LexoRank } from 'lexorank'
import type { InitialValueResolverContext } from 'sanity'

import { ORDER_FIELD_NAME, ORDERABLE_API_VERSION } from './constants'
import type { NewItemPosition, SanityDocumentWithOrder } from './types'

export function parseOrderRank(value: unknown, fallback: LexoRank): LexoRank {
  if (typeof value !== 'string') return fallback

  try {
    return LexoRank.parse(value)
  } catch {
    return fallback
  }
}

export function initialRank(
  compareRankValue = '',
  newItemPosition: NewItemPosition = 'after',
): string {
  const compareRank = parseOrderRank(compareRankValue, LexoRank.min())
  if (newItemPosition === 'after') return compareRank.genNext().genNext().toString()

  // Halve the gap to the minimum rather than stepping back from the first item: genPrev() stops at the
  // minimum, so once one item sat there every new item landed on the same rank and the order was arbitrary.
  // between() never returns the minimum itself, so there is always room for the next one.
  const min = LexoRank.min()
  if (compareRank.compareTo(min) > 0) return min.between(compareRank).toString()

  // Only legacy data can sit on the minimum; nothing fits before it, so go just after it instead of tying.
  console.warn('[orderable] the first item is at the minimum rank; placing the new item after it')
  return compareRank.between(compareRank.genNext()).toString()
}

/** `initialValue` for an orderRankField: the plugin's own resolver has the genPrev() tie described above. */
export function orderRankInitialValue(type: string) {
  return (_params: unknown, context: Pick<InitialValueResolverContext, 'getClient'>) =>
    getInitialOrderRank(type, context, 'before')
}

export async function getInitialOrderRank(
  type: string,
  context: Pick<InitialValueResolverContext, 'getClient'>,
  newItemPosition: NewItemPosition = 'before',
) {
  const direction = newItemPosition === 'before' ? 'asc' : 'desc'
  const compareOrderRank = await context
    .getClient({ apiVersion: ORDERABLE_API_VERSION })
    .fetch<string | null>(
      `*[_type == $type && defined(@[$order])]|order(@[$order] ${direction})[0][$order]`,
      { type, order: ORDER_FIELD_NAME },
      { tag: 'goinvo-orderable.initial-order-rank' },
    )

  return initialRank(compareOrderRank ?? '', newItemPosition)
}

export function rankDocuments(
  documents: SanityDocumentWithOrder[],
): Array<[string, { set: { [ORDER_FIELD_NAME]: string } }]> {
  let rank = LexoRank.min()

  return documents.flatMap((document) => {
    rank = rank.genNext().genNext()
    const orderRank = rank.toString()
    const patches: Array<[string, { set: { [ORDER_FIELD_NAME]: string } }]> = [
      [document._id, { set: { [ORDER_FIELD_NAME]: orderRank } }],
    ]

    if (document._id.startsWith('drafts.') && document.hasPublished) {
      patches.push([
        document._id.replace('drafts.', ''),
        { set: { [ORDER_FIELD_NAME]: orderRank } },
      ])
    }

    return patches
  })
}
