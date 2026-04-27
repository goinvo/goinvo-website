import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { Box, Card, useToast } from '@sanity/ui'
import type { PatchOperations } from 'sanity'
import { useClient } from 'sanity'
import { usePaneRouter } from 'sanity/structure'

import { Document } from './Document'
import { ORDER_FIELD_NAME, ORDERABLE_API_VERSION } from './constants'
import { reorderDocuments } from './reorderDocuments'
import type { SanityDocumentWithOrder } from './types'

interface ListSetting {
  isDuplicate: boolean
  isGhosting: boolean
  isDragging: boolean
  isSelected: boolean
  needsOrdering: boolean
}

interface DraggableListProps {
  data: SanityDocumentWithOrder[]
  listIsUpdating: boolean
  needsOrderingIds: Set<string>
  setListIsUpdating: (val: boolean) => void
}

const getItemStyle = (
  draggableStyle: CSSProperties | undefined,
  itemIsUpdating: boolean,
): CSSProperties => ({
  userSelect: 'none',
  transition: 'opacity 500ms ease-in-out',
  opacity: itemIsUpdating ? 0.2 : 1,
  pointerEvents: itemIsUpdating ? 'none' : undefined,
  ...draggableStyle,
})

function cardTone(settings: ListSetting) {
  const { isDuplicate, isGhosting, isDragging, isSelected, needsOrdering } = settings

  if (isGhosting) return 'transparent'
  if (isDragging || isSelected) return 'primary'
  if (isDuplicate || needsOrdering) return 'caution'

  return undefined
}

export function DraggableList({
  data,
  listIsUpdating,
  needsOrderingIds,
  setListIsUpdating,
}: DraggableListProps) {
  const toast = useToast()
  const client = useClient({ apiVersion: ORDERABLE_API_VERSION })
  const router = usePaneRouter()
  const { groupIndex, routerPanesState } = router
  const currentDoc = routerPanesState[groupIndex + 1]?.[0]?.id || false
  const [orderedData, setOrderedData] = useState<SanityDocumentWithOrder[]>(data)
  const [draggingId, setDraggingId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>(currentDoc ? [currentDoc] : [])

  const clearSelected = useCallback(() => setSelectedIds([]), [])

  const handleSelect = useCallback(
    (clickedId: string, index: number, nativeEvent: MouseEvent) => {
      const isSelected = selectedIds.includes(clickedId)
      const selectMultiple = nativeEvent.shiftKey
      const isUsingWindows = navigator.appVersion.indexOf('Win') !== -1
      const selectAdditional = isUsingWindows ? nativeEvent.ctrlKey : nativeEvent.metaKey

      if (!selectMultiple && !selectAdditional) {
        return setSelectedIds([clickedId])
      }

      if (selectMultiple) nativeEvent.preventDefault()

      if (selectMultiple && !isSelected) {
        const lastSelectedId = selectedIds[selectedIds.length - 1]
        const lastSelectedIndex = orderedData.findIndex((item) => item._id === lastSelectedId)
        const firstSelected = index < lastSelectedIndex ? index : lastSelectedIndex
        const lastSelected = index > lastSelectedIndex ? index : lastSelectedIndex
        const betweenIds = orderedData
          .filter((item, itemIndex) => itemIndex > firstSelected && itemIndex < lastSelected)
          .map((item) => item._id)

        return setSelectedIds([...selectedIds, ...betweenIds, clickedId])
      }

      if (isSelected) {
        return setSelectedIds(selectedIds.filter((id) => id !== clickedId))
      }

      return setSelectedIds([...selectedIds, clickedId])
    },
    [orderedData, selectedIds],
  )

  const transactPatches = useCallback(
    async (patches: [string, PatchOperations][], message: string) => {
      const transaction = client.transaction()

      patches.forEach(([docId, ops]) => transaction.patch(docId, ops))

      try {
        const updated = await transaction.commit({
          visibility: 'sync',
          tag: 'goinvo-orderable.reorder',
        })
        clearSelected()
        setDraggingId('')
        setListIsUpdating(false)
        toast.push({
          title: `${
            updated.results.length === 1 ? '1 document' : `${updated.results.length} documents`
          } reordered`,
          status: 'success',
          description: message,
        })
      } catch {
        setDraggingId('')
        setListIsUpdating(false)
        toast.push({
          title: 'Reordering failed',
          status: 'error',
        })
      }
    },
    [clearSelected, client, setListIsUpdating, toast],
  )

  const handleDragEnd = useCallback(
    (result: DropResult | undefined, entities: SanityDocumentWithOrder[]) => {
      setDraggingId('')

      const { source, destination, draggableId } = result ?? {}
      if (!source || !destination || source.index === destination.index) return
      if (!entities?.length || !draggableId) return

      const effectedIds = selectedIds?.length ? selectedIds : [draggableId]
      if (!effectedIds?.length) return

      setListIsUpdating(true)
      setSelectedIds(effectedIds)

      const { newOrder, patches, message } = reorderDocuments({
        entities,
        selectedIds: effectedIds,
        source,
        destination,
      })

      if (newOrder?.length) setOrderedData(newOrder)
      if (patches?.length) transactPatches(patches, message)
    },
    [selectedIds, setListIsUpdating, transactPatches],
  )

  const handleDragStart = useCallback(
    (start: { draggableId: string }) => {
      const selected = selectedIds.includes(start.draggableId)
      if (!selected) clearSelected()
      setDraggingId(start.draggableId)
    },
    [clearSelected, selectedIds],
  )

  const incrementIndex = useCallback(
    (shiftFrom: number, shiftTo: number, id: string, entities: SanityDocumentWithOrder[]) => {
      return handleDragEnd(
        {
          draggableId: id,
          source: { index: shiftFrom, droppableId: 'documentSortZone' },
          destination: { index: shiftTo, droppableId: 'documentSortZone' },
          reason: 'DROP',
          mode: 'FLUID',
          type: 'DEFAULT',
          combine: null,
        },
        entities,
      )
    },
    [handleDragEnd],
  )

  const onWindowKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelected()
    },
    [clearSelected],
  )

  useEffect(() => {
    window.addEventListener('keydown', onWindowKeyDown)
    return () => window.removeEventListener('keydown', onWindowKeyDown)
  }, [onWindowKeyDown])

  const duplicateOrders = useMemo(() => {
    const orderField = orderedData
      .map((item) => item[ORDER_FIELD_NAME])
      .filter((rank): rank is string => Boolean(rank))

    return orderField.filter((item, index) => orderField.indexOf(item) !== index)
  }, [orderedData])

  const onDragEnd = useCallback(
    (result: DropResult) => handleDragEnd(result, orderedData),
    [handleDragEnd, orderedData],
  )

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={onDragEnd}>
      <Droppable droppableId="documentSortZone">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {orderedData.map((item, index) => (
              <Draggable
                key={`${item._id}-${item[ORDER_FIELD_NAME] ?? 'unordered'}`}
                draggableId={item._id}
                index={index}
              >
                {(innerProvided, innerSnapshot) => {
                  const isSelected = selectedIds.includes(item._id)
                  const isDragging = innerSnapshot.isDragging
                  const isGhosting = Boolean(!isDragging && draggingId && isSelected)
                  const isUpdating = listIsUpdating && isSelected
                  const needsOrdering = needsOrderingIds.has(item._id)
                  const isDuplicate = duplicateOrders.includes(item[ORDER_FIELD_NAME] ?? '')
                  const tone = cardTone({
                    isDuplicate,
                    isGhosting,
                    isDragging,
                    isSelected,
                    needsOrdering,
                  })
                  const dragBadge = isDragging && selectedIds.length > 1 ? selectedIds.length : false

                  return (
                    <div
                      ref={innerProvided.innerRef}
                      {...innerProvided.draggableProps}
                      {...innerProvided.dragHandleProps}
                      style={getItemStyle(innerProvided.draggableProps.style, isUpdating)}
                    >
                      <Box paddingBottom={1}>
                        <Card
                          tone={tone}
                          shadow={isDragging ? 2 : undefined}
                          radius={2}
                          onClick={(e) => handleSelect(item._id, index, e.nativeEvent)}
                        >
                          <Document
                            doc={item}
                            entities={orderedData}
                            increment={incrementIndex}
                            index={index}
                            isFirst={index === 0}
                            isLast={index === orderedData.length - 1}
                            dragBadge={dragBadge}
                          />
                        </Card>
                      </Box>
                    </div>
                  )
                }}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
