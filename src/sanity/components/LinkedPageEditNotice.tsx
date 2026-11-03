import { useEffect, useRef, useState } from 'react'
import { Box, Button, Checkbox, Dialog, Flex, Stack, Text } from '@sanity/ui'
import { useCurrentUser, useFormValue, type ObjectInputProps } from 'sanity'

import { changedFields, linkedNoticeStorageKey, shouldShowLinkedNotice } from '../linkedPageNotice'

// Shown-this-session, per piece: module state lives as long as the Studio tab.
const shownThisSession = new Set<string>()

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/**
 * Wraps the vision piece form. On the first edit to a piece that is on /vision AND /work, it says the edit changes
 * both pages. Field edits do not pass through this wrapper's onChange (members write to the form directly), so it
 * watches the value instead, and counts a change as this person's own edit only when the changed field is the one
 * they have focus in: a colleague editing elsewhere never triggers it.
 */
export function LinkedPageEditNotice(props: ObjectInputProps) {
  const user = useCurrentUser()
  const documentId = useFormValue(['_id']) as string | undefined
  const featured = useFormValue(['featured']) === true
  const [open, setOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const key = user?.id && documentId ? linkedNoticeStorageKey(user.id, documentId) : null
  const { value, focusPath } = props
  const previous = useRef(value)

  useEffect(() => {
    const before = previous.current
    previous.current = value
    if (!key || before === value) return
    const focused = String(focusPath[0] ?? '')
    const edited = changedFields(before, value).filter((field) => field === focused)
    if (
      shouldShowLinkedNotice({
        onBothPages: featured,
        editedFields: edited,
        dismissedForever: readDismissed(key),
        shownThisSession: shownThisSession.has(key),
      })
    ) {
      shownThisSession.add(key)
      setOpen(true)
    }
  }, [featured, focusPath, key, value])

  const close = () => {
    if (dontShowAgain && key) {
      try {
        window.localStorage.setItem(key, '1')
      } catch {
        // Private window or blocked storage: the notice comes back next session, which is harmless.
      }
    }
    setOpen(false)
  }

  return (
    <>
      {props.renderDefault(props)}
      {open && (
        <Dialog
          id="linked-page-edit-notice"
          header="This edit changes two pages"
          onClose={close}
          width={1}
          footer={
            <Flex padding={3} justify="flex-end">
              <Button text="Got it" tone="primary" onClick={close} />
            </Flex>
          }
        >
          <Box padding={4}>
            <Stack space={4}>
              <Text size={1}>
                This piece is on <strong>/vision</strong> and also in the <strong>/work</strong> project grid
                (“Also show on /work” is on). It is one entry, so your changes appear on both pages once published.
              </Text>
              <Flex align="center" gap={2} as="label">
                <Checkbox checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.currentTarget.checked)} />
                <Text size={1}>Don’t show this again for this piece</Text>
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </>
  )
}
