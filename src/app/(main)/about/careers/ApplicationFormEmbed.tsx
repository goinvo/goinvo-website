'use client'

import { useEffect, useRef, useState } from 'react'

const APPLICATION_FORM_ID = '251193306087052'
const APPLICATION_FORM_MIN_HEIGHT = 1050

function getJotFormHeight(message: MessageEvent['data']): number | null {
  if (typeof message !== 'string') return null

  const parts = message.split(':')
  if (
    parts[0] !== 'setHeight'
    || parts.length < 3
    || parts[parts.length - 1] !== APPLICATION_FORM_ID
  ) {
    return null
  }

  const height = Number.parseInt(parts[1], 10)
  return Number.isFinite(height) ? height : null
}

export function ApplicationFormEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(APPLICATION_FORM_MIN_HEIGHT)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const nextHeight = getJotFormHeight(event.data)
      if (nextHeight === null) return

      setHeight(Math.max(nextHeight, APPLICATION_FORM_MIN_HEIGHT))
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <iframe
      ref={iframeRef}
      id={`JotFormIFrame-${APPLICATION_FORM_ID}`}
      title="Application"
      src={`https://form.jotform.com/${APPLICATION_FORM_ID}`}
      className="w-full border-0"
      style={{ height: `${height}px` }}
      scrolling="no"
      allowTransparency
    />
  )
}
