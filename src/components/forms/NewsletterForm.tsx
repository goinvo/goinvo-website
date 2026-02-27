'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { trackFormSubmit } from '@/lib/analytics'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

export function NewsletterForm() {
  const [state, setState] = useState<FormState>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('submitting')

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const name = (form.elements.namedItem('name') as HTMLInputElement).value

    try {
      const response = await fetch(
        'https://assets.mailerlite.com/jsonp/1457992/forms/152494406199412364/subscribe',
        {
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
        }
      )

      if (response.ok) {
        setState('success')
        trackFormSubmit({ form_name: 'newsletter', form_location: 'homepage' })
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="text-center py-8">
        <h4 className="font-serif text-lg mb-2">Thank you!</h4>
        <p className="text-gray">You have successfully joined our subscriber list.</p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="text-center py-8">
        <h4 className="font-serif text-lg mb-2">Something went wrong...</h4>
        <p className="text-gray mb-4">Please try again.</p>
        <Button onClick={() => setState('idle')} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h4 className="font-serif text-lg mb-2">Subscribe to our newsletter</h4>
      <p className="text-gray mb-6">
        You&apos;ll receive our latest ideas, visualizations, and studio news
        delivered to your inbox twice a month.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          autoComplete="email"
          aria-label="Email"
          className="flex-1 border border-gray-medium px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          name="name"
          placeholder="Name"
          required
          autoComplete="given-name"
          aria-label="Name"
          className="flex-1 border border-gray-medium px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-primary"
        />
        <Button type="submit" variant="primary">
          {state === 'submitting' ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </form>
    </div>
  )
}
