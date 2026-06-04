type JsonLdData = Record<string, unknown> | Record<string, unknown>[]

/**
 * Renders Schema.org JSON-LD structured data.
 *
 * JSON-LD must be emitted as raw (unescaped) JSON inside a
 * `<script type="application/ld+json">` tag. React escapes any text passed as
 * children (`{...}`) — turning `"` into `&quot;` — which corrupts the JSON and
 * makes the structured data invalid. The Next.js-recommended pattern is
 * therefore `dangerouslySetInnerHTML`. It is safe here because the data is our
 * own structured objects, never user input; we additionally escape `<` so a
 * stray `</script>` can never break out of the tag.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
