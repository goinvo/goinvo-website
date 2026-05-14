import { useEffect, useMemo, useState } from 'react'
import { Box, Card, Container, Flex, Spinner, Stack, Text } from '@sanity/ui'
import type { SanityClient } from '@sanity/client'

import { DraggableList } from './DraggableList'
import { getFilteredDedupedDocs } from './getFilteredDedupedDocs'
import {
  filterIdsForDocuments,
  partitionFeatureDocuments,
  partitionPublicationDocuments,
  shouldGroupByPublicationState,
} from './groups'
import { getNeedsOrderingIds } from './presets'
import { getDocumentQuery, getOrderPresetQuery } from './query'
import type { DocumentListQueryProps, OrderPreset, SanityDocumentWithOrder } from './types'

interface DocumentListQueryComponentProps extends DocumentListQueryProps {
  client: SanityClient
  presetId: string
}

interface LiveQueryState<T> {
  data: T | null
  error: Error | null
  loading: boolean
}

function useLiveQuery<T>(
  client: SanityClient,
  query: string,
  params: Record<string, unknown>,
  tag: string,
): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({
    data: null,
    error: null,
    loading: true,
  })
  const paramsKey = JSON.stringify(params)

  useEffect(() => {
    let mounted = true
    const parsedParams = JSON.parse(paramsKey) as Record<string, unknown>

    async function fetchData() {
      try {
        const data = await client.fetch<T>(query, parsedParams, { tag })
        if (mounted) setState({ data, error: null, loading: false })
      } catch (error) {
        if (mounted) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          })
        }
      }
    }

    fetchData()

    const subscription = client
      .listen(query, parsedParams, {
        includeResult: false,
        visibility: 'query',
      })
      .subscribe({
        next: fetchData,
        error: (error) => {
          if (mounted) {
            setState({
              data: null,
              error: error instanceof Error ? error : new Error(String(error)),
              loading: false,
            })
          }
        },
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [client, paramsKey, query, tag])

  return state
}

function contentTypeLabel(type: string) {
  if (type === 'caseStudy') return 'case studies'
  if (type === 'feature') return 'vision pieces'
  return 'documents'
}

interface OrderableGroupProps {
  description: string
  documents: SanityDocumentWithOrder[]
  droppableId: string
  listIsUpdating: boolean
  needsOrderingIds: Set<string>
  setListIsUpdating: (val: boolean) => void
  title: string
}

function OrderableGroup({
  description,
  documents,
  droppableId,
  listIsUpdating,
  needsOrderingIds,
  setListIsUpdating,
  title,
}: OrderableGroupProps) {
  const groupNeedsOrderingIds = useMemo(
    () => filterIdsForDocuments(needsOrderingIds, documents),
    [documents, needsOrderingIds],
  )
  const documentsKey = useMemo(
    () => documents.map((document) => `${document._id}:${document.orderRank ?? ''}`).join('|'),
    [documents],
  )

  return (
    <Stack space={2}>
      <Card padding={3} radius={2} tone="transparent">
        <Flex align="center" justify="space-between" gap={3}>
          <Box>
            <Text size={1} weight="semibold">
              {title}
            </Text>
            <Box marginTop={2}>
              <Text muted size={1}>
                {description}
              </Text>
            </Box>
          </Box>
          <Text muted size={1}>
            {documents.length}
          </Text>
        </Flex>
      </Card>
      {documents.length ? (
        <DraggableList
          key={`${droppableId}:${documentsKey}`}
          data={documents}
          droppableId={droppableId}
          listIsUpdating={listIsUpdating}
          needsOrderingIds={groupNeedsOrderingIds}
          setListIsUpdating={setListIsUpdating}
        />
      ) : (
        <Card padding={4} radius={2} tone="transparent">
          <Text align="center" muted size={1}>
            No documents in this group
          </Text>
        </Card>
      )}
    </Stack>
  )
}

export function DocumentListQuery({
  client,
  currentVersion,
  filter,
  params,
  presetId,
  type,
}: DocumentListQueryComponentProps) {
  const [listIsUpdating, setListIsUpdating] = useState(false)
  const paramsKey = JSON.stringify(params ?? {})
  const { query, queryParams } = useMemo(
    () =>
      getDocumentQuery({
        type,
        filter,
        params: params ? (JSON.parse(paramsKey) as Record<string, unknown>) : undefined,
        currentVersion,
      }),
    [currentVersion, filter, params, paramsKey, type],
  )
  const documentsState = useLiveQuery<SanityDocumentWithOrder[]>(
    client,
    query,
    queryParams,
    'goinvo-orderable.documents',
  )
  const presetState = useLiveQuery<OrderPreset | null>(
    client,
    getOrderPresetQuery(),
    { presetId },
    'goinvo-orderable.preset',
  )

  const data = useMemo(
    () => getFilteredDedupedDocs(documentsState.data ?? [], currentVersion),
    [currentVersion, documentsState.data],
  )
  const groupedByPublication = shouldGroupByPublicationState(type)
  const publicationGroups = useMemo(
    () => partitionPublicationDocuments(documentsState.data ?? []),
    [documentsState.data],
  )
  const publicOrderDocuments = groupedByPublication ? publicationGroups.published : data

  const needsOrderingIds = useMemo(
    () => getNeedsOrderingIds(publicOrderDocuments, presetState.data),
    [publicOrderDocuments, presetState.data],
  )
  const dataKey = useMemo(
    () => data.map((document) => `${document._id}:${document.orderRank ?? ''}`).join('|'),
    [data],
  )
  const emptyNeedsOrderingIds = useMemo(() => new Set<string>(), [])
  const visibleDocumentCount = groupedByPublication
    ? publicationGroups.published.length + publicationGroups.drafts.length
    : data.length
  const orderingWarning = needsOrderingIds.size > 0 && (
    <Box marginBottom={2}>
      <Card padding={4} radius={2} tone="caution">
        <Text size={1}>
          {needsOrderingIds.size}/{publicOrderDocuments.length} published{' '}
          {contentTypeLabel(type)} still need to be ordered. Drag highlighted published pieces
          into place, then select <strong>Save New Order Preset</strong>.
        </Text>
      </Card>
    </Box>
  )

  if (documentsState.loading || presetState.loading) {
    return (
      <Flex style={{ width: '100%', height: '100%' }} align="center" justify="center">
        <Spinner />
      </Flex>
    )
  }

  if (documentsState.error || presetState.error) {
    return (
      <Box padding={2}>
        <Card padding={4} radius={2} tone="critical">
          <Text size={1}>There was an error loading this orderable list.</Text>
        </Card>
      </Box>
    )
  }

  if (!visibleDocumentCount) {
    return (
      <Flex align="center" direction="column" height="fill" justify="center">
        <Container width={1}>
          <Box paddingX={4} paddingY={5}>
            <Text align="center" muted>
              No documents of this type
            </Text>
          </Box>
        </Container>
      </Flex>
    )
  }

  if (groupedByPublication) {
    const publishedTitle = type === 'caseStudy' ? 'Published work' : 'Published vision pieces'
    const draftTitle = type === 'caseStudy' ? 'Draft work' : 'Draft vision pieces'

    if (type === 'feature') {
      const publishedFeatureGroups = partitionFeatureDocuments(publicationGroups.published)
      const draftFeatureGroups = partitionFeatureDocuments(publicationGroups.drafts)

      return (
        <Stack space={1} style={{ overflow: 'auto', height: '100%' }}>
          <Box padding={2}>
            {orderingWarning}
            <Stack space={4}>
              <OrderableGroup
                title="Published / Featured"
                description="Published vision pieces selected for featured surfaces and public ordering."
                documents={publishedFeatureGroups.featured}
                droppableId="featurePublishedFeaturedSortZone"
                listIsUpdating={listIsUpdating}
                needsOrderingIds={needsOrderingIds}
                setListIsUpdating={setListIsUpdating}
              />
              <OrderableGroup
                title="Published / Non-featured"
                description="Published vision pieces that are not selected for featured surfaces."
                documents={publishedFeatureGroups.nonFeatured}
                droppableId="featurePublishedNonFeaturedSortZone"
                listIsUpdating={listIsUpdating}
                needsOrderingIds={needsOrderingIds}
                setListIsUpdating={setListIsUpdating}
              />
              {publicationGroups.drafts.length > 0 && (
                <>
                  <OrderableGroup
                    title="Drafts / Featured"
                    description="Draft vision pieces are separated from the public ordering."
                    documents={draftFeatureGroups.featured}
                    droppableId="featureDraftFeaturedSortZone"
                    listIsUpdating={listIsUpdating}
                    needsOrderingIds={emptyNeedsOrderingIds}
                    setListIsUpdating={setListIsUpdating}
                  />
                  <OrderableGroup
                    title="Drafts / Non-featured"
                    description="Draft vision pieces are separated from the public ordering."
                    documents={draftFeatureGroups.nonFeatured}
                    droppableId="featureDraftNonFeaturedSortZone"
                    listIsUpdating={listIsUpdating}
                    needsOrderingIds={emptyNeedsOrderingIds}
                    setListIsUpdating={setListIsUpdating}
                  />
                </>
              )}
            </Stack>
          </Box>
        </Stack>
      )
    }

    return (
      <Stack space={1} style={{ overflow: 'auto', height: '100%' }}>
        <Box padding={2}>
          {orderingWarning}
          <Stack space={4}>
            <OrderableGroup
              title={publishedTitle}
              description="Published pieces shown on the public site. This is the visible ordering."
              documents={publicationGroups.published}
              droppableId={`${type}PublishedSortZone`}
              listIsUpdating={listIsUpdating}
              needsOrderingIds={needsOrderingIds}
              setListIsUpdating={setListIsUpdating}
            />
            {publicationGroups.drafts.length > 0 && (
              <OrderableGroup
                title={draftTitle}
                description="Draft pieces are separated from the public ordering until they are published."
                documents={publicationGroups.drafts}
                droppableId={`${type}DraftSortZone`}
                listIsUpdating={listIsUpdating}
                needsOrderingIds={emptyNeedsOrderingIds}
                setListIsUpdating={setListIsUpdating}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    )
  }

  return (
    <Stack space={1} style={{ overflow: 'auto', height: '100%' }}>
      <Box padding={2}>
        {orderingWarning}
        <DraggableList
          key={dataKey}
          data={data}
          listIsUpdating={listIsUpdating}
          needsOrderingIds={needsOrderingIds}
          setListIsUpdating={setListIsUpdating}
        />
      </Box>
    </Stack>
  )
}
