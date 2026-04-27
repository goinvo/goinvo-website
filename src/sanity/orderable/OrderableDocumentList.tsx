import { Component } from 'react'
import type { MultipleMutationResult } from '@sanity/client'
import type { ToastParams } from '@sanity/ui'

import { ORDER_PRESET_TYPE } from './constants'
import { DocumentListWrapper } from './DocumentListWrapper'
import { getFilteredDedupedDocs } from './getFilteredDedupedDocs'
import { getNeedsOrderingIds, getPresetDocumentIds, sortDocumentsByPreset } from './presets'
import { getDocumentQuery, getOrderPresetQuery } from './query'
import { rankDocuments } from './rank'
import type {
  OrderableDocumentListOptions,
  OrderPreset,
  SanityDocumentWithOrder,
} from './types'

interface OrderableDocumentListProps {
  options: OrderableDocumentListOptions
}

interface State {
  actionToast: ToastParams
  showIncrements: boolean
}

async function fetchDocuments(options: OrderableDocumentListOptions) {
  const { client, ...queryOptions } = options
  const { query, queryParams } = getDocumentQuery(queryOptions)
  const documents = await client.fetch<SanityDocumentWithOrder[]>(
    query,
    queryParams,
    { tag: 'goinvo-orderable.action-documents' },
  )

  return getFilteredDedupedDocs(documents, options.currentVersion)
}

async function fetchPreset(options: OrderableDocumentListOptions) {
  return options.client.fetch<OrderPreset | null>(
    getOrderPresetQuery(),
    { presetId: options.presetId },
    { tag: 'goinvo-orderable.action-preset' },
  )
}

async function commitRanks(
  options: OrderableDocumentListOptions,
  documents: SanityDocumentWithOrder[],
) {
  const patches = rankDocuments(documents)
  if (!patches.length) return null

  const transaction = patches.reduce(
    (trx, [documentId, ops]) => trx.patch(documentId, ops),
    options.client.transaction(),
  )

  return transaction.commit({
    visibility: 'sync',
    tag: 'goinvo-orderable.rank-documents',
  })
}

// Sanity calls component actionHandlers from structure menu actions.
export class OrderableDocumentList extends Component<OrderableDocumentListProps, State> {
  constructor(props: OrderableDocumentListProps) {
    super(props)
    this.state = {
      actionToast: {},
      showIncrements: false,
    }
  }

  setActionToast(actionToast: ToastParams) {
    this.setState(() => ({ actionToast }))
  }

  actionHandlers = {
    showIncrements: () => {
      this.setState((state) => ({
        showIncrements: !state.showIncrements,
      }))
    },

    saveOrderPreset: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Saving order preset...',
        closable: true,
      })

      try {
        const documents = await fetchDocuments(this.props.options)
        const documentIds = getPresetDocumentIds(documents)

        await this.props.options.client.createOrReplace({
          _id: this.props.options.presetId,
          _type: ORDER_PRESET_TYPE,
          title: `${this.props.options.type} order preset`,
          orderType: this.props.options.type,
          documentIds,
          updatedAt: new Date().toISOString(),
        })

        this.setActionToast({
          status: 'success',
          title: `Saved ${documentIds.length} ordered pages`,
          closable: true,
        })
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Saving order preset failed',
          closable: true,
        })
      }
    },

    loadOrderPreset: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Loading order preset...',
        closable: true,
      })

      try {
        const preset = await fetchPreset(this.props.options)
        if (!preset?.documentIds?.length) {
          this.setActionToast({
            status: 'info',
            title: 'No order preset saved yet',
            closable: true,
          })
          return
        }

        const documents = await fetchDocuments(this.props.options)
        const orderedDocuments = sortDocumentsByPreset(documents, preset)
        const result = await commitRanks(this.props.options, orderedDocuments)
        this.reportRankResult(result, orderedDocuments.length, 'Loaded order preset')
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Loading order preset failed',
          closable: true,
        })
      }
    },

    placeNeedsOrderingFirst: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Moving pages that need ordering...',
        closable: true,
      })

      try {
        const [documents, preset] = await Promise.all([
          fetchDocuments(this.props.options),
          fetchPreset(this.props.options),
        ])
        const needsOrderingIds = getNeedsOrderingIds(documents, preset)

        if (!needsOrderingIds.size) {
          this.setActionToast({
            status: 'info',
            title: 'All pages are ordered',
            closable: true,
          })
          return
        }

        const needsOrdering = documents.filter((document) => needsOrderingIds.has(document._id))
        const ordered = documents.filter((document) => !needsOrderingIds.has(document._id))
        const result = await commitRanks(this.props.options, [...needsOrdering, ...ordered])

        this.reportRankResult(result, needsOrdering.length, 'Moved pages that need ordering')
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Moving pages failed',
          closable: true,
        })
      }
    },
  }

  reportRankResult(
    result: MultipleMutationResult | null,
    documentCount: number,
    successTitle: string,
  ) {
    this.setActionToast({
      status: result?.results?.length ? 'success' : 'info',
      title: result?.results?.length ? successTitle : 'No pages were changed',
      description: result?.results?.length ? `${documentCount} pages checked` : undefined,
      closable: true,
    })
  }

  render() {
    if (!this.props.options.type) return null

    return (
      <DocumentListWrapper
        {...this.props.options}
        actionToast={this.state.actionToast}
        showIncrements={this.state.showIncrements}
      />
    )
  }
}
