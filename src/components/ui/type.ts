/**
 * The Human page's type scale. Every text style on the page comes from here, so
 * sizes stay on one ladder instead of being picked per element. Each token is a
 * complete style (size, line height, tracking): `cn` only joins strings, so an
 * element takes one token and never mixes two.
 *
 *   heading  44→88  serif   section headings
 *   title    32→48  serif   the prototype's name, the insight, service and case titles
 *   quote    24→30  serif   testimonials
 *   subhead  22→30  sans    the line under the hero
 *   lead     20→24  sans    prompts, intros, the situations you can pick
 *   body     18     sans    descriptions
 *   label    16     sans    small headings, links
 *   caption  14     sans    audiences, the footer
 *   nav      18→20  sans    the header links
 *
 * The hero headline and the big figures keep their own sizes: they are display
 * pieces, sized to the screen rather than to the text around them.
 *
 * The sizes themselves are design tokens in globals.css @theme (--text-heading,
 * --text-title, …), so every page can use the same scale as text-<name> classes.
 */
export const type = {
  heading: 'font-serif font-normal text-heading',
  title: 'font-serif font-normal text-title',
  quote: 'font-serif font-normal text-quote',
  subhead: 'text-subhead',
  lead: 'text-lead',
  /** Semibold, between body and lead, for the situations a reader picks from. */
  choice: 'text-choice font-semibold',
  body: 'text-body',
  label: 'text-label',
  caption: 'text-caption',
  nav: 'text-nav',
} as const
