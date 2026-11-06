# One design approach across the site

Status: steps 1–4 done 2026-11-06, all behind the review switch; step 5 (make it the default)
waits for owner approval.

## Why

Every page currently designs itself. The Work, About and Vision pages use the Gatsby-era
treatment: a photo with a white box over it, light-weight Jenson, uppercase grey labels and
teal links. Services is its own system with its own serif (EB Garamond) and a dark hero.
The homepage study is a third approach: an editorial scale, regular-weight Jenson, sentence
case, ink links and quiet scroll motion. Consistent tokens are not enough when each page
still hand-builds its opening, section rhythm, headings, links, cards and reveals.

The fix is one **design approach**, the homepage study's, expressed as a small vocabulary of
components. Pages compose those components and keep their own structure and content.

## Foundation (done 2026-11-06, no visual change; verified by pixel diff of 10 pages × 2 widths)

- **Cascade:** `@layer theme, base, components, utilities, content`. Component classes are
  overridable by utilities. Context rules that style rendered content (article paragraphs,
  legacy features) sit after utilities on purpose.
- **Type tokens** in `@theme`: `text-heading`, `text-page-title`, `text-title`, `text-quote`,
  `text-subhead`, `text-lead`, `text-choice`, `text-body`, `text-label`, `text-caption`,
  `text-nav`.
- **Motion tokens:** `--ease-*` in CSS and `ease.*` in `src/lib/motion.ts`, with one
  reduced-motion hook. `tests/motion-policy.test.ts` keeps them in step and forbids
  hand-typed curves and Framer/CSS transition fights.
- **Snapshot diff:** `scripts/visual-snapshot.mjs` captures and compares pages. Use it
  before and after any change meant to be invisible.

## The vocabulary (proposed)

| Component | Replaces | Notes |
|---|---|---|
| `PageIntro` | The white box over a photo; hand-built hero titles | An optional label, a page title (`text-page-title`), a lead (`text-lead`) and optional media below or beside. Every page opens the same way. |
| `Section` | Ad-hoc `py-*` and backgrounds | Spacing rhythm and one of three tones: white, cool grey or ink. |
| `SectionHeading` | `header-lg` / `header-xl` / uppercase `header-md` mixes | A serif title, an optional sentence-case label and an optional lead. |
| `TextLink` | Teal links, arrow links in five styles | Ink, underline on hover, optional arrow. |
| `Button` | `btn-primary`, `button--secondary`, page-local buttons | Orange for the one main action per page; everything else is a `TextLink`. |
| `WorkCard` | `CaseStudyCard` and `ui/Card` (two card designs) | One card; keeps the transition hooks (`data-card-image`). |
| `Reveal` | Several reveal helpers (`useScrollReveal`, `ui/Reveal`, `ArticleReveal`, `storyMotion`) | One quiet reveal, visible from the server, respecting the motion preference. |
| `Figure` | Raw images and captions | Media with an optional caption and teal edge, as in the homepage callouts. |

Legacy Vision feature microsites (20 ported stylesheets) stay as they are. They are scoped,
guarded by `tests/page-css-scoping.test.ts`, and rewriting them has no payoff.

## Rollout

All of this sits behind the review switch (`?design=human`; off in production). Components
read tokens, and the switch flips token values plus a few structural choices, so the classic
site stays identical until approval.

1. Build the vocabulary and refactor the homepage study onto it (no visual change; prove it
   by diff).
2. **Work grid and case studies:** `PageIntro`, `Section`, `WorkCard`, `TextLink`.
3. **Services:** onto shared tokens and Jenson; keep its sections and its dark opening as a
   `Section` with the ink tone.
4. About, Vision, Contact and the current homepage.
5. Make the switch the default, then delete the classic branches.

## What was built (2026-11-06)

- **Vocabulary in `src/components/ui`.** `Section`, `SectionHeading`, `TextLink` and `InlineLink`,
  `Arrow`, `Label`, the type scale (`ui/type.ts`), `ReadAlong` (moved from home-story) and a
  `settle` style on the existing `Reveal`. The homepage study now uses them, with no visual change
  (pixel diff 0%). The 15 hand-styled uppercase labels on Work, About, the case-study layout and
  Vision are now `<Label>`.
- **The human mode** is `src/app/design-human.css`: rules under `html[data-design="human"]` in
  the `content` layer (after utilities, so they can override `font-light` and similar), sized only
  by the `--text-*` tokens. It changes:
  - page openings: the title and lead move below the photo, with no white box;
  - case studies: a larger title, 18px ink body text and ink links;
  - Work: the filter band and the card titles;
  - every `header-*` heading and every `Label`;
  - Services: Jenson instead of EB Garamond, regular weight and sentence-case eyebrows. These
    rules are unlayered because services.css is.
- **Classic is untouched.** Verified by pixel diff of 10 pages at 2 widths after every step; the
  remaining differences are known noise (an A/B homepage, embeds loading, text anti-aliasing).
- **Not changed, on purpose.**
  - The current homepage: a running A/B experiment, which restyling would spoil.
  - The 20 legacy Vision feature pages.
  - The Contact form card.
  - The site header: it is already the same on every page.

## Still to do

- **Step 5:** make `human` the default (needs approval), then delete the classic branches. The
  `header-*` classes can then take the human values directly, and `design-human.css` shrinks to
  nothing.
- **One work card:** fold `ui/Card` into `CaseStudyCard`. They are still two designs; Vision cards
  use the former.
- **One reveal:** move `ArticleReveal` and the home-story reveals onto `ui/Reveal`.
