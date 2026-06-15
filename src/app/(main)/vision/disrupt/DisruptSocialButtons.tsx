'use client'

import { type MouseEvent } from 'react'

/**
 * Disrupt! social share buttons — restored from the legacy markup
 * (`.social-buttons.end` in part-6.html). The migration carried over the CSS
 * (`disrupt.css` `.social-buttons` / `.social-buttons.end`) but dropped the
 * markup, so the buttons disappeared.
 *
 * Faithful-port notes:
 *  - Facebook, Twitter/X, LinkedIn only. The legacy Google+ button is omitted —
 *    Google+ shut down in 2019, so it would be a dead link.
 *  - Share URL updated from the old `/features/disrupt` path to `/vision/disrupt`.
 *  - The legacy *top-of-Part-1* `.social-container` was `display:none` in the old
 *    CSS (never visible), so only this end variant — the one the old site actually
 *    showed — is restored.
 */

const SHARE_URL = 'https://www.goinvo.com/vision/disrupt'
const SHARE_TITLE = 'Disrupt: Designing for Emerging Technologies'

const LINKS = {
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
  twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
    SHARE_URL,
  )}&hashtags=design,ux,iot,robotics&via=goinvo`,
  linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
    SHARE_URL,
  )}&title=${encodeURIComponent(SHARE_TITLE)}`,
}

// Open the share dialog in a centered popup (matches the legacy behavior).
function openShare(href: string, width: number, height: number) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    window.open(
      href,
      '',
      `menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=${height},width=${width}`,
    )
  }
}

export function DisruptSocialButtons() {
  return (
    <div className="social-buttons end">
      <a
        className="fb"
        href={LINKS.facebook}
        onClick={openShare(LINKS.facebook, 600, 600)}
        title="Share on Facebook"
        aria-label="Share on Facebook"
        rel="noopener noreferrer"
      >
        <svg version="1.1" viewBox="240 0 480 480">
          <path
            d="M1251.9,388.7h-44.2c-15.4,0-21.1,9.6-21.1,21.1V452h65.3l-7.7,73h-57.6v205.4h-86.4V525h-44.2v-73h44.2 v-42.2c0-49.9,17.3-88.3,86.4-90.2h65.3L1251.9,388.7L1251.9,388.7z"
            transform="translate(-674.000000, -285.000000)"
          />
        </svg>
      </a>
      <a
        className="twitter"
        href={LINKS.twitter}
        onClick={openShare(LINKS.twitter, 600, 400)}
        title="Share on Twitter"
        aria-label="Share on Twitter"
        rel="noopener noreferrer"
      >
        <svg version="1.1" viewBox="-467 230 25 21">
          <path d="M-444.9,233.3c1.1-0.7,1.9-1.7,2.3-2.9 c-1,0.6-2.1,1-3.3,1.3c-0.9-1-2.3-1.7-3.7-1.7c-2.8,0-5.1,2.4-5.1,5.3c0,0.4,0,0.8,0.1,1.2c-4.3-0.2-8-2.3-10.6-5.5 c-0.4,0.8-0.7,1.7-0.7,2.7c0,1.8,0.9,3.5,2.3,4.4c-0.8,0-1.6-0.3-2.3-0.7c0,0,0,0,0,0.1c0,2.6,1.8,4.7,4.1,5.2 c-0.4,0.1-0.9,0.2-1.4,0.2c-0.3,0-0.7,0-1-0.1c0.7,2.1,2.5,3.6,4.8,3.7c-1.8,1.4-4,2.3-6.4,2.3c-0.4,0-0.8,0-1.2-0.1 c2.3,1.5,5,2.4,7.9,2.4c9.4,0,14.6-8.1,14.6-15c0-0.2,0-0.5,0-0.7c1-0.7,1.9-1.7,2.6-2.7C-442.9,232.9-443.9,233.2-444.9,233.3z" />
        </svg>
      </a>
      <a
        className="in"
        href={LINKS.linkedin}
        onClick={openShare(LINKS.linkedin, 1000, 700)}
        title="Share on LinkedIn"
        aria-label="Share on LinkedIn"
        rel="noopener noreferrer"
      >
        <svg version="1.1" viewBox="-465.5 228 25 26">
          <rect height="11.7" width="3.8" x="-461.7" y="238" />
          <path d="M-459.8,236.4L-459.8,236.4c-1.3,0-2.1-0.9-2.1-2c0-1.2,0.8-2,2.1-2c1.3,0,2.1,0.9,2.1,2 C-457.7,235.5-458.5,236.4-459.8,236.4L-459.8,236.4z" />
          <path d="M-444.3,249.8h-3.8v-6.3c0-1.6-0.5-2.7-1.9-2.7c-1,0-1.7,0.7-1.9,1.4c-0.1,0.3-0.1,0.6-0.1,1v6.6h-3.8 c0,0,0.1-10.6,0-11.7h3.8v1.7c0.5-0.8,1.4-1.9,3.4-1.9c2.5,0,4.3,1.7,4.3,5.3V249.8L-444.3,249.8z" />
        </svg>
      </a>
    </div>
  )
}
