import { EditInStudioLink } from './EditInStudioLink'

interface Props {
  documentType: 'caseStudy' | 'feature'
  documentId: string
}

/**
 * Draft-mode-only card shown in place of an empty article body.
 * Clicking it opens the document in the Studio Structure view so the
 * editor can jump straight into the Main Content tab.
 */
export function EmptyContentPlaceholder({ documentType, documentId }: Props) {
  return (
    <div className="max-width max-width-md content-padding mx-auto py-12">
      <EditInStudioLink
        documentType={documentType}
        documentId={documentId}
        fieldPath="content"
        ariaLabel="Open content editor"
        className="group rounded-lg"
      >
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-medium bg-gray-light py-14 px-8 text-center transition-colors group-hover:border-primary group-hover:bg-primary-lightest"
        >
          <PlusCircle />
          <p className="font-serif text-xl font-light text-black m-0">
            Click to open content editor…
          </p>
          <p className="text-gray text-md m-0">
            Write the article body in the Main Content tab. Your changes
            will show up here as you type.
          </p>
        </div>
      </EditInStudioLink>
    </div>
  )
}

function PlusCircle() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden
      className="text-gray group-hover:text-primary transition-colors"
    >
      <circle
        cx="22"
        cy="22"
        r="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <path
        d="M22 14V30M14 22H30"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
