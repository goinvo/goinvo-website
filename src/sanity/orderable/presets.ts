import { ORDER_FIELD_NAME } from './constants'
import { getCanonicalDocumentId, uniqueIds } from './ids'
import type { OrderPreset, SanityDocumentWithOrder } from './types'

export function getOrderPresetDocumentIds(preset: OrderPreset | null | undefined) {
  return new Set(preset?.documentIds ?? [])
}

export function getNeedsOrderingIds(
  documents: SanityDocumentWithOrder[],
  preset: OrderPreset | null | undefined,
) {
  const presetIds = getOrderPresetDocumentIds(preset)
  const hasPreset = presetIds.size > 0

  return new Set(
    documents
      .filter((document) => {
        if (!document[ORDER_FIELD_NAME]) return true
        return hasPreset && !presetIds.has(getCanonicalDocumentId(document._id))
      })
      .map((document) => document._id),
  )
}

export function getPresetDocumentIds(documents: SanityDocumentWithOrder[]) {
  return uniqueIds(documents.map((document) => getCanonicalDocumentId(document._id)))
}

export function sortDocumentsByPreset(
  documents: SanityDocumentWithOrder[],
  preset: OrderPreset,
) {
  const presetIds = preset.documentIds ?? []
  const presetIndex = new Map(presetIds.map((id, index) => [id, index]))
  const unconfigured: SanityDocumentWithOrder[] = []
  const configured: SanityDocumentWithOrder[] = []

  for (const document of documents) {
    const canonicalId = getCanonicalDocumentId(document._id)
    if (presetIndex.has(canonicalId)) {
      configured.push(document)
    } else {
      unconfigured.push(document)
    }
  }

  configured.sort((a, b) => {
    const aIndex = presetIndex.get(getCanonicalDocumentId(a._id)) ?? Number.MAX_SAFE_INTEGER
    const bIndex = presetIndex.get(getCanonicalDocumentId(b._id)) ?? Number.MAX_SAFE_INTEGER
    return aIndex - bIndex
  })

  return [...unconfigured, ...configured]
}
