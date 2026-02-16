'use client'

import { useState, useEffect } from 'react'

export function OpenSourceChart() {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 600px)')
    setIsDesktop(mq.matches)

    function handler(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="w-full">
      {isDesktop ? (
        <object
          data="/images/open-source/os-desktop.svg"
          type="image/svg+xml"
          className="w-full h-auto"
          aria-label="GoInvo open source projects timeline - desktop view"
        >
          Open source projects chart
        </object>
      ) : (
        <object
          data="/images/open-source/os-mobile.svg"
          type="image/svg+xml"
          className="w-full h-auto"
          aria-label="GoInvo open source projects timeline - mobile view"
        >
          Open source projects chart
        </object>
      )}
    </div>
  )
}
