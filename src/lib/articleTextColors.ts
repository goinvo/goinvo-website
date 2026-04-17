export const ARTICLE_TEXT_COLOR_HEX = {
  teal: '#007385',
  orange: '#E36216',
  charcoal: '#24434d',
  gray: '#787473',
  blue: '#4a5e88',
} as const

export const ARTICLE_TEXT_COLOR_CLASS = {
  teal: 'text-secondary',
  orange: 'text-primary',
  charcoal: 'text-tertiary',
  gray: 'text-gray',
  blue: 'text-blue',
} as const

export type ArticleTextColor = keyof typeof ARTICLE_TEXT_COLOR_HEX

export function isArticleTextColor(value: unknown): value is ArticleTextColor {
  return typeof value === 'string' && value in ARTICLE_TEXT_COLOR_HEX
}
