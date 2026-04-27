import { LexoRank } from 'lexorank'
import type { PatchOperations } from 'sanity'

import { ORDER_FIELD_NAME } from './constants'
import { parseOrderRank } from './rank'
import type { SanityDocumentWithOrder } from './types'

interface ReorderArgs {
  entities: SanityDocumentWithOrder[]
  selectedIds: string[]
  source: { index: number }
  destination: { index: number }
}

function lexicographicalSort(a: SanityDocumentWithOrder, b: SanityDocumentWithOrder) {
  if (!a[ORDER_FIELD_NAME] || !b[ORDER_FIELD_NAME]) return 0
  if (a[ORDER_FIELD_NAME] < b[ORDER_FIELD_NAME]) return -1
  if (a[ORDER_FIELD_NAME] > b[ORDER_FIELD_NAME]) return 1
  return 0
}

export function reorderDocuments({ entities, selectedIds, source, destination }: ReorderArgs) {
  const startIndex = source.index
  const endIndex = destination.index
  const isMovingUp = startIndex > endIndex
  const selectedItems = entities.filter((item) => selectedIds.includes(item._id))
  const message = [
    'Moved',
    selectedItems.length === 1 ? '1 document' : `${selectedItems.length} documents`,
    isMovingUp ? 'up' : 'down',
    'from position',
    `${startIndex + 1} to ${endIndex + 1}`,
  ].join(' ')

  const { all, selected } = entities.reduce<{
    all: SanityDocumentWithOrder[]
    selected: SanityDocumentWithOrder[]
  }>(
    (acc, current, currentIndex) => {
      if (selectedIds.includes(current._id)) return acc

      if (currentIndex === endIndex) {
        const previousRank = parseOrderRank(
          entities[currentIndex - 1]?.[ORDER_FIELD_NAME],
          LexoRank.min(),
        )
        const currentRank = parseOrderRank(current[ORDER_FIELD_NAME], LexoRank.min())
        const nextRank = parseOrderRank(
          entities[currentIndex + 1]?.[ORDER_FIELD_NAME],
          LexoRank.max(),
        )
        let betweenRank = isMovingUp
          ? previousRank.between(currentRank)
          : currentRank.between(nextRank)

        for (const selectedItem of selectedItems) {
          selectedItem[ORDER_FIELD_NAME] = betweenRank.toString()
          betweenRank = isMovingUp
            ? betweenRank.between(currentRank)
            : betweenRank.between(nextRank)
        }

        return {
          all: isMovingUp
            ? [...acc.all, ...selectedItems, current]
            : [...acc.all, current, ...selectedItems],
          selected: selectedItems,
        }
      }

      return { all: [...acc.all, current], selected: acc.selected }
    },
    { all: [], selected: [] },
  )

  const patches = selected.flatMap((document) => {
    const documentPatches: [string, PatchOperations][] = [
      [
        document._id,
        {
          set: {
            [ORDER_FIELD_NAME]: document[ORDER_FIELD_NAME],
          },
        },
      ],
    ]

    if (document._id.startsWith('drafts.') && document.hasPublished) {
      documentPatches.push([
        document._id.replace('drafts.', ''),
        {
          set: {
            [ORDER_FIELD_NAME]: document[ORDER_FIELD_NAME],
          },
        },
      ])
    }

    return documentPatches
  })

  return { newOrder: all.sort(lexicographicalSort), patches, message }
}
