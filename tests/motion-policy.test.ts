import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ease } from '@/lib/motion'

// One motion vocabulary: the curves live in src/lib/motion.ts (for Framer Motion) and
// in globals.css @theme (for CSS), and nowhere else; and Framer and a CSS transition
// never animate the same properties of one element.

const root = path.resolve(__dirname, '..')
const sources = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name)
  if (entry.isDirectory()) return entry.name === 'prototypes' || entry.name === 'node_modules' ? [] : sources(full)
  return /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : []
})
const files = sources(path.join(root, 'src')).filter(file => !file.endsWith(path.join('lib', 'motion.ts')))
const rel = (file: string) => path.relative(root, file).split(path.sep).join('/')

describe('motion policy', () => {
  it('the Framer curves and the CSS curve tokens are the same curves', () => {
    const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8')
    const token = (name: string) => {
      const m = new RegExp(`--ease-${name}:\\s*cubic-bezier\\(([^)]*)\\)`).exec(css)
      return m ? m[1].split(',').map(Number) : null
    }
    expect(token('out-expo')).toEqual([...ease.outExpo])
    expect(token('emphasized')).toEqual([...ease.emphasized])
    expect(token('standard')).toEqual([...ease.standard])
    expect(token('gentle')).toEqual([...ease.gentle])
  })

  it('no cubic-bezier curve is typed out in a component (use ease.* from @/lib/motion)', () => {
    const typed = files.flatMap(file => {
      const text = fs.readFileSync(file, 'utf8')
      return [...text.matchAll(/\[\s*0?\.\d+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\]/g)]
        .filter(m => /\b(ease|easing|EASE|transition)\b/.test(text.slice(Math.max(0, m.index! - 80), m.index)))
        .map(m => `${rel(file)}:${text.slice(0, m.index).split('\n').length} ${m[0]}`)
    })
    expect(typed).toEqual([])
  })

  it('no element is animated by Framer and by a CSS transition on the same properties', () => {
    const fights = files.flatMap(file => {
      const text = fs.readFileSync(file, 'utf8')
      return [...text.matchAll(/<motion\.\w+\b([\s\S]*?)>/g)]
        .filter(m => /\btransition(-all|-transform|-opacity)?(?=[\s'"`])/.test(m[1]) && /\b(animate|whileHover|whileInView|whileTap)=|style=\{\{[^}]*\b(x|y|scale|opacity|rotate)\b/.test(m[1]))
        .map(m => `${rel(file)}:${text.slice(0, m.index).split('\n').length}`)
    })
    expect(fights).toEqual([])
  })
})
