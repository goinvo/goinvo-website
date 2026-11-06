export { useReducedMotion } from 'framer-motion'

/**
 * The site's motion curves, by name. Framer Motion takes them as arrays; CSS reads
 * the same curves from globals.css @theme (--ease-out-expo, --ease-emphasized,
 * --ease-standard, --ease-gentle). tests/motion-policy.test.ts keeps the two equal
 * and fails on a curve typed out anywhere else.
 */
export const ease = {
  /** Settles softly: scroll reveals, hovers, the homepage study's scenes. */
  outExpo: [0.22, 1, 0.36, 1],
  /** Large moves that should feel deliberate: the card transition, page collapse. */
  emphasized: [0.32, 0.72, 0, 1],
  /** Page fades and small interface changes. */
  standard: [0.4, 0, 0.2, 1],
  /** CSS's own `ease`, for the few places matching a CSS transition. */
  gentle: [0.25, 0.1, 0.25, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>
