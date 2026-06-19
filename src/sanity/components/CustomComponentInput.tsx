import { Box, Card, Flex, Stack, Text } from '@sanity/ui'
import { WarningOutlineIcon } from '@sanity/icons'
import type { ObjectInputProps } from 'sanity'
import { stegaClean } from '@sanity/client/stega'
import { CUSTOM_COMPONENTS, isKnownCustomComponentName } from '@/lib/customComponents'

type CustomComponentValue = { name?: string }

/**
 * Input for the `customComponent` block. Renders the normal fields (the
 * "Component name" dropdown) and, when the selected name is missing or not one
 * the page can render, shows a prominent inline card that says exactly what is
 * wrong and how to fix it — so the editor never has to decode a bare red border
 * or hunt through the validation list. The same name registry
 * (src/lib/customComponents) backs this card, the renderer, and validation.
 */
export function CustomComponentInput(props: ObjectInputProps<CustomComponentValue>) {
  // In the Studio form the value is clean, but the Presentation tool stega-encodes
  // field values for visual editing — strip it before comparing (same as the renderer).
  const name = (stegaClean(props.value?.name) || '').trim()
  const invalid = !isKnownCustomComponentName(name)

  return (
    <Stack space={3}>
      {invalid && (
        <Card tone="critical" border padding={3} radius={2}>
          <Flex gap={3}>
            <Box marginTop={1}>
              <Text size={2}>
                <WarningOutlineIcon />
              </Text>
            </Box>
            <Stack space={3} flex={1}>
              <Text size={1} weight="semibold">
                {name
                  ? `"${name}" is not a component this page can render`
                  : 'No component is selected yet'}
              </Text>
              <Text size={1}>
                {name
                  ? 'On the live page this block shows a placeholder instead of a widget, and Publish stays disabled until it is fixed.'
                  : 'This block needs a component before the page can render it or you can publish.'}
              </Text>
              <Text size={1} weight="semibold">
                How to fix
              </Text>
              <Text size={1}>
                Open the &ldquo;Component name&rdquo; dropdown below and choose one of:
              </Text>
              <Stack space={2} paddingLeft={2}>
                {CUSTOM_COMPONENTS.map((component) => (
                  <Text key={component.value} size={1} muted>
                    • {component.title}
                  </Text>
                ))}
              </Stack>
            </Stack>
          </Flex>
        </Card>
      )}
      {props.renderDefault(props)}
    </Stack>
  )
}
