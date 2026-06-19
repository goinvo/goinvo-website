import { describe, expect, it } from 'vitest'
import {
  CUSTOM_COMPONENTS,
  CUSTOM_COMPONENT_OPTIONS,
  isKnownCustomComponentName,
  normalizeCustomComponentName,
  resolveCustomComponentName,
} from '@/lib/customComponents'

describe('custom component registry', () => {
  it('exposes a {title, value} option per component for the Studio dropdown', () => {
    expect(CUSTOM_COMPONENT_OPTIONS).toHaveLength(CUSTOM_COMPONENTS.length)
    for (const option of CUSTOM_COMPONENT_OPTIONS) {
      expect(typeof option.title).toBe('string')
      expect(option.title.length).toBeGreaterThan(0)
      expect(typeof option.value).toBe('string')
    }
  })

  it('resolves canonical names to themselves', () => {
    for (const { value } of CUSTOM_COMPONENTS) {
      expect(resolveCustomComponentName(value)).toBe(value)
      expect(isKnownCustomComponentName(value)).toBe(true)
    }
  })

  it('resolves a PascalCase name the way the renderer does (first letter lowercased)', () => {
    // The legacy published Ipsos doc stored "IpsosWorkflowWidget" (capital I);
    // it must still both render and validate so existing content is never broken.
    expect(resolveCustomComponentName('IpsosWorkflowWidget')).toBe('ipsosWorkflowWidget')
    expect(isKnownCustomComponentName('IpsosWorkflowWidget')).toBe(true)
  })

  it('resolves every declared alias to its canonical value', () => {
    for (const component of CUSTOM_COMPONENTS) {
      for (const alias of component.aliases ?? []) {
        expect(resolveCustomComponentName(alias)).toBe(component.value)
      }
    }
  })

  it('trims surrounding whitespace before resolving', () => {
    expect(resolveCustomComponentName('  ipsosFlowWidget  ')).toBe('ipsosWorkflowWidget')
  })

  it('treats unknown / empty / nullish names as not renderable', () => {
    for (const bad of ['bogusName', 'IpsosWorkflowWidgetX', '', '   ', null, undefined]) {
      expect(resolveCustomComponentName(bad)).toBeNull()
      expect(isKnownCustomComponentName(bad)).toBe(false)
    }
  })

  it('normalizes names without throwing on nullish input', () => {
    expect(normalizeCustomComponentName(undefined)).toBe('')
    expect(normalizeCustomComponentName('Foo')).toBe('foo')
  })
})
