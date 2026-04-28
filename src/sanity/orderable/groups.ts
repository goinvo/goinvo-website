import type { SanityDocumentWithOrder } from './types'

export function isFeaturedFeatureDocument(document: SanityDocumentWithOrder) {
  if (typeof document.featured === 'boolean') return document.featured
  return document.hiddenWorkPage !== true
}

export function partitionFeatureDocuments(documents: SanityDocumentWithOrder[]) {
  return {
    featured: documents.filter(isFeaturedFeatureDocument),
    nonFeatured: documents.filter((document) => !isFeaturedFeatureDocument(document)),
  }
}

export function filterIdsForDocuments(
  ids: Set<string>,
  documents: SanityDocumentWithOrder[],
) {
  const documentIds = new Set(documents.map((document) => document._id))
  return new Set(Array.from(ids).filter((id) => documentIds.has(id)))
}
