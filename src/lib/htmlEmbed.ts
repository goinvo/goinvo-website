export type HtmlEmbedValue = {
  embedMode?: 'html' | 'url'
  url?: string
  html?: string
  css?: string
  js?: string
}

export function hasHtmlEmbedCode(value?: HtmlEmbedValue | null) {
  return Boolean(value?.html?.trim() || value?.css?.trim() || value?.js?.trim())
}

function escapeClosingTag(value: string, tag: 'script' | 'style') {
  return value.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`)
}

export function buildHtmlEmbedSrcDoc(value: HtmlEmbedValue) {
  const css = escapeClosingTag(value.css || '', 'style')
  const js = escapeClosingTag(value.js || '', 'script')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
      }

      * {
        box-sizing: border-box;
      }

      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      ${css}
    </style>
  </head>
  <body>
    ${value.html || ''}
    <script>
      ${js}
    </script>
  </body>
</html>`
}
