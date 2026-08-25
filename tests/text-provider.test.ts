import { afterEach, describe, expect, it } from 'vitest'

import { resolveProviderName } from '@/lib/marketing/textProvider'

const original = process.env.MARKETING_LLM_PROVIDER

afterEach(() => {
  if (original === undefined) delete process.env.MARKETING_LLM_PROVIDER
  else process.env.MARKETING_LLM_PROVIDER = original
})

describe('resolveProviderName', () => {
  it('defaults to none, so no script can spend money by accident', () => {
    delete process.env.MARKETING_LLM_PROVIDER
    expect(resolveProviderName()).toBe('none')
  })

  it('requires the paid provider to be asked for explicitly', () => {
    delete process.env.MARKETING_LLM_PROVIDER
    expect(resolveProviderName('anthropic')).toBe('anthropic')
    process.env.MARKETING_LLM_PROVIDER = 'anthropic'
    expect(resolveProviderName()).toBe('anthropic')
  })

  it('accepts ollama and ignores anything it does not recognise', () => {
    expect(resolveProviderName('ollama')).toBe('ollama')
    expect(resolveProviderName('OLLAMA')).toBe('ollama')
    // A typo must not silently become the paid path.
    expect(resolveProviderName('anthropicc')).toBe('none')
    expect(resolveProviderName('gpt4')).toBe('none')
  })

  it('lets an explicit choice beat the environment', () => {
    process.env.MARKETING_LLM_PROVIDER = 'anthropic'
    expect(resolveProviderName('ollama')).toBe('ollama')
  })
})
