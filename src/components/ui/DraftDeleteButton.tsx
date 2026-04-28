'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { withDeploymentBypassParams } from '@/lib/deploymentBypass'

interface DraftDeleteButtonProps {
  documentId?: string
  type: 'caseStudy' | 'feature'
  title: string
}

export function DraftDeleteButton({
  documentId,
  type,
  title,
}: DraftDeleteButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!documentId) return null

  const noun = type === 'caseStudy' ? 'case study' : 'vision article'

  async function deleteDraft() {
    if (isDeleting) return
    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(withDeploymentBypassParams('/api/delete-draft'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, type }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Failed to delete draft')
      }

      setIsOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete draft')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setError(null)
          setIsOpen(true)
        }}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-gray-medium bg-white text-gray shadow-card opacity-0 transition-opacity hover:border-primary hover:text-primary focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary group-hover:opacity-100"
        aria-label={`Delete draft ${title || noun}`}
        title="Delete draft"
      >
        <TrashIcon />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-${documentId}-title`}
        >
          <div className="w-full max-w-[420px] bg-white p-6 shadow-card">
            <h2
              id={`delete-${documentId}-title`}
              className="font-serif text-[1.5rem] font-light leading-tight text-black mb-3"
            >
              Delete this draft?
            </h2>
            <p className="text-gray mb-5">
              This will permanently delete the draft {noun}
              {title ? ` "${title}"` : ''}. Published articles are not affected.
            </p>
            {error && (
              <p className="mb-4 border border-primary bg-primary-lightest p-3 text-sm text-primary">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
                className="border border-gray-medium bg-white px-4 py-2 text-sm font-semibold text-gray transition-colors hover:border-gray hover:text-black disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteDraft}
                disabled={isDeleting}
                className="bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  )
}
