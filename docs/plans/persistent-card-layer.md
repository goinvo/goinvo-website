# Plan: one persistent card from preview to case-study header

Status: superseded in part (2026-11-06). M0 is done. The persistent layer (M1–M3) was NOT
built: the owner chose to refine the hand-off instead (see "Approach decision" below).
Decisions are recorded at the end.

## The behaviour we want

Clicking a prototype on the homepage study should not open a new page. The prototype
*itself* should move: it never disappears and is never swapped for another picture. It
settles as the case study's header, and the case study grows in below it. Back reverses
this. The reference is the portfolio site (`shirley-website-new`).

## How the portfolio site does it

- **One client layout.** `src/app/(portfolio)/layout.tsx` (a route group) renders the
  project grid, and every project page renders as `children` below it. Moving from the
  grid to a project keeps the layout and the grid mounted. Only `children` changes.
- **The card is one DOM node.** `ProjectCard` restyles in place into the compact
  case-study header (width, padding, title size). The other cards and sections collapse
  to height 0, and the article mounts below the card inside `AnimatePresence`.
- **A four-phase machine in the layout.** `idle → collapsing → open → closing`. Every async
  step checks an operation token. A route intent tags expected pushes. The pathname is the
  source of truth for Back/Forward. Each project page leaves through `navigateHome()`.
- **Tests.** `tests/portfolio-transition-chaos.spec.ts` (Playwright) covers Back during
  open and close, stale card-opens, same-path history, focus and `inert`, and reduced motion.

## How this site is structured today

```
src/app/(main)/layout.tsx
└─ HeroProvider
   ├─ Header                         persists across routes
   ├─ PersistentHero                 persists; shows a hero image per route (HeroContext)
   └─ TransitionLayout
      └─ PageTransitionProvider      the card machine (PageTransitionContext)
         ├─ TransitionContent
         │  └─ AnimatePresence mode="wait"
         │     └─ motion.main key={pathname}     ← REPLACED on every route change
         │        └─ FrozenRouter → the page     (concept page, /work grid, case study…)
         ├─ Footer
         ├─ CardTransitionOverlay    persists; draws the moving copy
         └─ SectionMorphOverlay
```

Only what sits **outside `<main>`** survives a navigation: the header, `PersistentHero`, the
overlays and the providers. The homepage study, its live prototype (an iframe), the `/work`
grid and every case study live **inside** `<main>`, so they unmount when the route changes.

The concept page joined this layout on 2026-11-06, so it now shares the site layout with the
case studies. But the shared layout does not hold the clicked element. Today's transition
(built the same day) is therefore a **clone hand-off**:

1. A fixed overlay draws a *still screenshot* of the prototype at the preview's position and
   moves it into a header frame (`caseHeaderFrame`).
2. The concept page unmounts under a white backdrop. The case study mounts and draws the
   same still in the same frame (`KeptCaseHeader`).
3. The overlay lifts off. The hand-off measures 0px, but it is two elements, and the live
   prototype becomes a picture the moment you click.

### Bug found while mapping this (fix first)

After Back from a case study opened by a prototype, the concept page gets a 450px
`PersistentHero` strip that pushes it down 500px. The cause has two parts:

- During the exit animation, `FrozenRouter` keeps the case study mounted, and it still
  re-renders. Its "opened from a kept card" flag (`kept`) is read live from the current
  pathname, so on Back it flips off. The page then switches to its normal hero and calls
  `setCurrentHero(<its image>)`.
- `HeroContext`'s `SET_CURRENT_HERO` does not check which route is asking. So a page that
  is leaving can write its hero onto the page that is arriving.

## Options

| | Approach | Verdict |
|---|---|---|
| A | **A persistent card layer in `(main)/layout.tsx`**, beside `PersistentHero`. It owns the one card element. Pages only reserve *slots* where the card should sit. | **Recommended.** It matches the portfolio site's model (one node that moves while pages change under it). It fits this codebase, which already persists `PersistentHero` the same way, and it leaves the site's routes alone. |
| B | A route-group client layout like the portfolio site: the concept page and case studies as `children` of one layout that renders the preview. | Case studies are site-wide pages (`/work/[slug]`) reached from the grid, search and links, and the `/work` grid is its own page. Re-homing them under a new layout touches the whole site for one entry point. |
| C | Keep the clone hand-off. | It already reads close. It is still a swap, though, and it loses the live prototype at the click. |

## Design (option A)

1. **`CardStage`** (new, `src/components/layout/CardStage.tsx`). It is mounted in
   `(main)/layout.tsx` next to `PersistentHero`, outside `<main>`. It renders the one card:
   for the homepage study, the live `WorkPrototype`, and later, a work-grid card's image.
2. **Slots, not portals.** A page declares where the card belongs:
   - `<CardSlot name="preview" />` in the homepage study's preview area.
   - `<CardSlot name="header" />` at the top of the case study (this replaces `KeptCaseHeader`).

   A slot is an empty box at the card's size, and it carries the accessible link and the
   hover zone. The stage keeps the card on top of the active slot's rectangle.

   *Why not a portal:* moving an iframe to another parent reloads it, so the card must
   never change parents.
3. **The concept page renders its preview through the stage from first paint.** Then there
   is a single element before any click. This is the real structural change. Hover-to-
   explode, scroll-to-explode and the loading bar drive the stage's card through context.
4. **Machine (existing `PageTransitionContext`, extended).** Same phases, plus where the card
   lives (`home: 'origin' | 'case' | null`):
   - `collapsing`: the card moves from the preview slot to the header frame, and the old
     page folds away under it.
   - `navigating` → `open`: the case study mounts its header slot under the card, and its
     content reveals **below the slot**.
   - `idle` on the case study: the card **stays** as the header. It is not removed.
   - `closing` (Back): the card moves from the header slot back to the restored preview
     slot and stays there as the preview.
   - Leaving the case study for any other page: the card leaves with it (fade).
5. **Positioning.** The stage is `position: fixed` and follows the active slot's
   `getBoundingClientRect()`:
   - during a transition, on every animation frame;
   - at rest, on scroll and resize.

   One element, so it is cheap. The homepage's sticky scroll scene needs the per-frame
   sync while scrolling.
6. **`HeroContext`.**
   - `PersistentHero` stays hidden on a route whose header is the card.
   - `SET_CURRENT_HERO` ignores writes from a route that is not current.
   - `kept` is captured once when a page mounts, never read live.

   Together these fix the bug above at its root.
7. **Reduced motion.** The machine runs with no delays, and the card jumps between slots
   with no movement. **Slow connections:** the card is the still, as today.
8. **Focus and accessibility.** The current rules stay (focus the case study's h1 on
   arrival, and the opening link on return). The stage is `aria-hidden` and the slot holds
   the link.
9. **Later:** `/work` grid cards adopt the same stage, and `CardTransitionOverlay` retires.

## Milestones

Each milestone ends with `scripts/verify-human-home-story.mjs`, `scripts/verify-card-transitions.mjs`
and `tests/page-transition-machine.test.ts` green.

| | Milestone | Done when | Est. |
|---|---|---|---|
| M0 | Fix the bug above. Fix the open check failures: phase order, subline fit at 1265×714, scroll-restore stability. | No `PersistentHero` on the homepage study after any sequence; all suites green. | 0.5 d |
| M1 | `CardStage` + `CardSlot`. The homepage study renders its preview through the stage; no transition change yet. | All 669 page checks pass with the preview in the stage; the card sits on its slot within 1px at 3 sizes while scrolling. | 1 d |
| M2 | Forward transition with one persistent node. The case study renders a header slot. Remove the clone for kept cards. | A check stamps the card node and finds the same node before and after opening; content appears below the card. | 1 d |
| M3 | Back into the preview slot, scroll restore, focus, Forward, rapid history. | The chaos suite passes with the persistence stamp added to every scenario. | 0.5–1 d |
| M4 | Leaving the case study, direct visits and reloads. | A direct visit or reload of `/work/prior-auth` shows its normal hero; leaving for another page removes the card. | 0.5 d |
| M5 | `/work` grid cards on the stage; retire `CardTransitionOverlay`. | The grid scenarios pass with node persistence; the other-pages sweep is unchanged. | 1–1.5 d |
| M6 | Hardening: mobile, slow connection, performance (frame loop only while moving or scrolling), CLAUDE.md. | Suites green at 390 and 768 widths; no frame loop at rest. | 0.5 d |

## Tests to add

- **Persistence:** a `data-card-node` stamp set when the stage element mounts must be
  unchanged across open → case study → Back.
- **Alignment:** the card's rectangle equals its slot's rectangle (±1px) at rest on both
  pages, at 3 sizes, and while the homepage scroll scene moves.
- **Integrity:** no `PersistentHero` on the homepage study after any sequence. A direct
  visit or reload of a case study shows its normal hero.
- **Existing coverage:** every chaos scenario, plus the other-pages sweep.

## Decisions (owner, 2026-11-06)

1. **Prototype case studies always use the prototype as their header,** including on direct
   visits and reloads. Today that means Clinical Evidence Engine, Prior Authorization and
   Ipsos Facto. Which case studies have one is data (a slug → prototype registry), so others
   can opt in later. This removes the "kept only when you arrived by clicking" state; the
   machine still carries the motion.
2. **`/work` grid cards move the same way (M5),** and it should feel smooth and modern.
3. **Full width where possible.** The header is a full-width band in the prototype's own
   background colour, at the design's proportions, capped at about 70% of the screen height.
   The design is scaled to fit inside it, so the card visibly morphs out to the edges without
   cropping. Where the band would be too short to read the design (small screens), it stays
   constrained.

## Approach decision (owner, 2026-11-06)

M1's mechanics showed a real cost to the persistent layer. A layer outside `<main>` has to
follow the preview with JavaScript, and browsers scroll on a separate thread, so it lags a
frame on fast scrolls of the homepage. It also forces the page behind it to be transparent
and needs a server-rendered stand-in. View Transitions (already enabled) were the other
option, but they would fight the site's framer page swap. The owner chose to **refine the
hand-off**. What it now does:

- **The design moves; nothing is swapped.** Two layers move together: the band (the
  design's canvas colour) grows from the preview out to full width, and the design glides
  into its fitted place inside it. The case study draws the same band and design with pure
  CSS (`KeptCaseHeader`). Measured gap at hand-off: 0px at 390, 768, 1265, 1440 and 1700.
- **The geometry has one source.** `caseHeaderFrame` (the overlay) and `KeptCaseHeader` (the
  page, in CSS) compute the same boxes. The chaos suite measures the gap.
- **Prototype headers are data:** `src/lib/prototypeHeaders.ts`, keyed by slug, off in
  production until the stills move to `public/`.
- **Work-grid cards** for prototype case studies morph into the same band, with the card's
  photo fading into the design. Other cards keep the photo hero.
- **Done from M0:** a page that is leaving can no longer set the hero (`SET_CURRENT_HERO` takes
  `forPath`), and Back restores the grid's scroll for the length of the reverse morph.
- **Accepted compromise:** the live prototype becomes its still at the click. They look the
  same.
