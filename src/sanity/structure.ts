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
const FEEDBACK_TYPE = 'cmsFeedback'

export const structure: StructureResolver = (S, context) => {
  return S.list()
    .title('Content')
    .items([
      orderableList(S, context, { type: 'caseStudy', title: 'Case Study' }),
      orderableList(S, context, { type: 'feature', title: 'Vision Piece' }),
      orderableList(S, context, { type: 'teamMember', title: 'Team Member' }),
      feedbackInboxList(S),
      S.divider(),
      // Non-orderable document types: defer to auto-generated list items
      ...S.documentTypeListItems().filter((listItem) => {
        const id = listItem.getId()
        return (
          id !== undefined &&
          !(ORDERABLE_TYPES as readonly string[]).includes(id) &&
          !(HIDDEN_TYPES as readonly string[]).includes(id) &&
          id !== FEEDBACK_TYPE
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

function feedbackInboxList(S: StructureBuilder) {
  const newestFirst = [{ field: 'submittedAt', direction: 'desc' as const }]

  return S.listItem()
    .title('CMS Feedback')
    .schemaType(FEEDBACK_TYPE)
    .child(
      S.list()
        .title('CMS Feedback')
        .items([
          S.listItem()
            .title('Unread')
            .child(
              S.documentList()
                .title('Unread Feedback')
                .schemaType(FEEDBACK_TYPE)
                .filter(`_type == "${FEEDBACK_TYPE}" && !defined(readAt)`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('Open / Reviewed')
            .child(
              S.documentList()
                .title('Open / Reviewed Feedback')
                .schemaType(FEEDBACK_TYPE)
                .filter(`_type == "${FEEDBACK_TYPE}" && (!defined(status) || status in ["new", "reviewed"])`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('Resolved')
            .child(
              S.documentList()
                .title('Resolved Feedback')
                .schemaType(FEEDBACK_TYPE)
                .filter(`_type == "${FEEDBACK_TYPE}" && status in ["resolved", "noAction", "archived"]`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('All')
            .child(
              S.documentList()
                .title('All Feedback')
                .schemaType(FEEDBACK_TYPE)
                .filter(`_type == "${FEEDBACK_TYPE}"`)
                .defaultOrdering(newestFirst),
            ),
        ]),
    )
}
