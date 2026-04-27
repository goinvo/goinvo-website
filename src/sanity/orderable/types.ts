import type { SanityDocument } from 'sanity'
import type { SanityClient } from '@sanity/client'

import { ORDER_FIELD_NAME } from './constants'

export type OrderableType = 'caseStudy' | 'feature' | 'teamMember'
export type NewItemPosition = 'after' | 'before'

export interface SanityDocumentWithOrder extends SanityDocument {
  [ORDER_FIELD_NAME]?: string
  hasPublished?: boolean
}

export interface OrderPreset {
  _id: string
  _type: 'orderPreset'
  orderType: string
  documentIds?: string[]
  updatedAt?: string
}

export interface DocumentListQueryProps {
  type: string
  filter?: string
  params?: Record<string, unknown>
  currentVersion?: string
}

export interface OrderableDocumentListOptions extends DocumentListQueryProps {
  client: SanityClient
  presetId: string
}
