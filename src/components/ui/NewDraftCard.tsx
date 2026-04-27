'use client'

import { useState } from 'react'

interface NewDraftCardProps {
  type: 'caseStudy' | 'feature'
  label: string
}

const deploymentBypassParams = [
  'x-vercel-protection-bypass',
  'x-vercel-set-bypass-cookie',
] as const

// Protected Vercel preview links rely on these params; keep them on
// in-preview mutations and redirects so iframe-based Presentation still works.
function withDeploymentBypassParams(path: string): string {
  const currentUrl = new URL(window.location.href)
  const targetUrl = new URL(path, window.location.origin)

  for (const param of deploymentBypassParams) {
    const value = currentUrl.searchParams.get(param)
    if (value) {
      targetUrl.searchParams.set(param, value)
    }
  }

  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`
}

export function NewDraftCard({ type, label }: NewDraftCardProps) {
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)

    try {
      const res = await fetch(withDeploymentBypassParams('/api/create-draft'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!res.ok) throw new Error('Failed to create draft')

      const { slug } = await res.json()
      // Navigate the preview iframe to the new draft's public page.
      // Draft mode is already enabled in this iframe (we only render
      // NewDraftCard inside the Presentation preview), so the
      // `[slug]` route will fetch the draft via sanityFetch and
      // Presentation will wire up overlays for inline editing.
      const previewPath = type === 'caseStudy' ? `/work/${slug}` : `/vision/${slug}`
      window.location.href = withDeploymentBypassParams(previewPath)
    } catch (e) {
      console.error('Failed to create draft:', e)
      setCreating(false)
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="block w-full bg-white overflow-hidden shadow-card hover:shadow-card-hover transition-shadow cursor-pointer border-0 text-left"
    >
      <div className="h-full min-h-[200px] flex flex-col justify-center items-center text-center p-8">
        {creating ? (
          <p className="text-gray font-semibold text-sm">Creating...</p>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-medium flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-gray font-semibold text-sm">{label}</p>
          </>
        )}
      </div>
    </button>
  )
}
