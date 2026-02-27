'use client'

import { useState } from 'react'
import { siteConfig } from '@/lib/config'
import { trackFormSubmit } from '@/lib/analytics'

export function SubscribeForm() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const name = (form.elements.namedItem('name') as HTMLInputElement).value

    try {
      const response = await fetch(siteConfig.mailerlite.formEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fields: { email, name },
          'ml-submit': 1,
          anticsrf: true,
        }),
      })

      if (response.ok) {
        setStatus('success')
        trackFormSubmit({ form_name: 'newsletter_subscribe', form_location: 'footer' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <h4 className="font-serif text-lg mb-2">Thank you!</h4>
        <p className="text-gray">You have successfully joined our subscriber list.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <h4 className="font-serif text-lg mb-2">Something went wrong...</h4>
        <p className="text-gray">Please try again.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h4 className="font-serif text-lg mb-2">Subscribe to our newsletter</h4>
      <p className="text-gray text-md mb-6">
        You&apos;ll receive our latest ideas, visualizations, and studio news delivered to your
        inbox twice a month.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          aria-label="Email"
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="email"
          required
          className="w-full px-4 py-3 border border-gray-medium rounded focus:outline-none focus:border-primary"
        />
        <input
          aria-label="Name"
          type="text"
          name="name"
          placeholder="Name"
          autoComplete="given-name"
          required
          className="w-full px-4 py-3 border border-gray-medium rounded focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="w-full bg-primary text-white font-semibold uppercase tracking-wider py-3 rounded hover:bg-primary-dark transition-colors duration-[var(--transition-button)]"
        >
          Subscribe
        </button>
      </form>
    </div>
  )
}
