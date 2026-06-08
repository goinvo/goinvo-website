import { useMemo } from 'react'
import { Badge, Card, Stack, Text } from '@sanity/ui'
import type { ObjectInputProps, TextInputProps } from 'sanity'
import { PatchEvent, set, unset } from 'sanity'
import { buildHtmlEmbedSrcDoc, hasHtmlEmbedCode, type HtmlEmbedValue } from '@/lib/htmlEmbed'

function codeLabel(schemaTitle?: string) {
  return schemaTitle ? `${schemaTitle} code editor` : 'Code editor'
}

export function CodeTextareaInput(props: TextInputProps) {
  const { elementProps, onChange, readOnly, schemaType, value } = props

  return (
    <textarea
      {...elementProps}
      aria-label={codeLabel(schemaType.title)}
      readOnly={readOnly}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => {
        const nextValue = event.currentTarget.value
        onChange(PatchEvent.from(nextValue ? set(nextValue) : unset()))
      }}
      style={{
        display: 'block',
        width: '100%',
        minHeight: 180,
        resize: 'vertical',
        border: '1px solid var(--card-border-color)',
        borderRadius: 6,
        background: 'var(--card-bg-color)',
        color: 'var(--card-fg-color)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        fontSize: 13,
        lineHeight: 1.55,
        tabSize: 2,
        padding: 12,
      }}
    />
  )
}

export function HtmlEmbedInput(props: ObjectInputProps<HtmlEmbedValue>) {
  const value = props.value || {}
  const hasCode = hasHtmlEmbedCode(value)
  const srcDoc = useMemo(() => (hasCode ? buildHtmlEmbedSrcDoc(value) : ''), [hasCode, value])

  return (
    <Stack space={3}>
      <Card border padding={4} radius={2}>
        <Stack space={3}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Text weight="semibold" size={1}>HTML embed preview</Text>
            <Badge tone={hasCode ? 'positive' : value.url ? 'primary' : 'default'}>
              {hasCode ? 'Custom HTML' : value.url ? 'URL embed' : 'Empty'}
            </Badge>
          </div>
          <Text muted size={1}>
            Add HTML, CSS, and JavaScript directly, or switch to a URL embed for external tools like Figma or Miro.
            Custom code renders in a sandboxed iframe on the public site.
          </Text>
          {hasCode ? (
            <div
              style={{
                border: '1px solid var(--card-border-color)',
                borderRadius: 6,
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <iframe
                title="HTML embed preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                style={{ display: 'block', width: '100%', height: 320, border: 0 }}
              />
            </div>
          ) : (
            <Card border padding={4} radius={2} tone="transparent">
              <Text muted size={1}>
                The live preview appears after you add HTML, CSS, or JavaScript.
              </Text>
            </Card>
          )}
        </Stack>
      </Card>
      {props.renderDefault(props)}
    </Stack>
  )
}
