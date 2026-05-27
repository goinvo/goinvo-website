import { describe, expect, it } from 'vitest'

import portableTextSchema from '../src/sanity/schemas/objects/portableText'

describe('Portable Text authoring', () => {
  it('exposes per-list bullet styles in the block toolbar', () => {
    const blockMember = portableTextSchema.of?.find((member) => member.type === 'block') as
      | { lists?: Array<{ title: string; value: string }> }
      | undefined

    expect(blockMember).toBeDefined()
    expect((blockMember?.lists || []).map((list) => list.value)).toEqual([
      'bullet',
      'plainBullet',
      'number',
    ])
    expect((blockMember?.lists || []).map((list) => list.title)).toEqual([
      'Star bullet',
      'Disc bullet',
      'Numbered',
    ])
  })

  it('gives column blocks one editor per visual column', () => {
    type SchemaMember = {
      name?: string
      type?: string
      fields?: SchemaMember[]
      of?: SchemaMember[]
      options?: { collapsible?: boolean; collapsed?: boolean }
      initialValue?: { columnContent?: unknown[] }
    }

    const columnsMember = portableTextSchema.of?.find((member) => member.name === 'columns') as
      | SchemaMember
      | undefined
    const columnContentField = columnsMember?.fields?.find((field) => field.name === 'columnContent')
    const columnMember = columnContentField?.of?.find((member) => member.name === 'column')
    const nestedContentField = columnMember?.fields?.find((field) => field.name === 'content')
    const legacyContentField = columnsMember?.fields?.find((field) => field.name === 'content')

    expect(columnContentField).toBeDefined()
    expect(columnsMember?.initialValue?.columnContent).toHaveLength(2)
    expect(nestedContentField?.of?.map((member) => member.name || member.type)).toEqual([
      'block',
      'image',
      'buttonGroup',
    ])
    expect(legacyContentField?.options).toMatchObject({ collapsible: true, collapsed: true })
  })

  it('authors iframe blocks as HTML embeds with code fields and preview input', () => {
    type SchemaMember = {
      name?: string
      title?: string
      type?: string
      fields?: SchemaMember[]
      components?: { input?: unknown }
      initialValue?: Record<string, unknown>
    }

    const embedMember = portableTextSchema.of?.find((member) => member.name === 'iframeEmbed') as
      | SchemaMember
      | undefined

    expect(embedMember?.title).toBe('HTML Embed')
    expect(embedMember?.components?.input).toBeDefined()
    expect(embedMember?.initialValue).toMatchObject({ embedMode: 'html' })

    const fields = embedMember?.fields || []
    expect(fields.map((field) => field.name)).toEqual([
      'embedMode',
      'html',
      'css',
      'js',
      'url',
      'caption',
      'aspectRatio',
      'height',
      'fullWidth',
    ])
    expect(fields.find((field) => field.name === 'html')?.components?.input).toBeDefined()
    expect(fields.find((field) => field.name === 'css')?.components?.input).toBeDefined()
    expect(fields.find((field) => field.name === 'js')?.components?.input).toBeDefined()
  })
})
