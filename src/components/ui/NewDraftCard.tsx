'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NewDraftCardProps {
  type: 'caseStudy' | 'feature'
  label: string
}

export function NewDraftCard({ type, label }: NewDraftCardProps) {
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)

    try {
      const res = await fetch('/api/create-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!res.ok) throw new Error('Failed to create draft')

      const { studioUrl } = await res.json()
      router.push(studioUrl)
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
