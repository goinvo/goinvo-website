import React from 'react'

export function SectionTitleStyle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ textAlign: 'center', fontFamily: 'serif', fontWeight: 300, fontSize: '1.5rem' }}>
      {children}
    </h2>
  )
}

export function CalloutStyle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ background: '#faf6f4', padding: '1rem', borderLeft: '3px solid #E36216' }}>
      {children}
    </p>
  )
}
