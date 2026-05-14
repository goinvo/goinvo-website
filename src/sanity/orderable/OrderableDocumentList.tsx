import { Component } from 'react'
import type { MultipleMutationResult } from '@sanity/client'
import type { ToastParams } from '@sanity/ui'

import { ORDER_PRESET_TYPE } from './constants'
import { DocumentListWrapper } from './DocumentListWrapper'
import { getFilteredDedupedDocs } from './getFilteredDedupedDocs'
import { partitionPublicationDocuments, shouldGroupByPublicationState } from './groups'
import { getNamedOrderPresetId, getOrderPresetId, getOrderPresetSlug } from './ids'
import { getNeedsOrderingIds, getPresetDocumentIds, sortDocumentsByPreset } from './presets'
import { getDocumentQuery, getOrderPresetQuery, getOrderPresetsQuery } from './query'
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

  if (shouldGroupByPublicationState(options.type)) {
    return partitionPublicationDocuments(documents).published
  }

  return getFilteredDedupedDocs(documents, options.currentVersion)
}

async function fetchPreset(options: OrderableDocumentListOptions) {
  return options.client.fetch<OrderPreset | null>(
    getOrderPresetQuery(),
    { presetId: options.presetId },
    { tag: 'goinvo-orderable.action-preset' },
  )
}

async function fetchPresets(options: OrderableDocumentListOptions) {
  return options.client.fetch<OrderPreset[]>(
    getOrderPresetsQuery(),
    { type: options.type },
    { tag: 'goinvo-orderable.action-presets' },
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

function getPresetLabel(preset: OrderPreset) {
  return preset.name || preset.title || preset._id
}

function getPresetPromptList(presets: OrderPreset[]) {
  return presets
    .map((preset, index) => `${index + 1}. ${getPresetLabel(preset)}`)
    .join('\n')
}

function findPresetFromChoice(presets: OrderPreset[], choice: string | null) {
  const trimmed = choice?.trim()
  if (!trimmed) return null

  const choiceIndex = Number(trimmed)
  if (Number.isInteger(choiceIndex) && choiceIndex >= 1 && choiceIndex <= presets.length) {
    return presets[choiceIndex - 1]
  }

  return presets.find((preset) => getPresetLabel(preset).toLowerCase() === trimmed.toLowerCase())
    ?? null
}

function choosePreset(presets: OrderPreset[], action: string) {
  if (!presets.length) return null

  return findPresetFromChoice(
    presets,
    window.prompt(`${action}. Type a preset number or exact name:\n\n${getPresetPromptList(presets)}`),
  )
}

function getPresetNameInput(defaultName = '') {
  const name = window.prompt('Preset name:', defaultName)?.trim()
  if (name && !getOrderPresetSlug(name)) {
    window.alert('Preset names need at least one letter or number.')
    return null
  }

  return name || null
}

function getPresetSaveName(preset: OrderPreset, type: string) {
  if (preset.name) return preset.name
  if (preset._id === getOrderPresetId(type)) return 'Default'
  return preset.title || preset._id
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
      const name = getPresetNameInput()
      if (!name) return

      this.setActionToast({
        status: 'info',
        title: 'Saving order preset...',
        closable: true,
      })

      try {
        const documents = await fetchDocuments(this.props.options)
        const documentIds = getPresetDocumentIds(documents)
        const presetId = getNamedOrderPresetId(this.props.options.type, name)
        const existing = await this.props.options.client.fetch<OrderPreset | null>(
          getOrderPresetQuery(),
          { presetId },
          { tag: 'goinvo-orderable.action-preset-exists' },
        )

        if (existing && !window.confirm(`Overwrite the "${getPresetLabel(existing)}" order preset?`)) {
          this.setActionToast({
            status: 'info',
            title: 'Preset save cancelled',
            closable: true,
          })
          return
        }

        await this.props.options.client.createOrReplace({
          _id: presetId,
          _type: ORDER_PRESET_TYPE,
          name,
          title: `${this.props.options.type} order preset: ${name}`,
          orderType: this.props.options.type,
          documentIds,
          updatedAt: new Date().toISOString(),
        })

        this.setActionToast({
          status: 'success',
          title: `Saved "${name}" preset`,
          description: `${documentIds.length} ordered pages`,
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

    overwriteOrderPreset: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Loading order presets...',
        closable: true,
      })

      try {
        const presets = await fetchPresets(this.props.options)
        const preset = choosePreset(presets, 'Overwrite an order preset')

        if (!preset) {
          this.setActionToast({
            status: 'info',
            title: presets.length ? 'Preset overwrite cancelled' : 'No order presets saved yet',
            closable: true,
          })
          return
        }

        const label = getPresetLabel(preset)
        if (!window.confirm(`Overwrite the "${label}" order preset with the current order?`)) {
          this.setActionToast({
            status: 'info',
            title: 'Preset overwrite cancelled',
            closable: true,
          })
          return
        }

        const documents = await fetchDocuments(this.props.options)
        const documentIds = getPresetDocumentIds(documents)
        const name = getPresetSaveName(preset, this.props.options.type)

        await this.props.options.client.createOrReplace({
          ...preset,
          _type: ORDER_PRESET_TYPE,
          name,
          title: `${this.props.options.type} order preset: ${name}`,
          orderType: this.props.options.type,
          documentIds,
          updatedAt: new Date().toISOString(),
        })

        this.setActionToast({
          status: 'success',
          title: `Overwrote "${name}" preset`,
          description: `${documentIds.length} ordered pages`,
          closable: true,
        })
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Overwriting order preset failed',
          closable: true,
        })
      }
    },

    loadOrderPreset: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Loading order presets...',
        closable: true,
      })

      try {
        const presets = await fetchPresets(this.props.options)
        const preset = choosePreset(presets, 'Load an order preset')

        if (!preset?.documentIds?.length) {
          this.setActionToast({
            status: 'info',
            title: presets.length ? 'Preset load cancelled' : 'No order presets saved yet',
            closable: true,
          })
          return
        }

        const documents = await fetchDocuments(this.props.options)
        const orderedDocuments = sortDocumentsByPreset(documents, preset)
        const result = await commitRanks(this.props.options, orderedDocuments)
        this.reportRankResult(result, orderedDocuments.length, `Loaded "${getPresetLabel(preset)}" preset`)
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Loading order preset failed',
          closable: true,
        })
      }
    },

    deleteOrderPreset: async () => {
      this.setActionToast({
        status: 'info',
        title: 'Loading order presets...',
        closable: true,
      })

      try {
        const presets = await fetchPresets(this.props.options)
        const preset = choosePreset(presets, 'Delete an order preset')

        if (!preset) {
          this.setActionToast({
            status: 'info',
            title: presets.length ? 'Preset delete cancelled' : 'No order presets saved yet',
            closable: true,
          })
          return
        }

        const name = getPresetLabel(preset)
        if (!window.confirm(`Delete the "${name}" order preset? This will not delete any pages.`)) {
          this.setActionToast({
            status: 'info',
            title: 'Preset delete cancelled',
            closable: true,
          })
          return
        }

        await this.props.options.client.delete(preset._id, {
          tag: 'goinvo-orderable.delete-preset',
        })

        this.setActionToast({
          status: 'success',
          title: `Deleted "${name}" preset`,
          closable: true,
        })
      } catch {
        this.setActionToast({
          status: 'error',
          title: 'Deleting order preset failed',
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
