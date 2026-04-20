import type { StructureBuilder, StructureResolver } from 'sanity/structure'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'

/**
 * Custom desk structure: drag-to-reorder lists for the document types
 * whose display order matters on the public site (Case Study, Vision
 * Piece, Team Member, Homepage Header). The orderable lists persist
 * a hidden `orderRank` field on each document; keep the numeric
 * `order` field in place for backwards compat — queries can switch to
 * `orderRank` later if needed.
 */
export const structure: StructureResolver = (S, context) => {
  return S.list()
    .title('Content')
    .items([
      orderableList(S, context, {
        type: 'caseStudy',
        title: 'Case Study',
        icon: undefined,
      }),
      orderableList(S, context, {
        type: 'feature',
        title: 'Vision Piece',
      }),
      orderableList(S, context, {
        type: 'teamMember',
        title: 'Team Member',
      }),
      orderableList(S, context, {
        type: 'homepageHeader',
        title: 'Homepage Header',
      }),
      S.divider(),
      // Non-orderable document types: defer to auto-generated list items
      ...S.documentTypeListItems().filter((listItem) => {
        const id = listItem.getId()
        return (
          id !== undefined &&
          !['caseStudy', 'feature', 'teamMember', 'homepageHeader'].includes(id)
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
  return orderableDocumentListDeskItem({
    type,
    title,
    icon,
    S,
    context,
  })
}
