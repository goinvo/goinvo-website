import { getPublishedId } from 'sanity'

export function getOrderPresetId(type: string) {
  return `orderPreset.${type}`
}

export function getCanonicalDocumentId(documentId: string) {
  return getPublishedId(documentId)
}

export function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids))
}
