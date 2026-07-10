import type { StructureBuilder, StructureResolver } from 'sanity/structure'
import { StarIcon } from '@sanity/icons'
import { goinvoOrderableDocumentListDeskItem } from './orderable/deskItem'

/**
 * Custom desk structure: drag-to-reorder lists for the document types
 * whose display order matters on the public site (Case Study, Vision
 * Piece, Team Member). The orderable lists persist a hidden
 * `orderRank` string field on each document; queries sort by
 * orderRank, and the numeric `order` field has been retired.
 */
const FEEDBACK_TYPE = 'cmsFeedback'
const CHAT_THREAD_TYPE = 'chatThread'

// Editorial document types that belong in the Content desk's auto-generated
// section (caseStudy/feature/teamMember are added above as orderable lists;
// cmsFeedback/chatThread get their own inbox views). This is an ALLOWLIST on
// purpose: every OTHER schema type — all marketing*/AI/internal types, and
// anything added later — is reached through the Marketing tool and stays OUT of
// Content by default. Previously this was a denylist of known marketing types,
// so each new marketing/AI schema silently leaked in as an empty "category"
// until someone remembered to exclude it. Add a type here only when it is
// genuine editorial content that an author should manage from Content.
const CONTENT_LIST_TYPES = ['category', 'job', 'healthVisualization'] as const

export const structure: StructureResolver = (S, context) => {
  return S.list()
    .title('Content')
    .items([
      orderableList(S, context, { type: 'caseStudy', title: 'Case Study' }),
      orderableList(S, context, { type: 'feature', title: 'Vision Piece' }),
      // Curated /vision hero list — a singleton editor, not a document list.
      S.listItem()
        .id('visionSpotlight')
        .title('Spotlight')
        .icon(StarIcon)
        .child(S.document().schemaType('visionSpotlight').documentId('visionSpotlight')),
      orderableList(S, context, { type: 'teamMember', title: 'Team Member' }),
      feedbackInboxList(S),
      chatThreadInboxList(S),
      S.divider(),
      // Auto-generated list items, but ONLY for the allowlisted editorial types
      // above — marketing/AI/internal types are managed in the Marketing tool,
      // not Content, so they never leak in here as empty categories.
      ...S.documentTypeListItems().filter((listItem) => {
        const id = listItem.getId()
        return id !== undefined && (CONTENT_LIST_TYPES as readonly string[]).includes(id)
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

function chatThreadInboxList(S: StructureBuilder) {
  const newestFirst = [{ field: 'lastMessageAt', direction: 'desc' as const }]

  return S.listItem()
    .title('Chat Threads')
    .schemaType(CHAT_THREAD_TYPE)
    .child(
      S.list()
        .title('Chat Threads')
        .items([
          S.listItem()
            .title('New')
            .child(
              S.documentList()
                .title('New Chat Threads')
                .schemaType(CHAT_THREAD_TYPE)
                .filter(`_type == "${CHAT_THREAD_TYPE}" && status == "new"`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('Open')
            .child(
              S.documentList()
                .title('Open Chat Threads')
                .schemaType(CHAT_THREAD_TYPE)
                .filter(`_type == "${CHAT_THREAD_TYPE}" && status in ["new", "open"]`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('Waiting on Visitor')
            .child(
              S.documentList()
                .title('Waiting on Visitor')
                .schemaType(CHAT_THREAD_TYPE)
                .filter(`_type == "${CHAT_THREAD_TYPE}" && status == "waitingOnVisitor"`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('Closed')
            .child(
              S.documentList()
                .title('Closed Chat Threads')
                .schemaType(CHAT_THREAD_TYPE)
                .filter(`_type == "${CHAT_THREAD_TYPE}" && status in ["resolved", "spam", "archived"]`)
                .defaultOrdering(newestFirst),
            ),
          S.listItem()
            .title('All')
            .child(
              S.documentList()
                .title('All Chat Threads')
                .schemaType(CHAT_THREAD_TYPE)
                .filter(`_type == "${CHAT_THREAD_TYPE}"`)
                .defaultOrdering(newestFirst),
            ),
        ]),
    )
}
