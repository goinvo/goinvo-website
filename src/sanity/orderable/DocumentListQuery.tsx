import { useEffect, useMemo, useState } from 'react'
import { Box, Card, Container, Flex, Spinner, Stack, Text } from '@sanity/ui'
import type { SanityClient } from '@sanity/client'

import { DraggableList } from './DraggableList'
import { getFilteredDedupedDocs } from './getFilteredDedupedDocs'
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

  const needsOrderingIds = useMemo(
    () => getNeedsOrderingIds(data, presetState.data),
    [data, presetState.data],
  )
  const dataKey = useMemo(
    () => data.map((document) => `${document._id}:${document.orderRank ?? ''}`).join('|'),
    [data],
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

  if (!data.length) {
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

  return (
    <Stack space={1} style={{ overflow: 'auto', height: '100%' }}>
      <Box padding={2}>
        {needsOrderingIds.size > 0 && (
          <Box marginBottom={2}>
            <Card padding={4} radius={2} tone="caution">
              <Text size={1}>
                {needsOrderingIds.size}/{data.length} pages still need to be ordered. Drag
                highlighted pages into place, then select <strong>Save Order Preset</strong>.
              </Text>
            </Card>
          </Box>
        )}
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
