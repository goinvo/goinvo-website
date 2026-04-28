import { getPublishedId } from 'sanity'

export function getOrderPresetId(type: string) {
  return `orderPreset.${type}`
}

export function getOrderPresetSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getNamedOrderPresetId(type: string, name: string) {
  const slug = getOrderPresetSlug(name)
  return slug === 'default' ? getOrderPresetId(type) : `orderPreset.${type}.${slug}`
}

export function getCanonicalDocumentId(documentId: string) {
  return getPublishedId(documentId)
}

export function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids))
}
