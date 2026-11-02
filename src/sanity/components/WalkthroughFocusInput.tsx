import { useRef } from 'react'
import Image from 'next/image'
import { Button, Card, Stack, Text } from '@sanity/ui'
import { set, unset, useFormValue, type ObjectInputProps } from 'sanity'
import { urlForImage } from '@/sanity/lib/image'
import { validFocus, imageDimensions, type FocusRegion } from '@/lib/guidedWalkthrough'
import type { SanityImage } from '@/types'

export function WalkthroughFocusInput(props: ObjectInputProps) {
  const image = useFormValue([...props.path.slice(0, -1), 'image']) as SanityImage | undefined
  const start = useRef<{ x: number; y: number } | null>(null)
  const region = props.value as FocusRegion | undefined
  const point = (event: React.PointerEvent<HTMLDivElement>) => {
    const r = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(100, (event.clientX - r.left) / r.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - r.top) / r.height * 100)) }
  }
  return <Stack space={3}>
    {image?.asset && <>
      <Text size={1}>Drag over the screenshot to mark the detail. You can also enter percentages below.</Text>
      <Card padding={2} tone="transparent">
        <div aria-label="Screenshot focus editor" style={{ position: 'relative', touchAction: 'none', cursor: props.readOnly ? 'default' : 'crosshair' }}
          onPointerDown={event => { if (props.readOnly) return; start.current = point(event); event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={event => {
            if (!start.current || props.readOnly) return
            const p = point(event), a = start.current
            props.onChange(set({ _type: 'focus', x: Math.round(Math.min(a.x, p.x) * 10) / 10, y: Math.round(Math.min(a.y, p.y) * 10) / 10, width: Math.round(Math.abs(a.x - p.x) * 10) / 10, height: Math.round(Math.abs(a.y - p.y) * 10) / 10 }))
          }}
          onPointerUp={() => { start.current = null }} onPointerCancel={() => { start.current = null }} onLostPointerCapture={() => { start.current = null }}>
          <Image src={urlForImage(image).width(1000).url()} alt={image.alt || 'Choose a focus area'} {...imageDimensions(image)} draggable={false} unoptimized style={{ width: '100%', height: 'auto', display: 'block', userSelect: 'none' }} />
          {validFocus(region) && <span style={{ position: 'absolute', pointerEvents: 'none', border: '3px solid #b84a0e', boxSizing: 'border-box', left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }} />}
        </div>
      </Card>
      <Button text="Show the whole screenshot" mode="ghost" disabled={props.readOnly} onClick={() => props.onChange(unset())} />
    </>}
    {props.renderDefault(props)}
  </Stack>
}
