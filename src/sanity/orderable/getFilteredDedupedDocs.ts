import {
  getPublishedId,
  getVersionFromId,
  isDraftId,
  isPublishedId,
  isVersionId,
} from 'sanity'

import type { SanityDocumentWithOrder } from './types'

function isVersionForCurrentPerspective(
  document: SanityDocumentWithOrder,
  perspectiveName: string,
  publishedId: string,
) {
  return (
    document._id &&
    isVersionId(document._id) &&
    getVersionFromId(document._id) === perspectiveName &&
    getPublishedId(document._id) === publishedId
  )
}

export function getFilteredDedupedDocs(
  documents: SanityDocumentWithOrder[],
  perspectiveName?: string,
): SanityDocumentWithOrder[] {
  const flatDocuments = documents.flat()

  return flatDocuments.reduce<SanityDocumentWithOrder[]>((acc, current) => {
    if (!current._id) return acc

    if (isVersionId(current._id)) {
      const versionFromId = getVersionFromId(current._id)
      const isCorrectVersion = versionFromId === perspectiveName

      if (
        perspectiveName &&
        perspectiveName !== 'drafts' &&
        perspectiveName !== 'published' &&
        isCorrectVersion
      ) {
        return [...acc, current]
      }

      return acc
    }

    if (perspectiveName === 'published') {
      return isPublishedId(current._id) ? [...acc, current] : acc
    }

    if (!isDraftId(current._id)) {
      const publishedId = getPublishedId(current._id)
      const countPublished = JSON.stringify(flatDocuments).match(`/${publishedId}/g`)
      const hasMatchingVersion =
        perspectiveName && perspectiveName !== 'drafts' && perspectiveName !== 'published'
          ? flatDocuments.some((document) =>
              isVersionForCurrentPerspective(document, perspectiveName, publishedId),
            )
          : false
      const hasDraft = flatDocuments.some((document) => document._id === `drafts.${current._id}`)

      if (hasMatchingVersion) return acc

      return hasDraft || countPublished ? acc : [...acc, current]
    }

    if (perspectiveName && perspectiveName !== 'drafts' && perspectiveName !== 'published') {
      const baseId = getPublishedId(current._id)
      const hasVersion = flatDocuments.some((document) =>
        isVersionForCurrentPerspective(document, perspectiveName, baseId),
      )

      if (hasVersion) return acc
    }

    current.hasPublished = flatDocuments.some(
      (document) => document._id === current._id.replace('drafts.', ''),
    )

    return [...acc, current]
  }, [])
}
