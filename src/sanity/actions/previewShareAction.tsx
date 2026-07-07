import { useCallback, useEffect, useState } from 'react'
import type { DocumentActionComponent, DocumentActionProps } from 'sanity'
import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput, useToast } from '@sanity/ui'
import { CopyIcon, ShareIcon, TrashIcon } from '@sanity/icons'
import { studioSessionHeader } from '@/sanity/lib/studioSession'
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_OPTIONS,
  isShareableDocType,
} from '@/lib/previewShare'

interface ActiveLink {
  id: string
  createdAt?: string
  expiresAt?: string
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function PreviewShareDialog({ docId, slug }: { docId: string; slug?: string }) {
  const toast = useToast()
  const [links, setLinks] = useState<ActiveLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expiryDays, setExpiryDays] = useState<number>(DEFAULT_EXPIRY_DAYS)
  const [created, setCreated] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const authHeaders = useCallback(
    (extra?: Record<string, string>) => ({ ...studioSessionHeader(), ...(extra || {}) }),
    [],
  )

  const loadLinks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/preview-share?docId=${encodeURIComponent(docId)}`, {
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load links')
      setLinks(Array.isArray(data.links) ? data.links : [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load links')
    } finally {
      setLoading(false)
    }
  }, [authHeaders, docId])

  useEffect(() => {
    void loadLinks()
  }, [loadLinks])

  const createLink = useCallback(async () => {
    if (!slug) {
      setError('Add a slug to this document before sharing a preview.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/preview-share', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ docId, expiryDays }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to create link')
      setCreated({ url: data.url, expiresAt: data.expiresAt })
      setError(null)
      await loadLinks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link')
    } finally {
      setCreating(false)
    }
  }, [authHeaders, docId, expiryDays, loadLinks, slug])

  const revoke = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/preview-share?id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: authHeaders(),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Failed to revoke')
        }
        if (created && links.find((l) => l.id === id)) setCreated(null)
        await loadLinks()
        toast.push({ status: 'success', title: 'Preview link revoked' })
      } catch (err) {
        toast.push({ status: 'error', title: err instanceof Error ? err.message : 'Failed to revoke' })
      }
    },
    [authHeaders, created, links, loadLinks, toast],
  )

  const copy = useCallback(
    (url: string) => {
      navigator.clipboard.writeText(url).then(
        () => toast.push({ status: 'success', title: 'Link copied' }),
        () => toast.push({ status: 'error', title: 'Copy failed — select and copy manually' }),
      )
    },
    [toast],
  )

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Text size={1} muted>
          Anyone with the link can view this draft as it will look on the site — no login required. Links
          expire automatically and can be revoked at any time.
        </Text>

        {!slug && (
          <Card padding={3} radius={2} tone="caution" border>
            <Text size={1}>Add a slug to this document before you can share a preview.</Text>
          </Card>
        )}

        {created && (
          <Card padding={3} radius={2} tone="positive" border>
            <Stack space={3}>
              <Text size={1} weight="semibold">
                New link — copy it now (it won’t be shown again)
              </Text>
              <Flex gap={2}>
                <Box flex={1}>
                  <TextInput value={created.url} readOnly fontSize={1} />
                </Box>
                <Button icon={CopyIcon} text="Copy" tone="primary" onClick={() => copy(created.url)} />
              </Flex>
              <Text size={1} muted>
                Expires {formatDate(created.expiresAt)}
              </Text>
            </Stack>
          </Card>
        )}

        {slug && (
          <Card padding={3} radius={2} tone="default" border>
            <Stack space={3}>
              <Text size={1} weight="semibold">
                Create a share link
              </Text>
              <Flex gap={2} align="center" wrap="wrap">
                {EXPIRY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.days}
                    text={opt.label}
                    mode={expiryDays === opt.days ? 'default' : 'ghost'}
                    tone={expiryDays === opt.days ? 'primary' : 'default'}
                    fontSize={1}
                    padding={2}
                    onClick={() => setExpiryDays(opt.days)}
                  />
                ))}
                <Box flex={1} />
                <Button
                  icon={ShareIcon}
                  text={creating ? 'Creating…' : 'Create link'}
                  tone="primary"
                  disabled={creating}
                  onClick={() => void createLink()}
                />
              </Flex>
            </Stack>
          </Card>
        )}

        <Stack space={3}>
          <Text size={1} weight="semibold">
            Active links
          </Text>
          {loading ? (
            <Flex align="center" gap={2}>
              <Spinner muted />
              <Text size={1} muted>
                Loading…
              </Text>
            </Flex>
          ) : links.length === 0 ? (
            <Text size={1} muted>
              No active share links.
            </Text>
          ) : (
            <Stack space={2}>
              {links.map((link) => (
                <Card key={link.id} padding={3} radius={2} border tone="transparent">
                  <Flex align="center" gap={3}>
                    <Box flex={1}>
                      <Text size={1}>
                        Created {formatDate(link.createdAt)} · Expires {formatDate(link.expiresAt)}
                      </Text>
                    </Box>
                    <Button
                      icon={TrashIcon}
                      text="Revoke"
                      tone="critical"
                      mode="ghost"
                      fontSize={1}
                      padding={2}
                      onClick={() => void revoke(link.id)}
                    />
                  </Flex>
                </Card>
              ))}
            </Stack>
          )}
        </Stack>

        {error && (
          <Card padding={3} radius={2} tone="critical" border>
            <Text size={1}>{error}</Text>
          </Card>
        )}
      </Stack>
    </Box>
  )
}

/**
 * "Share preview" document action — appears on shareable content types
 * (feature → /vision, caseStudy → /work). Opens a dialog to mint no-login,
 * expiring, revocable preview links for the current draft. All reads/writes go
 * through the auth-gated /api/preview-share route (Studio session or API key).
 */
export const previewShareAction: DocumentActionComponent = (props: DocumentActionProps) => {
  // Sanity invokes document-action components like hooks/components, so calling
  // useState here is valid despite the lowercase name the action contract requires.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [open, setOpen] = useState(false)

  const type = props.type
  const slug =
    ((props.draft?.slug as { current?: string } | undefined)?.current ||
      (props.published?.slug as { current?: string } | undefined)?.current) ??
    undefined

  if (!isShareableDocType(type)) return null

  return {
    label: 'Share preview',
    icon: ShareIcon,
    onHandle: () => setOpen(true),
    dialog: open && {
      type: 'dialog',
      header: 'Share draft preview',
      width: 'medium',
      onClose: () => setOpen(false),
      content: <PreviewShareDialog docId={props.id} slug={slug} />,
    },
  }
}
