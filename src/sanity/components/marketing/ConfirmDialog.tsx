import { useCallback, useState } from 'react'
import { Box, Button, Dialog, Flex, Stack, Text } from '@sanity/ui'

export interface ConfirmOptions {
  title: string
  /** Body text (supports line breaks via \n). */
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Button tone for the confirm action (default 'critical' for destructive). */
  tone?: 'critical' | 'primary' | 'caution'
}

interface PendingConfirm {
  opts: ConfirmOptions
  resolve: (value: boolean) => void
}

/**
 * In-Studio confirmation dialog to replace blocking `window.confirm()` (which is
 * jarring inside Sanity's polished UI). Returns an async `confirm()` that resolves
 * true/false, plus the `confirmDialog` element to render once in the component.
 *
 *   const { confirm, confirmDialog } = useConfirmDialog()
 *   …
 *   if (!(await confirm({ title: 'Delete channel?', message }))) return
 *   …
 *   return (<>{confirmDialog} …</>)
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // If a dialog is somehow already open, resolve it as cancelled first.
      setPending((current) => {
        current?.resolve(false)
        return { opts, resolve }
      })
    })
  }, [])

  const settle = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value)
        return null
      })
    },
    [],
  )

  const confirmDialog = pending ? (
    <Dialog
      id="marketing-confirm-dialog"
      header={pending.opts.title}
      onClose={() => settle(false)}
      width={1}
    >
      <Box padding={4}>
        <Stack space={4}>
          <Text size={1} muted style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
            {pending.opts.message}
          </Text>
          <Flex gap={2} justify="flex-end">
            <Button
              mode="ghost"
              text={pending.opts.cancelLabel || 'Cancel'}
              onClick={() => settle(false)}
            />
            <Button
              tone={pending.opts.tone || 'critical'}
              text={pending.opts.confirmLabel || 'Confirm'}
              onClick={() => settle(true)}
            />
          </Flex>
        </Stack>
      </Box>
    </Dialog>
  ) : null

  return { confirm, confirmDialog }
}
