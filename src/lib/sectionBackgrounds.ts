export const sectionBackgroundOptions = [
  { title: 'White (default)', value: 'white' },
  { title: 'Gray', value: 'gray' },
  { title: 'Warm', value: 'warm' },
  { title: 'Teal', value: 'teal' },
  { title: 'Blue', value: 'blue' },
  { title: 'Orange', value: 'orange' },
] as const

export type SectionBackground = (typeof sectionBackgroundOptions)[number]['value']

const sectionBackgroundClassNames: Record<Exclude<SectionBackground, 'white'>, string> = {
  gray: 'bg-gray-light',
  warm: 'bg-cream',
  teal: 'bg-[#e5f5f5]',
  blue: 'bg-blue-light',
  orange: 'bg-primary-lightest',
}

export function isSectionBackground(value: string | null | undefined): value is SectionBackground {
  return sectionBackgroundOptions.some(option => option.value === value)
}

export function resolveSectionBackground(
  value: string | null | undefined,
  fallback: SectionBackground = 'white'
): SectionBackground {
  return isSectionBackground(value) ? value : fallback
}

export function getSectionBandClassName(value: string | null | undefined): string {
  const background = resolveSectionBackground(value)
  return background === 'white' ? '' : sectionBackgroundClassNames[background]
}
