/**
 * Print size per piece, in standard US frame sizes (Shirley, 2026-08-12).
 *
 * Derived from the page geometry of each shipped PDF, then snapped to the
 * nearest sheet Amazon actually stocks (11x14, 16x20, 18x24, 20x30, 24x36,
 * 27x40) in the artwork's own orientation. Most pieces letterbox into their
 * sheet rather than matching it exactly, which is why every figure is hedged
 * with "about".
 *
 * Two entries are NOT derived: determinants-of-health and
 * healthcare-is-a-human-right are what the shop already stated, kept as-is
 * because they are the only sizes anyone has confirmed. Both are standard
 * sheets, and neither matches its own file's proportions (Determinants is a
 * 42x50 in file sold as a 24x36 print) - which is the evidence that these are
 * print decisions rather than something readable off the artwork.
 *
 * Eight pieces are deliberately absent. Two are books, not posters (Own Your
 * Health Data, the Open Source Healthcare Journal). Six are banner-shaped and
 * fit no stock sheet within a quarter of their size - HIE Data Access Workflow
 * is nearly 5:1, Care Planning Process is 7 x 32 in. Claiming a frame size for
 * those would be a promise we cannot keep, so their cards show no size at all.
 */
export const PRINT_SIZE_BY_SLUG: Record<string, string> = {
  'care-plans-ecosystem': 'about 40 × 27 in',
  'data-interop': 'about 24 × 36 in',
  'determinants-of-health': 'about 24 × 36 in',
  'determinants-of-health-spanish': 'about 24 × 36 in',
  'examine-yourself': 'about 27 × 40 in',
  'health-payment-system-complexity': 'about 36 × 24 in',
  'healthcare-dollars': 'about 24 × 18 in',
  'healthcare-is-a-human-right': 'about 11 × 14 in',
  'how-to-vote-early': 'about 11 × 14 in',
  'let-data-scream': 'about 24 × 36 in',
  'make-things': 'about 27 × 40 in',
  'open-healthcare-systems': 'about 16 × 20 in',
  'precision-autism': 'about 36 × 24 in',
  'prototype-like-crazy': 'about 24 × 36 in',
  'sdoh-spend': 'about 24 × 36 in',
  'sources-of-clinical-data': 'about 16 × 20 in',
  'sources-of-data': 'about 16 × 20 in',
  'sugar-kills': 'about 27 × 40 in',
  'test-treat-trace': 'about 24 × 18 in',
  'vapepocolypse': 'about 24 × 18 in',
  'virtual-care-encounters': 'about 18 × 24 in',
  'washhands': 'about 14 × 11 in',
  'who-uses-my-health-data': 'about 40 × 27 in',
}
