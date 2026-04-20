import { EditInStudioLink } from './EditInStudioLink'

interface Props {
  documentType: 'caseStudy' | 'feature'
  documentId: string
}

/**
 * Draft-mode-only placeholder shown inside the article flow when the
 * hero image is not yet set. Clicking it opens the document in the
 * Studio Structure view so the editor can upload an image.
 *
 * The static placeholder SVG still renders in the persistent hero
 * band above (non-interactive, shown to public visitors too) — this
 * element adds a second, prominent call-to-action at the top of the
 * article body so editors aren't left hunting for the image field.
 */
export function MissingHeroPlaceholder({ documentType, documentId }: Props) {
  return (
    <div className="max-width max-width-md content-padding mx-auto pt-6">
      <EditInStudioLink
        documentType={documentType}
        documentId={documentId}
        ariaLabel="Upload hero image"
        className="group rounded-lg"
      >
        <div className="flex items-center gap-4 rounded-lg border-2 border-dashed border-gray-medium bg-gray-light py-6 px-6 text-left transition-colors group-hover:border-primary group-hover:bg-primary-lightest">
          <PlusBadge />
          <div>
            <p className="font-semibold text-black m-0 mb-1">
              Hero image not set
            </p>
            <p className="text-gray text-md m-0">
              Click to upload a hero image in Sanity Studio. Until then, a
              placeholder will show on the live page.
            </p>
          </div>
        </div>
      </EditInStudioLink>
    </div>
  )
}

function PlusBadge() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className="shrink-0 text-gray group-hover:text-primary transition-colors"
    >
      <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M20 12V28M12 20H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
