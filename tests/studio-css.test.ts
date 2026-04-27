import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Sanity Studio CSS overrides', () => {
  it('adds a visible label to the collapsed field group selector', () => {
    const css = readFileSync('src/sanity/studio.css', 'utf8')

    expect(css).toContain("select[data-testid='field-group-select']")
    expect(css).toContain("content: 'Section'")
  })

  it('distinguishes the portable text insert menu from formatting overflow', () => {
    const css = readFileSync('src/sanity/studio.css', 'utf8')

    expect(css).toContain("[data-testid='insert-menu-button']::before")
    expect(css).toContain("content: '+'")
  })
})
