import type { StructureBuilder, StructureResolver } from 'sanity/structure'
import { goinvoOrderableDocumentListDeskItem } from './orderable/deskItem'

/**
 * Custom desk structure: drag-to-reorder lists for the document types
 * whose display order matters on the public site (Case Study, Vision
 * Piece, Team Member). The orderable lists persist a hidden
 * `orderRank` string field on each document; queries sort by
 * orderRank, and the numeric `order` field has been retired.
 */
const ORDERABLE_TYPES = ['caseStudy', 'feature', 'teamMember'] as const
const HIDDEN_TYPES = ['orderPreset'] as const

export const structure: StructureResolver = (S, context) => {
  return S.list()
    .title('Content')
    .items([
      orderableList(S, context, { type: 'caseStudy', title: 'Case Study' }),
      orderableList(S, context, { type: 'feature', title: 'Vision Piece' }),
      orderableList(S, context, { type: 'teamMember', title: 'Team Member' }),
      S.divider(),
      // Non-orderable document types: defer to auto-generated list items
      ...S.documentTypeListItems().filter((listItem) => {
        const id = listItem.getId()
        return (
          id !== undefined &&
          !(ORDERABLE_TYPES as readonly string[]).includes(id) &&
          !(HIDDEN_TYPES as readonly string[]).includes(id)
        )
      }),
    ])
}

type OrderableOpts = {
  type: string
  title: string
  icon?: React.ComponentType
}

function orderableList(
  S: StructureBuilder,
  context: Parameters<StructureResolver>[1],
  { type, title, icon }: OrderableOpts,
) {
  return goinvoOrderableDocumentListDeskItem({
    type,
    title,
    icon,
    S,
    context,
  })
}
