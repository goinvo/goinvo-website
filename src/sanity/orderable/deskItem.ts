import {
  ComposeIcon,
  DocumentsIcon,
  DownloadIcon,
  TrashIcon,
  SortIcon,
  UploadIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import type { ComponentType } from 'react'
import type { ConfigContext } from 'sanity'
import { type ListItem, type MenuItem, type StructureBuilder } from 'sanity/structure'

import { getOrderPresetId } from './ids'
import { OrderableDocumentList } from './OrderableDocumentList'

interface OrderableListConfig {
  type: string
  id?: string
  title?: string
  icon?: ComponentType
  params?: Record<string, unknown>
  filter?: string
  menuItems?: MenuItem[]
  createIntent?: boolean
  context: ConfigContext
  S: StructureBuilder
}

export function goinvoOrderableDocumentListDeskItem(config: OrderableListConfig): ListItem {
  if (!config?.type || !config.context || !config.S) {
    throw new Error('type, context, and S are required for orderable document lists.')
  }

  const { type, filter, menuItems = [], createIntent, params, title, icon, id, context, S } = config
  const { schema, getClient } = context
  const perspectiveStack = (context as { perspectiveStack?: string[] }).perspectiveStack || []
  const currentVersion = perspectiveStack[0]
  const client = getClient({ apiVersion: 'v2025-06-27' })
  const listTitle = title ?? `Orderable ${type}`
  const listId = id ?? `orderable-${type}`
  const listIcon = icon ?? SortIcon
  const typeTitle = schema.get(type)?.title ?? type

  if (createIntent !== false) {
    menuItems.push(
      S.menuItem()
        .title(`Create new ${typeTitle}`)
        .icon(ComposeIcon)
        .intent({ type: 'create', params: { type } })
        .serialize(),
    )
  }

  return S.listItem()
    .title(listTitle)
    .id(listId)
    .icon(listIcon)
    .schemaType(type)
    .child(
      Object.assign(
        S.documentTypeList(type)
          .canHandleIntent(() => createIntent !== false)
          .serialize(),
        {
          __preserveInstance: true,
          key: listId,
          type: 'component',
          component: OrderableDocumentList,
          options: {
            type,
            filter,
            params,
            client,
            currentVersion,
            presetId: getOrderPresetId(type),
          },
          menuItems: [
            ...menuItems,
            S.menuItem()
              .title('Save New Order Preset')
              .icon(UploadIcon)
              .action('saveOrderPreset')
              .serialize(),
            S.menuItem()
              .title('Overwrite Order Preset')
              .icon(DocumentsIcon)
              .action('overwriteOrderPreset')
              .serialize(),
            S.menuItem()
              .title('Load Order Preset')
              .icon(DownloadIcon)
              .action('loadOrderPreset')
              .serialize(),
            S.menuItem()
              .title('Delete Order Preset')
              .icon(TrashIcon)
              .action('deleteOrderPreset')
              .serialize(),
            S.menuItem()
              .title('Move Needs-Ordering to Top')
              .icon(WarningOutlineIcon)
              .action('placeNeedsOrderingFirst')
              .serialize(),
            S.menuItem()
              .title('Toggle Increments')
              .icon(SortIcon)
              .action('showIncrements')
              .serialize(),
          ],
        },
      ),
    )
    .serialize()
}
