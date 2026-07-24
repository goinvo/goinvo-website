import { useEffect, useRef, useState } from 'react'
import { Badge, Box, Button, Card, Flex, Inline, Stack, Text } from '@sanity/ui'
import { EyeOpenIcon } from '@sanity/icons'
import { studioSessionHeader } from '../../tools/marketingTool'

interface PreviewMedia {
  url: string
  type: 'image' | 'video'
  altText?: string
}
interface PreviewData {
  platform: 'linkedin' | 'instagram' | null
  contentType?: string | null
  status?: string | null
  content: { text: string; link?: string; linkTitle?: string; media: PreviewMedia[] }
  warnings: string[]
}

/**
 * "Preview post" — shows EXACTLY what a calendar item will publish to a social
 * channel (caption, media, link) before it goes live, plus any warnings the
 * publish worker would hit (no media on Instagram, missing alt text, etc.).
 * Read-only: hits GET /api/marketing/publish/preview, which uses the same
 * buildPublishContent the worker uses, so the preview can't drift from the post.
 */
export function PublishPreview({
  itemId,
  hasUnsavedChanges = false,
}: {
  itemId: string
  hasUnsavedChanges?: boolean
}) {
  const [data, setData] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestVersion = useRef(0)

  useEffect(() => {
    requestVersion.current += 1
    setData(null)
    setError(null)
    setLoading(false)
  }, [itemId, hasUnsavedChanges])

  const load = async () => {
    if (hasUnsavedChanges) return
    const version = requestVersion.current + 1
    requestVersion.current = version
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/marketing/publish/preview?id=${encodeURIComponent(itemId)}`, {
        headers: { ...studioSessionHeader() },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `Preview failed (${res.status})`)
      }
      const nextData = (await res.json()) as PreviewData
      if (requestVersion.current === version) setData(nextData)
    } catch (caught) {
      if (requestVersion.current === version) {
        setError(caught instanceof Error ? caught.message : 'Preview failed.')
        setData(null)
      }
    } finally {
      if (requestVersion.current === version) setLoading(false)
    }
  }

  const platformLabel = data?.platform === 'linkedin' ? 'LinkedIn' : data?.platform === 'instagram' ? 'Instagram' : 'Not a social channel'

  return (
    <Stack space={3}>
      <Flex gap={2} align="center">
        <Button
          icon={EyeOpenIcon}
          mode="ghost"
          tone="primary"
          text={loading ? 'Loading preview…' : data ? 'Refresh preview' : 'Preview saved post'}
          onClick={load}
          disabled={loading || hasUnsavedChanges}
          fontSize={1}
        />
        {data && (
          <Badge tone={data.platform ? 'primary' : 'caution'} fontSize={1}>
            {platformLabel}
          </Badge>
        )}
      </Flex>


      <Text size={1} muted>
        {hasUnsavedChanges
          ? 'Save this calendar item before previewing so the preview cannot show an older version.'
          : 'Preview uses the saved calendar item and never publishes or schedules it.'}
      </Text>

      {error && (
        <Card tone="critical" padding={3} radius={2} border>
          <Text size={1}>{error}</Text>
        </Card>
      )}

      {data && (
        <Card tone="transparent" padding={3} radius={2} border>
          <Stack space={3}>
            <Text size={0} muted weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
              What will publish
            </Text>

            {data.content.text.trim() ? (
              <Text size={1} style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {data.content.text}
              </Text>
            ) : (
              <Text size={1} muted>
                (no caption)
              </Text>
            )}

            {data.content.media.length > 0 && (
              <Inline space={2}>
                {data.content.media.map((media, index) =>
                  media.type === 'video' ? (
                    <Badge key={index} tone="default" fontSize={1}>
                      🎬 Video
                    </Badge>
                  ) : (
                    <Box
                      key={index}
                      style={{ width: 64, height: 64, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--card-border-color)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={media.url}
                        alt={media.altText || `Slide ${index + 1}`}
                        title={media.altText || ''}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </Box>
                  ),
                )}
              </Inline>
            )}

            {data.content.link && (
              <Text size={1} muted>
                Link: <span style={{ wordBreak: 'break-all' }}>{data.content.link}</span>
              </Text>
            )}

            {data.warnings.length > 0 && (
              <Card tone="caution" padding={3} radius={2} border>
                <Stack space={2}>
                  {data.warnings.map((warning, index) => (
                    <Text key={index} size={1}>
                      ⚠ {warning}
                    </Text>
                  ))}
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
