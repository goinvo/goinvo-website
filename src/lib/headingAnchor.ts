/**
 * Canonical anchor id for a content heading — the single formula shared by
 * the PortableText renderer (which stamps `id=` on headings) and the AI
 * search index (which offers those same anchors as deep-link targets).
 * Changing this breaks existing inbound #fragment links; don't.
 */
export function headingAnchorId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
