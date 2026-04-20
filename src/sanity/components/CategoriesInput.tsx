import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  PatchEvent,
  insert,
  set,
  setIfMissing,
  unset,
  useClient,
  type ArrayOfObjectsInputProps,
  type Reference,
} from 'sanity'

type CategoryDoc = {
  _id: string
  title: string
  isMainCategory?: boolean | null
  filterOrder?: number | null
}

type ReferenceValue = Reference & { _key: string }

const ADD_NEW_SENTINEL = '__add_new_category__'

function nextKey() {
  return Math.random().toString(36).slice(2, 10)
}

function publishedId(id: string) {
  return id.replace(/^drafts\./, '')
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

/**
 * Array-of-references input with a grouped picker.
 *
 * Replaces the default reference-picker experience for the `categories`
 * field on Case Study. The picker is a native <select> with two
 * <optgroup> labels — "Main Categories" and "Additional Categories" —
 * so editors get the grouping/ordering the reference input doesn't
 * ship with out of the box.
 *
 * Already-selected categories render as chips above the picker with
 * remove buttons, mirroring the default array UI.
 */
export function CategoriesInput(props: ArrayOfObjectsInputProps) {
  const { value = [], onChange } = props
  const client = useClient({ apiVersion: '2024-01-01' })
  const [categories, setCategories] = useState<CategoryDoc[]>([])

  useEffect(() => {
    let cancelled = false
    client
      .fetch<CategoryDoc[]>(
        `*[_type == "category"] | order(isMainCategory desc, filterOrder asc, title asc){ _id, title, isMainCategory, filterOrder }`,
      )
      .then((docs) => {
        if (!cancelled) setCategories(docs)
      })
      .catch(() => {
        /* ignore — picker stays empty and the Sanity default input is always reachable via fallback */
      })
    return () => {
      cancelled = true
    }
  }, [client])

  const selectedRefs = useMemo(() => {
    return (value as ReferenceValue[] | undefined) || []
  }, [value])

  const selectedIds = useMemo(
    () => new Set(selectedRefs.map((r) => publishedId(r._ref))),
    [selectedRefs],
  )

  // Key by the published id so references (which always use the published
  // id) resolve correctly even when useClient returns drafts-perspective
  // category docs (whose _id is "drafts.<baseId>"). Prefer a draft entry
  // over the published one if both exist so in-progress edits show.
  const categoriesById = useMemo(() => {
    const map = new Map<string, CategoryDoc>()
    for (const c of categories) {
      const base = publishedId(c._id)
      const existing = map.get(base)
      if (!existing || c._id.startsWith('drafts.')) {
        map.set(base, c)
      }
    }
    return map
  }, [categories])

  const available = useMemo(() => {
    const main: CategoryDoc[] = []
    const additional: CategoryDoc[] = []
    const seen = new Set<string>()
    for (const c of categories) {
      const base = publishedId(c._id)
      if (seen.has(base)) continue
      seen.add(base)
      if (selectedIds.has(base)) continue
      if (c.isMainCategory) main.push(c)
      else additional.push(c)
    }
    return { main, additional }
  }, [categories, selectedIds])

  const handleAdd = useCallback(
    (categoryId: string) => {
      if (!categoryId) return
      const ref: ReferenceValue = {
        _type: 'reference',
        _ref: publishedId(categoryId),
        _key: nextKey(),
      }
      onChange(PatchEvent.from([setIfMissing([]), insert([ref], 'after', [-1])]))
    },
    [onChange],
  )

  const handleAddNew = useCallback(async () => {
    const raw = typeof window !== 'undefined' ? window.prompt('Name for the new category') : null
    const title = raw?.trim()
    if (!title) return
    const slug = slugify(title)
    if (!slug) {
      if (typeof window !== 'undefined') {
        window.alert('Name must include at least one letter or number.')
      }
      return
    }
    try {
      const existing = await client.fetch<CategoryDoc | null>(
        `*[_type == "category" && slug.current == $slug][0]{_id, title, isMainCategory, filterOrder}`,
        { slug },
      )
      let categoryId: string
      if (existing) {
        categoryId = existing._id
        setCategories((prev) => {
          const base = publishedId(existing._id)
          if (prev.some((c) => publishedId(c._id) === base)) return prev
          return [...prev, existing]
        })
      } else {
        const created = await client.create({
          _type: 'category',
          title,
          slug: { _type: 'slug', current: slug },
          isMainCategory: false,
        })
        categoryId = created._id
        setCategories((prev) => [
          ...prev,
          {
            _id: created._id,
            title,
            isMainCategory: false,
            filterOrder: null,
          },
        ])
      }
      handleAdd(categoryId)
    } catch (err) {
      console.error('Failed to create new category', err)
      if (typeof window !== 'undefined') {
        window.alert('Could not create the category. Check the console for details.')
      }
    }
  }, [client, handleAdd])

  const handleRemove = useCallback(
    (key: string) => {
      onChange(PatchEvent.from(unset([{ _key: key }])))
    },
    [onChange],
  )

  const handleClear = useCallback(() => {
    onChange(PatchEvent.from(set([])))
  }, [onChange])

  const mainSelected = selectedRefs.filter(
    (r) => categoriesById.get(publishedId(r._ref))?.isMainCategory,
  )
  const additionalSelected = selectedRefs.filter((r) => {
    const cat = categoriesById.get(publishedId(r._ref))
    return cat && !cat.isMainCategory
  })
  const unresolvedSelected = selectedRefs.filter(
    (r) => !categoriesById.has(publishedId(r._ref)),
  )

  const noAvailable = available.main.length === 0 && available.additional.length === 0
  const hasAnySelected = selectedRefs.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {hasAnySelected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {mainSelected.length > 0 && (
            <GroupChips
              label="Main Categories"
              accent="#E36216"
              items={mainSelected.map((ref) => ({
                key: ref._key,
                title: categoriesById.get(ref._ref)?.title || ref._ref,
              }))}
              onRemove={handleRemove}
            />
          )}
          {additionalSelected.length > 0 && (
            <GroupChips
              label="Additional Categories"
              accent="#007385"
              items={additionalSelected.map((ref) => ({
                key: ref._key,
                title: categoriesById.get(ref._ref)?.title || ref._ref,
              }))}
              onRemove={handleRemove}
            />
          )}
          {unresolvedSelected.length > 0 && (
            <GroupChips
              label="Unresolved references"
              accent="#9a3412"
              items={unresolvedSelected.map((ref) => ({
                key: ref._key,
                title: `(missing: ${ref._ref})`,
              }))}
              onRemove={handleRemove}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <select
          value=""
          onChange={(e) => {
            const id = e.target.value
            const el = e.currentTarget
            el.value = ''
            if (id === ADD_NEW_SENTINEL) {
              void handleAddNew()
            } else if (id) {
              handleAdd(id)
            }
          }}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid var(--card-border-color, #d1d5db)',
            background: 'var(--card-bg-color, #fff)',
            color: 'var(--card-fg-color, inherit)',
          }}
        >
          <option value="" disabled>
            {noAvailable
              ? 'All existing categories added — pick Other… to create a new one'
              : hasAnySelected
                ? 'Add another category…'
                : 'Select a category…'}
          </option>
          {available.main.length > 0 && (
            <optgroup label="Main Categories">
              {available.main.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          )}
          {available.additional.length > 0 && (
            <optgroup label="Additional Categories">
              {available.additional.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Create">
            <option value={ADD_NEW_SENTINEL}>Other… (create new category)</option>
          </optgroup>
        </select>
        {hasAnySelected && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid var(--card-border-color, #d1d5db)',
              background: 'transparent',
              color: 'var(--card-muted-fg-color, #6b7280)',
              cursor: 'pointer',
            }}
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}

function GroupChips({
  label,
  accent,
  items,
  onRemove,
}: {
  label: string
  accent: string
  items: { key: string; title: string }[]
  onRemove: (key: string) => void
}) {
  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--card-muted-fg-color, #6b7280)',
          marginBottom: '4px',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {items.map((item) => (
          <span
            key={item.key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              border: `1px solid ${accent}`,
              background: 'var(--card-bg-color, #fff)',
              color: 'var(--card-fg-color, inherit)',
              fontSize: '13px',
            }}
          >
            {item.title}
            <button
              type="button"
              onClick={() => onRemove(item.key)}
              aria-label={`Remove ${item.title}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '16px',
                height: '16px',
                border: 'none',
                background: 'transparent',
                color: accent,
                fontSize: '16px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
