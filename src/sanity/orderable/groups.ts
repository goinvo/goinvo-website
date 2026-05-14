import { getPublishedId, isDraftId, isPublishedId } from 'sanity'

import type { SanityDocumentWithOrder } from './types'

export function shouldGroupByPublicationState(type: string) {
  return type === 'caseStudy' || type === 'feature'
}

export function partitionPublicationDocuments(documents: SanityDocumentWithOrder[]) {
  const flatDocuments = documents.flat()
  const published = flatDocuments.filter((document) => document._id && isPublishedId(document._id))
  const drafts = flatDocuments
    .filter((document) => document._id && isDraftId(document._id))
    .map((document) => ({
      ...document,
      hasPublished: flatDocuments.some((item) => item._id === getPublishedId(document._id)),
    }))

  return { published, drafts }
}

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
