'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface EdgeInfo {
  label: string
  left: number
  selector: string
}

export function AlignmentDebug() {
  const [edges, setEdges] = useState<EdgeInfo[]>([])
  const [visible, setVisible] = useState(true)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const measure = useCallback(() => {
    const selectors = [
      { label: 'Header logo', selector: '[data-debug="header-logo"]' },
      { label: 'Hero wrapper', selector: '[data-debug="hero-wrapper"]' },
      { label: 'Hero h1', selector: '[data-debug="hero-text"]' },
      { label: '3M wrapper', selector: '[data-debug="3m-wrapper"]' },
      { label: '3M card', selector: '[data-debug="3m-card"]' },
      { label: 'Topol text', selector: '[data-debug="topol-text"]' },
      { label: 'Logos text', selector: '[data-debug="logos-text"]' },
    ]

    const results: EdgeInfo[] = []
    for (const s of selectors) {
      const el = document.querySelector(s.selector)
      if (el) {
        const rect = el.getBoundingClientRect()
        results.push({ label: s.label, left: Math.round(rect.left), selector: s.selector })
      }
    }
    console.log('[AlignmentDebug] Measured edges:', results)
    setEdges(results)
    setViewport({ w: window.innerWidth, h: window.innerHeight })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    const timers = [
      setTimeout(measure, 500),
      setTimeout(measure, 1500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [measure])

  if (!mounted) return null

  const content = visible ? (
    <>
      {/* Vertical guide lines */}
      {[...new Set(edges.map(e => e.left))].map((left) => (
        <div
          key={left}
          style={{
            position: 'fixed', top: 0, left, width: 1, height: '100vh',
            background: 'rgba(227, 98, 22, 0.5)', zIndex: 99998,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Info panel */}
      <div
        style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 99999,
          background: 'rgba(0,0,0,0.88)', color: '#fff', padding: '10px 14px',
          fontSize: 12, fontFamily: 'monospace', borderRadius: 6,
          maxWidth: 380, lineHeight: 1.6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <strong>Alignment Debug</strong>
          <button
            onClick={() => setVisible(false)}
            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
          >
            hide
          </button>
        </div>
        <div style={{ color: '#aaa', marginBottom: 6 }}>
          Viewport: {viewport.w} x {viewport.h}
        </div>
        <div style={{ color: '#aaa', marginBottom: 6 }}>
          Expected left: {viewport.w > 1020 + 64
            ? `${Math.round((viewport.w - 1020) / 2 + 32)}px (centered 1020+32)`
            : viewport.w > 864
              ? '32px (content-padding desktop)'
              : '16px (content-padding mobile)'}
        </div>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            {edges.map((e) => (
              <tr key={e.selector}>
                <td style={{ padding: '1px 8px 1px 0', color: '#ccc' }}>{e.label}</td>
                <td style={{
                  padding: '1px 0',
                  color: edges[0] && e.left === edges[0].left ? '#4f4' : '#f94',
                  fontWeight: 'bold',
                  textAlign: 'right',
                }}>
                  {e.left}px
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={measure}
          style={{
            marginTop: 6, background: '#555', color: '#fff', border: 'none',
            padding: '3px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 3,
          }}
        >
          Re-measure
        </button>
      </div>
    </>
  ) : (
    <button
      onClick={() => setVisible(true)}
      style={{
        position: 'fixed', bottom: 8, right: 8, zIndex: 99999,
        background: '#E36216', color: '#fff', border: 'none',
        padding: '4px 10px', fontSize: 11, cursor: 'pointer', borderRadius: 4,
      }}
    >
      Debug
    </button>
  )

  return createPortal(content, document.body)
}
