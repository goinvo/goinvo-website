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
  const rank =
    newItemPosition === 'before'
      ? compareRank.genPrev().genPrev()
      : compareRank.genNext().genNext()

  return rank.toString()
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
