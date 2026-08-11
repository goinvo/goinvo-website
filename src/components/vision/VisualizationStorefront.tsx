'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PRINT_UNAVAILABLE_SLUGS,
  SHOP_SHIPPING_PRICE_CENTS,
  shopPriceCentsFor,
} from '@/lib/shop/checkout'

export type VisualizationPrint = {
  _id: string
  title: string
  slug?: string
  caption?: string
  date?: string
  downloadLink?: string
  learnMoreLink?: string
  imageUrl?: string
  price?: number
  currency?: string
  checkoutUrl?: string
  fulfillment?: 'in-stock' | 'print-on-demand'
}

type CollectionId =
  | 'all'
  | 'design-axioms'
  | 'health-cards'
  | 'health-data'
  | 'care-systems'
  | 'public-health'
  | 'design-culture'
type DonationChoice = '0' | '5' | '15' | '30' | 'custom'
type CheckoutAvailability = {
  loaded: boolean
  enabled: boolean
  mode: 'test' | 'live' | null
}
type SelectedPrint = {
  item: VisualizationPrint
  quantity: number
}

const collections: Array<{ id: CollectionId; label: string }> = [
  { id: 'all', label: 'All designs' },
  { id: 'design-axioms', label: 'Design Axioms' },
  { id: 'health-cards', label: 'Health Cards' },
  { id: 'health-data', label: 'Health & data' },
  { id: 'care-systems', label: 'Care systems' },
  { id: 'public-health', label: 'Public health' },
  { id: 'design-culture', label: 'Design culture' },
]

const collectionSlugs: Record<Exclude<CollectionId, 'all'>, string[]> = {
  'design-axioms': ['make-things', 'let-data-scream', 'prototype-like-crazy'],
  'health-cards': [
    'healthcare-is-a-human-right',
    'examine-yourself',
    'sugar-kills',
  ],
  'health-data': [
    'own-your-health-data',
    'who-uses-my-health-data',
    'health-payment-system-complexity',
    'insuring-price-increase',
    'healthcare-dollars',
    'determinants-of-health-spanish',
    'determinants-of-health',
    'open-healthcare-systems',
    'open-source-healthcare',
    'hie-data-access',
    'sources-of-clinical-data',
    'sources-of-data',
    'sdoh-spend',
    'data-interop',
  ],
  'care-systems': [
    'precision-autism',
    'test-treat-trace',
    'virtual-care-encounters',
    'ebola',
    'care-plans-process',
    'shr-medical-encounter',
    'care-plans-ecosystem',
  ],
  'public-health': [
    'how-to-vote-early',
    'washhands',
    'vapepocolypse',
    'healthcare-is-a-human-right',
    'examine-yourself',
    'sugar-kills',
  ],
  'design-culture': [
    'critical-mass',
    'make-things',
    'let-data-scream',
    'prototype-like-crazy',
  ],
}

/**
 * Per-item overrides (Jon's feedback, 2026-08-07): not everything is a poster.
 * Own Your Health Data is a comic book; the Open Source Healthcare Journal is a
 * magazine we may be out of, so its print isn't orderable right now.
 */
const BUY_LABEL_BY_SLUG: Record<string, string> = {
  // "Buy Comic Book" did not fit the button (Jon, 2026-08-10).
  'own-your-health-data': 'Buy Comic',
}

/**
 * Printed sizes for the pieces the studio keeps in stock (Jon's note,
 * 2026-08-07). Jon gave these from memory, so they are stated as approximate
 * until someone measures the actual stock.
 */
const PRINT_SIZE_BY_SLUG: Record<string, string> = {
  'determinants-of-health': 'about 24 × 36 in',
  'healthcare-is-a-human-right': 'about 11 × 14 in',
}

/** The launch band: complete posters, no crops (Jon's feedback, 2026-08-05). */
const FEATURED_SLUGS = {
  hero: 'determinants-of-health',
  second: 'own-your-health-data',
  third: 'healthcare-dollars',
  fourth: 'sugar-kills',
} as const

/** Curated sets that are designed to be used together, not browsed one-off. */
const SERIES: Array<{ id: Exclude<CollectionId, 'all'>; label: string; blurb: string }> = [
  {
    id: 'design-axioms',
    label: 'Design Axioms',
    blurb: 'Practical principles for creating usable, elegant interfaces.',
  },
  {
    id: 'health-cards',
    label: 'Health Cards',
    blurb: 'Simple, direct reminders for healthier everyday choices.',
  },
]

/**
 * Catalog grouping for the unfiltered view: every item lands in its FIRST
 * matching section (some belong to multiple filter collections; grouping must
 * not duplicate cards). Order chosen so each section keeps a sensible size.
 */
const CATALOG_SECTIONS: Array<{ id: Exclude<CollectionId, 'all'>; blurb: string }> = [
  // These must not restate the Collections cards higher up the page, which
  // already describe Design Axioms and Health Cards. Saying nearly the same
  // sentence twice on one page is the repetition Juhan objected to; say what
  // the set is FOR instead.
  { id: 'design-axioms', blurb: 'Put them up where the work happens.' },
  { id: 'health-cards', blurb: 'One reminder per card, for a wall or a waiting room.' },
  { id: 'health-data', blurb: 'Maps of the health-data economy: who holds it, who profits, where it flows.' },
  { id: 'care-systems', blurb: 'How care actually gets delivered: plans, encounters, and the systems around them.' },
  { id: 'public-health', blurb: 'Guides and warnings for everyday public-health decisions.' },
  { id: 'design-culture', blurb: 'How the studio works.' },
]

function groupItemsIntoSections(items: VisualizationPrint[]) {
  const assigned = new Set<string>()
  return CATALOG_SECTIONS.map((section) => {
    const sectionItems = items.filter((item) => {
      if (assigned.has(item._id) || !itemMatchesCollection(item, section.id)) return false
      assigned.add(item._id)
      return true
    })
    return { ...section, items: sectionItems }
  }).filter((section) => section.items.length > 0)
}

function normalizeGoInvoLink(link?: string) {
  if (!link) return ''

  const match = link.match(/^https?:\/\/(?:www\.)?goinvo\.com(\/.*)$/)
  return match ? match[1] : link
}

function itemMatchesCollection(item: VisualizationPrint, collection: CollectionId) {
  if (collection === 'all') return true
  return collectionSlugs[collection].includes(item.slug || '')
}

// Mirrors the server-side catalog fallback so an unpriced print never renders
// $0, and so a per-piece price (the comic book) shows the same number the
// checkout will charge.
function printPriceOf(item: VisualizationPrint) {
  return item.price || shopPriceCentsFor(item.slug) / 100
}

function formatPrice(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

/**
 * A zero price means the piece is being given away, and a bare "$0" reads as a
 * bug or a catch. Say "Free" instead and let the shipping line carry the cost.
 */
function priceLabel(amount: number, currency = 'USD') {
  return amount <= 0 ? 'Free' : formatPrice(amount, currency)
}

const shippingPrice = SHOP_SHIPPING_PRICE_CENTS / 100

function orderHref(items: SelectedPrint[], supportEmail: string, donationAmount: number) {
  const currency = items[0]?.item.currency || 'USD'
  const shipping = shippingPrice
  const lines = items
    .map(({ item, quantity }) => {
      const lineTotal = printPriceOf(item) * quantity
      return `- ${item.title} × ${quantity}: ${priceLabel(lineTotal, item.currency || currency)}`
    })
    .join('\n')
  const subtotal = items.reduce(
    (total, { item, quantity }) => total + printPriceOf(item) * quantity,
    0,
  )
  const orderTotal = subtotal + shipping + donationAmount
  const printCount = items.reduce((total, item) => total + item.quantity, 0)
  const subject = `GoInvo print order (${printCount})`
  const body = [
    'Hello GoInvo,',
    '',
    'I would like to order these prints:',
    lines,
    '',
    `Prints: ${priceLabel(subtotal, currency)}`,
    `Standard US shipping: ${formatPrice(shipping, currency)}`,
    `Optional support: ${formatPrice(donationAmount, currency)}`,
    `Order total: ${formatPrice(orderTotal, currency)}`,
    '',
    'Name and organization:',
    '',
    'Shipping destination:',
    '',
  ].join('\n')

  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

function donationHref(supportEmail: string, donationAmount: number) {
  const subject = 'Support GoInvo’s open-source health design'
  const body = [
    'Hello GoInvo,',
    '',
    `I would like to contribute ${formatPrice(donationAmount)} to support your public health and open-source design work.`,
    '',
    'Thank you for researching, designing, and sharing this work for more than 20 years.',
    '',
    'Name:',
    '',
  ].join('\n')

  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function VisualizationStorefront({
  items,
  supportEmail,
}: {
  items: VisualizationPrint[]
  supportEmail: string
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({})
  const [query, setQuery] = useState('')
  // No sort control: 31 curated designs don't need one, and "curated order" as
  // a sort option read as noise (Juhan's feedback, 2026-08-07).
  const [collection, setCollection] = useState<CollectionId>('all')
  const [donationChoice, setDonationChoice] = useState<DonationChoice>('0')
  const [customDonation, setCustomDonation] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const cartRef = useRef<HTMLDivElement>(null)
  const [checkoutAvailability, setCheckoutAvailability] = useState<CheckoutAvailability>({
    loaded: false,
    enabled: false,
    mode: null,
  })
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const checkoutIdRef = useRef<string | null>(null)
  // Post-download support dialog: gift-first (never blocks the download),
  // fires at most once per session, dismisses without friction.
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  // Newsletter signup. This is the studio's ONE list, the same one the form
  // further down this page subscribes to, so the copy says "newsletter" and
  // promises nothing separate.
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterHoneypot, setNewsletterHoneypot] = useState('')
  const [newsletterState, setNewsletterState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const supportPromptedRef = useRef(false)
  const supportDialogRef = useRef<HTMLDivElement>(null)
  // Overlays portal to <body>: page sections sit inside transformed animation
  // wrappers, which trap position:fixed and lose the stacking war with the
  // site header (z-1000) no matter the overlay's own z-index.
  const [portalReady, setPortalReady] = useState(false)
  useEffect(() => setPortalReady(true), [])
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item._id)),
    [items, selectedIds],
  )
  const selectedPrints = useMemo(
    () =>
      selectedItems.map((item) => ({
        item,
        quantity: selectedQuantities[item._id] || 1,
      })),
    [selectedItems, selectedQuantities],
  )
  const selectedPrintCount = useMemo(
    () => selectedPrints.reduce((total, item) => total + item.quantity, 0),
    [selectedPrints],
  )
  const selectedSubtotal = useMemo(
    () =>
      selectedPrints.reduce(
        (total, { item, quantity }) => total + printPriceOf(item) * quantity,
        0,
      ),
    [selectedPrints],
  )
  const donationAmount =
    donationChoice === 'custom'
      ? Math.max(0, Number.parseFloat(customDonation) || 0)
      : Number(donationChoice)
  const selectedTotal = selectedSubtotal + donationAmount
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesCollection = itemMatchesCollection(item, collection)
      const matchesQuery =
        !normalizedQuery ||
        `${item.title} ${item.caption || ''}`.toLowerCase().includes(normalizedQuery)
      return matchesCollection && matchesQuery
    })
  }, [collection, items, query])
  const hasFilters = query.trim().length > 0 || collection !== 'all'

  useEffect(() => {
    let cancelled = false
    fetch('/api/shop/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: { checkoutEnabled?: boolean; mode?: 'test' | 'live' | null }) => {
        if (cancelled) return
        setCheckoutAvailability({
          loaded: true,
          enabled: data.checkoutEnabled === true,
          mode: data.mode === 'test' || data.mode === 'live' ? data.mode : null,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutAvailability({ loaded: true, enabled: false, mode: null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (supportDialogOpen) supportDialogRef.current?.focus()
  }, [supportDialogOpen])

  useEffect(() => {
    if (cartOpen) cartRef.current?.focus()
  }, [cartOpen])

  async function startStripeCheckout() {
    if ((!selectedItems.length && donationAmount <= 0) || isStartingCheckout) return

    setCheckoutError(null)
    setIsStartingCheckout(true)
    const checkoutId = checkoutIdRef.current || crypto.randomUUID()
    checkoutIdRef.current = checkoutId

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId,
          items: selectedPrints.map(({ item, quantity }) => ({ slug: item.slug, quantity })),
          donationCents: Math.round(donationAmount * 100),
        }),
      })
      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Secure checkout could not be started.')
      }

      const checkoutUrl = new URL(data.url)
      if (checkoutUrl.protocol !== 'https:') {
        throw new Error('Secure checkout returned an invalid address.')
      }
      window.location.assign(checkoutUrl.href)
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Secure checkout could not be started. Please use the email order request.',
      )
      setIsStartingCheckout(false)
    }
  }

  function toggleItem(id: string) {
    checkoutIdRef.current = null
    setCheckoutError(null)
    setSelectedIds((current) => {
      if (current.includes(id)) {
        setSelectedQuantities((quantities) => {
          const next = { ...quantities }
          delete next[id]
          return next
        })
        return current.filter((candidate) => candidate !== id)
      }

      setSelectedQuantities((quantities) => ({ ...quantities, [id]: 1 }))
      return [...current, id]
    })
  }

  function updateQuantity(id: string, quantity: number) {
    checkoutIdRef.current = null
    setCheckoutError(null)
    setSelectedQuantities((current) => ({
      ...current,
      [id]: Math.min(20, Math.max(1, Math.round(quantity))),
    }))
  }

  /** Open the checkout screen with the support section ready to edit. */
  function openCartForSupport(choice: DonationChoice = 'custom') {
    setCheckoutError(null)
    setDonationChoice(choice)
    checkoutIdRef.current = null
    dismissSupportDialog()
    setCartOpen(true)
  }

  function clearOrder() {
    setSelectedIds([])
    setSelectedQuantities({})
    setDonationChoice('0')
    setCustomDonation('')
    setCartOpen(false)
    setCheckoutError(null)
    checkoutIdRef.current = null
  }

  // Called from download links: the download proceeds untouched; the support
  // ask appears shortly after, once per session.
  function maybeOpenSupportDialog() {
    if (supportPromptedRef.current) return
    try {
      if (window.sessionStorage.getItem('goinvo-shop-support-prompted')) return
    } catch {
      // Storage unavailable — the ref below still limits it to once per visit.
    }
    supportPromptedRef.current = true
    window.setTimeout(() => setSupportDialogOpen(true), 700)
  }

  /**
   * Mark the ask as spent only once the visitor has actually seen and answered
   * it. Recording it at display time meant any page reload while the dialog was
   * up (a draft-mode guard reload, a dev hot reload) burned the one prompt of
   * the session and it never came back.
   */
  async function subscribeToNewsletter(event: React.FormEvent) {
    event.preventDefault()
    if (newsletterState === 'submitting') return
    setNewsletterState('submitting')
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail,
          sourcePath: window.location.pathname,
          website: newsletterHoneypot,
        }),
      })
      const data = (await response.json().catch(() => null)) as { ok?: boolean } | null
      setNewsletterState(response.ok && data?.ok ? 'done' : 'error')
    } catch {
      setNewsletterState('error')
    }
  }

  function dismissSupportDialog() {
    setSupportDialogOpen(false)
    try {
      window.sessionStorage.setItem('goinvo-shop-support-prompted', '1')
    } catch {
      // Best-effort only.
    }
  }


  function browseCollection(nextCollection: CollectionId) {
    setQuery('')
    setCollection(nextCollection)
    window.requestAnimationFrame(() => {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <section
        id="artifact-collections"
        className="bg-[#f2e8d5] border-b border-[#d8cbb5] scroll-mt-24"
      >
        <div className="max-width content-padding py-14 lg:py-20">
          {/* No tan "download the source files…" byline here — the hero already
              says it once (Juhan's feedback, 2026-08-07). */}
          <h2 className="mb-8 font-serif text-[2.15rem] font-light leading-[1.08] lg:text-[3rem]">
            Featured visualizations
          </h2>

          {(() => {
            const bySlug = new Map(items.map((item) => [item.slug, item]))
            const hero = bySlug.get(FEATURED_SLUGS.hero)
            const rail = [FEATURED_SLUGS.second, FEATURED_SLUGS.third, FEATURED_SLUGS.fourth]
              .map((slug) => bySlug.get(slug))
              .filter((item): item is VisualizationPrint => Boolean(item))

            const tile = (item: VisualizationPrint, large: boolean) => {
              const downloadLink = normalizeGoInvoLink(item.downloadLink)
              const selected = selectedIds.includes(item._id)
              return (
                <figure
                  key={item._id}
                  data-shop-featured-poster={item.slug}
                  className="group flex h-full flex-col border border-[#d8cbb5] bg-white shadow-[0_20px_55px_rgba(63,48,29,.12)]"
                >
                  <a
                    href={downloadLink || undefined}
                    target={downloadLink ? '_blank' : undefined}
                    rel={downloadLink ? 'noreferrer' : undefined}
                    onClick={downloadLink ? maybeOpenSupportDialog : undefined}
                    aria-label={downloadLink ? `Download ${item.title} PDF` : item.title}
                    className={`relative block flex-1 bg-[#faf6ee] p-4 ${
                      large ? 'min-h-[420px] lg:min-h-[560px]' : 'min-h-[200px] lg:min-h-[160px]'
                    } ${downloadLink ? 'cursor-pointer' : 'pointer-events-none'}`}
                  >
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes={large ? '(min-width: 1024px) 55vw, 100vw' : '(min-width: 1024px) 40vw, 100vw'}
                        unoptimized
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.015]"
                      />
                    )}
                  </a>
                  {/* The rail is too narrow to fit a longer title inline with the
                      actions, so those captions always stack — one tile silently
                      wrapping while its neighbors sat inline read as a bug. */}
                  <figcaption
                    className={`border-t border-[#eee6d8] px-4 py-3 ${
                      large
                        ? 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1'
                        : 'grid gap-1'
                    }`}
                  >
                    <p className="mb-0 font-semibold">{item.title}</p>
                    <span className="flex items-center gap-4 text-sm">
                      {downloadLink && (
                        <a
                          href={downloadLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={maybeOpenSupportDialog}
                          className="font-semibold text-secondary no-underline hover:underline"
                        >
                          Free Download
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleItem(item._id)}
                        className={`font-semibold ${selected ? 'text-[#24434d]' : 'text-primary'} hover:underline`}
                      >
                        {selected
                          ? 'Remove'
                          : `${BUY_LABEL_BY_SLUG[item.slug || ''] || 'Buy'} · ${priceLabel(printPriceOf(item), item.currency)}`}
                      </button>
                    </span>
                  </figcaption>
                </figure>
              )
            }

            return (
              <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
                {hero && tile(hero, true)}
                <div className="grid gap-5 grid-rows-[auto] lg:grid-rows-[1.2fr_1fr_1fr]">
                  {rail.map((item) => tile(item, false))}
                </div>
              </div>
            )
          })()}

          <div className="mt-12 border-t border-[#d8cbb5] pt-9">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="mb-0 font-serif text-[1.7rem] font-light">Collections</h3>
              <p className="mb-0 text-sm text-gray">Sets made to be used together.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {SERIES.map((series) => {
                const seriesItems = items.filter((item) => itemMatchesCollection(item, series.id))
                return (
                  <button
                    key={series.id}
                    type="button"
                    data-shop-series-card={series.id}
                    onClick={() => browseCollection(series.id)}
                    /* flex-col matters: a stretched <button> centers its own
                       content, so the shorter card floated with a band of dead
                       white above its thumbnails (Shirley, 2026-08-10). */
                    className="group flex flex-col border border-[#d8cbb5] bg-white text-left shadow-[0_14px_36px_rgba(63,48,29,.10)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-secondary hover:shadow-[0_20px_46px_rgba(63,48,29,.16)]"
                  >
                    <span className="flex gap-2 border-b border-[#eee6d8] bg-[#faf6ee] p-3">
                      {seriesItems.slice(0, 3).map((item) => (
                        <span key={item._id} className="relative block aspect-[4/3] flex-1 overflow-hidden">
                          {item.imageUrl && (
                            <Image
                              src={item.imageUrl}
                              alt=""
                              fill
                              sizes="(min-width: 640px) 16vw, 30vw"
                              unoptimized
                              className="object-contain p-1"
                            />
                          )}
                        </span>
                      ))}
                    </span>
                    <span className="flex flex-1 flex-col p-5">
                      <span className="mb-1 flex flex-wrap items-baseline gap-x-3">
                        <span className="font-serif text-[1.5rem] font-light">{series.label}</span>
                        <span className="text-sm text-gray">
                          {seriesItems.length} {seriesItems.length === 1 ? 'piece' : 'pieces'}
                        </span>
                      </span>
                      <span className="mb-4 block leading-relaxed text-gray">{series.blurb}</span>
                      {/* mt-auto keeps both cards' links on the same line even
                          when one blurb runs a line longer. */}
                      <span className="mt-auto font-semibold text-secondary group-hover:underline">
                        Browse {series.label} →
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" className="relative py-14 lg:py-20 scroll-mt-24 overflow-clip">
        <div className="absolute left-[-7rem] top-32 h-56 w-56 rounded-full border-[38px] border-[#007385]/[.07]" />
        <div className="absolute right-[-5rem] top-[36rem] h-44 w-44 rotate-12 bg-primary/[.06]" />

        <div className="relative max-width content-padding">
          <div className="flex flex-wrap justify-between gap-5 items-end mb-8">
            <div>
              <h2 className="font-serif font-light text-[2rem] lg:text-[2.75rem] leading-tight mb-0">
                Download the source. Order the print.
              </h2>
            </div>
            <p className="text-gray mb-1">
              {items.length} {items.length === 1 ? 'design' : 'designs'}
            </p>
          </div>

          {items.length > 0 && (
            <nav
              aria-label="Browse visualization catalog"
              className="sticky top-[var(--spacing-header-height)] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-9 bg-[#f5f3ef]/95 backdrop-blur-md border-y border-[#d9d5ce] shadow-[0_12px_30px_rgba(36,67,77,.06)]"
            >
              <label className="relative block min-w-0">
                <span className="sr-only">Search designs</span>
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary text-lg"
                  aria-hidden="true"
                >
                  ⌕
                </span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.currentTarget.value)}
                  placeholder="Search by title or topic…"
                  className="w-full bg-white border border-[#cfc9be] pl-11 pr-4 py-3 text-black placeholder:text-gray focus:outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
              </label>
              {/* Just search + collection chips: the sort select and the "Clear
                  filters" tag-along are gone — "All designs" already resets the
                  collection (Juhan's feedback, 2026-08-07). */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1" aria-label="Visualization collections">
                {collections.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={collection === option.id}
                    onClick={() => setCollection(option.id)}
                    className={`shrink-0 px-4 py-2 text-sm font-semibold border transition-colors ${
                      collection === option.id
                        ? 'bg-[#24434d] border-[#24434d] text-white'
                        : 'bg-white border-[#cfc9be] text-[#24434d] hover:border-secondary hover:text-secondary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {items.length === 0 ? (
            <div className="border-t border-[#c8c2b8] pt-8">
              <h2 className="font-serif font-light text-[2rem] mb-4">The collection is updating.</h2>
              <p className="text-gray mb-0">
                Check back shortly, or <Link href="/vision">browse the rest of our open work</Link>.
              </p>
            </div>
          ) : (
            <>
              {/* When a filter is on, the rest of the collection "disappears" —
                  name the filter and offer the way back so nobody is spooked
                  (Juhan's feedback, 2026-08-07). */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <p className="text-sm text-gray mb-0" aria-live="polite">
                  {hasFilters ? (
                    <>
                      Showing{' '}
                      {collection !== 'all' && (
                        <strong className="font-semibold text-[#24434d]">
                          {collections.find((entry) => entry.id === collection)?.label}:{' '}
                        </strong>
                      )}
                      {visibleItems.length} of {items.length} designs ·{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('')
                          setCollection('all')
                        }}
                        className="font-semibold text-secondary hover:underline"
                      >
                        Show all {items.length}
                      </button>
                    </>
                  ) : (
                    <>Showing all {items.length} designs</>
                  )}
                </p>
                {selectedItems.length > 0 && (
                  <p className="text-sm font-semibold text-secondary mb-0">
                    {selectedItems.length} selected
                  </p>
                )}
              </div>

              {visibleItems.length === 0 ? (
                <div className="bg-white border border-[#d9d5ce] py-16 px-6 text-center">
                  <span className="font-serif text-[3.5rem] text-primary leading-none" aria-hidden="true">
                    ?
                  </span>
                  <h3 className="font-serif font-light text-[2rem] mt-2 mb-3">No designs match that search.</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setCollection('all')
                    }}
                    className="text-secondary font-semibold hover:underline"
                  >
                    Show the full collection
                  </button>
                </div>
              ) : (
                (() => {
                  // Unfiltered browsing gets curated sections with sub-heads;
                  // any search/filter switches to the flat grid.
                  const groupedSections =
                    collection === 'all' && !query.trim()
                      ? groupItemsIntoSections(visibleItems)
                      : null

                  const renderCard = (item: VisualizationPrint, index: number) => {
                    const selected = selectedIds.includes(item._id)
                    const downloadLink = normalizeGoInvoLink(item.downloadLink)
                    const learnMoreLink = normalizeGoInvoLink(item.learnMoreLink)
                    const printPrice = priceLabel(printPriceOf(item), item.currency)
                    const printSize = PRINT_SIZE_BY_SLUG[item.slug || '']

                    return (
                      <article
                        key={item._id}
                        data-shop-print-card
                        className={`group relative h-full flex flex-col bg-white border shadow-[0_14px_36px_rgba(36,67,77,.08)] transition-[border-color,box-shadow,transform] duration-300 ${
                          selected
                            ? 'border-primary shadow-[0_18px_42px_rgba(227,98,22,.18)] -translate-y-1'
                            : 'border-[#d9d5ce]'
                        }`}
                      >
                        <div
                          className={`absolute left-0 top-0 z-10 h-1 w-full ${
                            index % 3 === 0
                              ? 'bg-primary'
                              : index % 3 === 1
                                ? 'bg-secondary'
                                : 'bg-[#4dc4d6]'
                          }`}
                        />
                        <a
                          href={downloadLink || undefined}
                          target={downloadLink ? '_blank' : undefined}
                          rel={downloadLink ? 'noreferrer' : undefined}
                          onClick={downloadLink ? maybeOpenSupportDialog : undefined}
                          aria-label={
                            downloadLink ? `Download ${item.title} PDF` : `${item.title} preview`
                          }
                          data-shop-image-download={downloadLink ? true : undefined}
                          className={`relative block aspect-[4/3] overflow-hidden bg-[#e8e4dc] ${
                            downloadLink ? 'cursor-pointer' : 'pointer-events-none'
                          }`}
                        >
                          {item.imageUrl ? (
                            <>
                              <Image
                                src={item.imageUrl}
                                alt=""
                                fill
                                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                unoptimized
                                aria-hidden="true"
                                className="scale-110 object-cover opacity-[.16] blur-xl"
                              />
                              <div className="absolute inset-0 bg-white/35" />
                              <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fill
                                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                unoptimized
                                className="object-contain p-4 drop-shadow-[0_6px_14px_rgba(36,67,77,.12)] transition-transform duration-500 group-hover:scale-[1.025]"
                              />
                            </>
                          ) : (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,#E36216_0_8%,transparent_9%),linear-gradient(135deg,#007385,#4dc4d6)]">
                              <div className="absolute left-7 bottom-6 text-white/90 font-serif text-[5rem] font-light leading-none">
                                +
                              </div>
                            </div>
                          )}
                          {downloadLink && (
                            <span className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 text-[11px] font-bold uppercase tracking-[1px] text-secondary shadow-sm transition-colors group-hover:bg-secondary group-hover:text-white">
                              Free Download
                            </span>
                          )}
                          {selected && (
                            <span className="absolute right-4 top-4 bg-primary text-white text-[11px] font-bold uppercase tracking-[1.5px] px-3 py-2">
                              Selected
                            </span>
                          )}
                        </a>

                        <div className="flex flex-1 flex-col p-5 lg:p-6">
                          <div className="mb-4 min-h-[4.75rem]">
                            <div>
                              <h3 className="font-serif font-light text-[1.7rem] leading-tight mb-0">{item.title}</h3>
                              {item.date && <p className="mt-2 mb-0 text-sm text-gray">{item.date}</p>}
                            </div>
                          </div>
                          <p
                            data-shop-print-description
                            className="text-gray leading-relaxed min-h-[3rem] mb-5"
                          >
                            {item.caption || 'An original piece from GoInvo’s open-source health and design collection.'}
                          </p>
                          <div className="mt-auto">
                            {/* Fulfillment is uniform (everything prints on demand),
                                so it is stated once on the page, not per card. */}
                            <div className="mb-5 flex min-h-6 flex-wrap items-end gap-x-4 gap-y-2 text-sm">
                              {learnMoreLink && (
                                <a
                                  href={learnMoreLink}
                                  target={learnMoreLink.startsWith('http') ? '_blank' : undefined}
                                  rel="noreferrer"
                                  className="text-secondary"
                                >
                                  Learn more
                                </a>
                              )}
                              {/* Printed size, for the pieces we keep in stock
                                  (Jon's note, 2026-08-07). */}
                              {printSize && (
                                <span data-shop-print-size={item.slug} className="text-gray">
                                  Printed {printSize}
                                </span>
                              )}
                            </div>
                            {downloadLink && (
                              <a
                                href={downloadLink}
                                target="_blank"
                                rel="noreferrer"
                                onClick={maybeOpenSupportDialog}
                                data-shop-download-button
                                className="mb-2 grid min-h-[3.5rem] w-full grid-cols-[1fr_auto] items-center gap-3 border border-secondary px-5 py-3 font-semibold text-secondary no-underline transition-colors hover:bg-secondary hover:text-white"
                              >
                                <span className="whitespace-nowrap text-left">Free Download</span>
                                <span className="max-w-[6.5rem] text-right text-xs font-normal leading-tight">
                                  PDF
                                </span>
                              </a>
                            )}
                            {PRINT_UNAVAILABLE_SLUGS.has(item.slug || '') ? (
                              <p className="mb-0 min-h-[3.5rem] flex items-center px-5 py-3 text-sm text-gray">
                                Not available as a print. The PDF above is free.
                              </p>
                            ) : (
                              // Outline, not a filled orange slab: the posters
                              // are the show, the CTAs shouldn't compete with
                              // them (Juhan's feedback, 2026-08-07).
                              <button
                                type="button"
                                aria-pressed={selected}
                                onClick={() => toggleItem(item._id)}
                                className={`grid min-h-[3.5rem] w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 font-semibold transition-colors ${
                                  selected
                                    ? 'bg-[#24434d] text-white hover:bg-[#182f36]'
                                    : 'border border-primary text-primary hover:bg-primary hover:text-white'
                                }`}
                              >
                                <span className="whitespace-nowrap text-left">
                                  {selected ? 'Remove' : BUY_LABEL_BY_SLUG[item.slug || ''] || 'Buy Poster'}
                                </span>
                                <span className="whitespace-nowrap text-right text-xs font-normal leading-tight">
                                  {printPrice} · {formatPrice(shippingPrice)} shipping per order
                                </span>
                              </button>
                            )}
                            {selected && (
                              <label className="mt-2 grid min-h-[3.25rem] grid-cols-[1fr_auto] items-center gap-3 border border-[#cfc9be] bg-[#f8f6f2] px-5 py-2 text-sm font-semibold text-[#24434d]">
                                <span className="text-left">Quantity</span>
                                <select
                                  value={selectedQuantities[item._id] || 1}
                                  onChange={(event) =>
                                    updateQuantity(item._id, Number(event.currentTarget.value))
                                  }
                                  aria-label={`Quantity for ${item.title}`}
                                  data-shop-quantity-select={item.slug}
                                  className="min-h-9 border border-[#bdb6aa] bg-white px-3 text-black focus:border-secondary focus:outline-none"
                                >
                                  {Array.from({ length: 20 }, (_, quantityIndex) => {
                                    const quantity = quantityIndex + 1
                                    return (
                                      <option key={quantity} value={quantity}>
                                        {quantity}
                                      </option>
                                    )
                                  })}
                                </select>
                              </label>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  }

                  return groupedSections ? (
                    <div className="grid gap-12">
                      {groupedSections.map((section) => (
                        <section key={section.id} aria-labelledby={`catalog-${section.id}`}>
                          {/* The blurb sits under the heading it describes, not
                              jammed next to the count, where it made a long
                              ragged line (Shirley, 2026-08-10). */}
                          <div className="mb-5 border-b-2 border-[#1d1b1a] pb-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                              <h3
                                id={`catalog-${section.id}`}
                                data-shop-section-head
                                className="mb-0 font-serif text-[1.9rem] font-light"
                              >
                                {collections.find((entry) => entry.id === section.id)?.label}
                              </h3>
                              <p className="mb-0 text-sm text-gray">
                                {section.items.length}{' '}
                                {section.items.length === 1 ? 'design' : 'designs'}
                              </p>
                            </div>
                            <p
                              data-shop-section-blurb
                              className="mb-0 mt-1 max-w-[60ch] text-sm leading-relaxed text-gray"
                            >
                              {section.blurb}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                            {section.items.map((item, index) => renderCard(item, index))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                      {visibleItems.map((item, index) => renderCard(item, index))}
                    </div>
                  )
                })()
              )}
            </>
          )}
        </div>
      </section>

      {portalReady && supportDialogOpen && createPortal(
        <div
          className="fixed inset-0 z-[1250] flex items-end justify-center bg-[#11141f]/45 p-4 sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget) dismissSupportDialog()
          }}
        >
          <div
            ref={supportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-support-title"
            tabIndex={-1}
            data-shop-support-dialog
            onKeyDown={(event) => {
              if (event.key === 'Escape') dismissSupportDialog()
            }}
            className="relative w-full max-w-[480px] overflow-hidden border border-[#d9d5ce] bg-white p-6 shadow-[0_30px_80px_rgba(17,20,31,.35)] outline-none sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
            <>
                <h3 id="shop-support-title" className="mb-2 font-serif text-[1.9rem] font-light leading-tight">
                  Enjoy the download
                </h3>
                <p className="mb-5 leading-relaxed text-gray">
                  If this work is useful, chip in what you like. It funds the next open release.
                </p>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  {(['5', '15', '30'] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      data-shop-donation-chip={amount}
                      onClick={() => openCartForSupport(amount)}
                      className="group border border-[#24434d] px-3 py-3 text-center transition-colors hover:bg-[#24434d] hover:text-white"
                    >
                      <span className="block text-xl font-bold leading-none">${amount}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[1px] text-gray group-hover:text-white/80">
                        support
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  data-shop-donate-trigger
                  onClick={() => openCartForSupport('custom')}
                  className="mb-5 w-full border border-[#cfc9be] px-4 py-2.5 text-sm font-semibold text-[#24434d] transition-colors hover:border-secondary hover:text-secondary"
                >
                  Pay what you want
                </button>
                <div className="mb-4 mt-5 flex items-center gap-3 text-xs uppercase tracking-[1.5px] text-gray" aria-hidden="true">
                  <span className="h-px flex-1 bg-[#d9d5ce]" />
                  or
                  <span className="h-px flex-1 bg-[#d9d5ce]" />
                </div>
                {newsletterState === 'done' ? (
                  <p data-shop-newsletter-done className="mb-0 leading-relaxed text-gray">
                    Subscribed. Thanks.
                  </p>
                ) : (
                  <form onSubmit={subscribeToNewsletter}>
                    <input
                      type="text"
                      name="website"
                      value={newsletterHoneypot}
                      onChange={(event) => setNewsletterHoneypot(event.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
                    />
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(event) => setNewsletterEmail(event.target.value)}
                        placeholder="Your email"
                        aria-label="Email address for the GoInvo newsletter"
                        disabled={newsletterState === 'submitting'}
                        className="min-w-0 flex-1 border border-[#cfc9be] px-4 py-3 text-black placeholder:text-gray focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                      />
                      <button
                        type="submit"
                        disabled={newsletterState === 'submitting'}
                        aria-busy={newsletterState === 'submitting'}
                        data-shop-newsletter-submit
                        className="border border-secondary px-5 py-3 font-semibold text-secondary transition-colors hover:bg-secondary hover:text-white disabled:opacity-60"
                      >
                        {newsletterState === 'submitting' ? 'Signing up…' : 'Get the newsletter'}
                      </button>
                    </div>
                    <p className="mt-2 mb-0 text-xs leading-5 text-gray">
                      {newsletterState === 'error'
                        ? 'That didn’t go through. Mind trying again in a minute?'
                        : 'The same GoInvo newsletter as the sign-up further down this page.'}
                    </p>
                  </form>
                )}
                <button
                  type="button"
                  onClick={dismissSupportDialog}
                  className="mt-4 text-sm font-semibold text-gray hover:text-[#24434d] hover:underline"
                >
                  No thanks
                </button>
            </>
          </div>
        </div>,
        document.body,
      )}

      {(selectedItems.length > 0 || donationAmount > 0) && !cartOpen && (
        <aside
          className="sticky bottom-20 z-30 max-width content-padding pb-4 sm:bottom-4"
          aria-label="Order summary"
          data-shop-cart-bar
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-[#11141f] px-4 py-3 text-white shadow-[0_22px_70px_rgba(17,20,31,.35)] sm:px-6">
            <div className="min-w-0">
              <p className="mb-0 font-semibold">
                {selectedPrintCount > 0
                  ? `${selectedPrintCount} ${selectedPrintCount === 1 ? 'print' : 'prints'}${donationAmount > 0 ? ' + support' : ''}`
                  : 'Support the work'}
              </p>
              {/* Break out shipping in the first popup so the total isn't a
                  surprise (Jon's feedback, 2026-08-07). */}
              <p data-shop-cart-total className="mb-0 text-sm text-[#c5ccda]">
                {selectedPrints.length > 0
                  ? `${priceLabel(selectedSubtotal, selectedItems[0]?.currency)} + ${formatPrice(
                      shippingPrice,
                      selectedItems[0]?.currency,
                    )} shipping${
                      donationAmount > 0
                        ? ` + ${formatPrice(donationAmount, selectedItems[0]?.currency)} support`
                        : ''
                    }`
                  : `${formatPrice(donationAmount, selectedItems[0]?.currency)} support`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearOrder}
                className="border border-white/30 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="button"
                data-shop-open-cart
                onClick={() => setCartOpen(true)}
                className="bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Review order
              </button>
            </div>
          </div>
        </aside>
      )}

      {portalReady && cartOpen && createPortal(
        <div
          className="fixed inset-0 z-[1250] flex justify-end bg-[#11141f]/45"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCartOpen(false)
          }}
        >
          <div
            ref={cartRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-cart-title"
            tabIndex={-1}
            data-shop-donation-panel
            onKeyDown={(event) => {
              if (event.key === 'Escape') setCartOpen(false)
            }}
            className="relative flex h-full w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-[-30px_0_80px_rgba(17,20,31,.35)] outline-none"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
            <div className="flex items-center justify-between border-b border-[#d9d5ce] px-6 py-5 sm:px-8">
              <h3 id="shop-cart-title" className="mb-0 font-serif text-[1.9rem] font-light">
                Your order
              </h3>
              <button
                type="button"
                data-shop-cart-close
                onClick={() => setCartOpen(false)}
                aria-label="Close order review"
                className="grid h-10 w-10 place-items-center border border-[#cfc9be] text-lg text-[#24434d] transition-colors hover:border-secondary hover:text-secondary"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
              {selectedPrints.length === 0 ? (
                <p className="mb-6 leading-relaxed text-gray">
                  No prints yet. Add any design from the collection, or just leave some support
                  below.
                </p>
              ) : (
                <ul className="mb-6 list-none divide-y divide-[#e8e4dc] border-y border-[#e8e4dc] p-0">
                  {selectedPrints.map(({ item, quantity }) => (
                    <li key={item._id} className="flex items-center gap-4 py-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[#e8e4dc]">
                        {item.imageUrl && (
                          <Image
                            src={item.imageUrl}
                            alt=""
                            fill
                            sizes="64px"
                            unoptimized
                            className="object-contain p-1"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-0 truncate font-semibold">{item.title}</p>
                        <p className="mb-0 text-sm text-gray">
                          {priceLabel(printPriceOf(item), item.currency)}
                          {PRINT_SIZE_BY_SLUG[item.slug || '']
                            ? ` · printed ${PRINT_SIZE_BY_SLUG[item.slug || '']}`
                            : ''}
                        </p>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="sr-only">Quantity for {item.title}</span>
                        <select
                          value={quantity}
                          onChange={(event) => updateQuantity(item._id, Number(event.currentTarget.value))}
                          data-shop-cart-quantity={item.slug}
                          className="border border-[#cfc9be] bg-white px-2 py-1.5 text-black focus:border-secondary focus:outline-none"
                        >
                          {Array.from({ length: 20 }, (_, quantityIndex) => quantityIndex + 1).map(
                            (value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <p className="mb-0 w-16 text-right font-semibold">
                        {priceLabel(printPriceOf(item) * quantity, item.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleItem(item._id)}
                        aria-label={`Remove ${item.title}`}
                        className="text-sm font-semibold text-gray hover:text-primary hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mb-6 border border-[#d9d5ce] bg-[#faf8f5] p-4 sm:p-5">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[2px] text-primary">
                  Optional
                </p>
                <p className="mb-1 font-serif text-[1.35rem] font-light">Add support</p>
                <p className="mb-3 text-sm leading-relaxed text-gray">
                  Optional, and it rides along in this order.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {(['5', '15', '30'] as const).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      data-shop-donation-chip={amount}
                      aria-pressed={donationChoice === amount}
                      onClick={() => {
                        setDonationChoice(donationChoice === amount ? '0' : amount)
                        checkoutIdRef.current = null
                        setCheckoutError(null)
                      }}
                      className={`border px-4 py-2 font-semibold transition-colors ${
                        donationChoice === amount
                          ? 'border-[#24434d] bg-[#24434d] text-white'
                          : 'border-[#cfc9be] bg-white text-[#24434d] hover:border-secondary hover:text-secondary'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-shop-donation-custom-toggle
                    aria-pressed={donationChoice === 'custom'}
                    onClick={() => {
                      setDonationChoice(donationChoice === 'custom' ? '0' : 'custom')
                      checkoutIdRef.current = null
                      setCheckoutError(null)
                    }}
                    className={`border px-4 py-2 font-semibold transition-colors ${
                      donationChoice === 'custom'
                        ? 'border-[#24434d] bg-[#24434d] text-white'
                        : 'border-[#cfc9be] bg-white text-[#24434d] hover:border-secondary hover:text-secondary'
                    }`}
                  >
                    Custom
                  </button>
                  {donationChoice === 'custom' && (
                    <label className="flex items-center gap-1 text-sm">
                      <span className="sr-only">Custom support amount</span>
                      <span aria-hidden="true">$</span>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        // Cent precision, so a converted-from-another-currency amount
                        // like 17.43 is valid. The handler already rounds to whole
                        // cents (Math.round(amount * 100)); step="1" wrongly flagged
                        // any non-whole-dollar value as invalid.
                        step="0.01"
                        inputMode="decimal"
                        value={customDonation}
                        onChange={(event) => {
                          setCustomDonation(event.currentTarget.value)
                          checkoutIdRef.current = null
                          setCheckoutError(null)
                        }}
                        data-shop-custom-donation
                        placeholder="Amount"
                        autoFocus
                        className="w-24 border border-[#cfc9be] bg-white px-3 py-2 text-black placeholder:text-gray focus:border-secondary focus:outline-none"
                      />
                    </label>
                  )}
                </div>
              </div>

              <dl className="mb-0 border-t border-[#d9d5ce] pt-4 text-sm">
                {selectedPrints.length > 0 && (
                  <>
                    <div className="flex justify-between py-1">
                      <dt className="text-gray">
                        Prints ({selectedPrintCount})
                      </dt>
                      <dd className="mb-0 font-semibold">
                        {priceLabel(selectedSubtotal, selectedItems[0]?.currency)}
                      </dd>
                    </div>
                    <div className="flex justify-between py-1">
                      <dt className="text-gray">Standard US shipping</dt>
                      <dd className="mb-0 font-semibold">
                        {formatPrice(shippingPrice, selectedItems[0]?.currency)}
                      </dd>
                    </div>
                  </>
                )}
                {donationAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <dt className="text-gray">Support</dt>
                    <dd className="mb-0 font-semibold">{formatPrice(donationAmount)}</dd>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-[#d9d5ce] pt-3 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="mb-0 font-bold" data-shop-order-total>
                    {selectedPrints.length > 0
                      ? `${formatPrice(selectedTotal + shippingPrice, selectedItems[0]?.currency)} total`
                      : `${formatPrice(donationAmount)} contribution`}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-[#d9d5ce] px-6 py-4 sm:px-8">
              {checkoutError && (
                <p className="mb-2 text-sm leading-5 text-primary" role="alert">
                  {checkoutError}
                </p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="border border-[#cfc9be] px-5 py-3 font-semibold text-[#24434d] transition-colors hover:border-secondary hover:text-secondary"
                >
                  Keep browsing
                </button>
                {checkoutAvailability.enabled ? (
                  <button
                    type="button"
                    onClick={startStripeCheckout}
                    disabled={isStartingCheckout || (selectedItems.length === 0 && donationAmount <= 0)}
                    data-shop-stripe-checkout
                    className="flex-1 bg-primary px-6 py-3 font-semibold whitespace-nowrap text-white transition-colors hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
                  >
                    {isStartingCheckout
                      ? 'Opening checkout…'
                      : checkoutAvailability.mode === 'test'
                        ? 'Test checkout'
                        : 'Checkout'}
                  </button>
                ) : (
                  <a
                    href={
                      selectedItems.length > 0
                        ? orderHref(selectedPrints, supportEmail, donationAmount)
                        : donationHref(supportEmail, donationAmount)
                    }
                    data-shop-order-fallback={selectedItems.length > 0 ? true : undefined}
                    data-shop-donation-fallback={selectedItems.length === 0 ? true : undefined}
                    className="flex-1 whitespace-nowrap bg-primary px-6 py-3 text-center font-semibold text-white no-underline transition-colors hover:bg-primary-dark"
                  >
                    {checkoutAvailability.loaded
                      ? selectedItems.length > 0
                        ? 'Request order by email'
                        : 'Support by email'
                      : 'Preparing checkout…'}
                  </a>
                )}
              </div>
              {checkoutError && checkoutAvailability.enabled && (
                <a
                  href={
                    selectedItems.length > 0
                      ? orderHref(selectedPrints, supportEmail, donationAmount)
                      : donationHref(supportEmail, donationAmount)
                  }
                  className="mt-2 block text-center text-sm font-semibold text-[#24434d] hover:underline"
                >
                  {selectedItems.length > 0 ? 'Or email the order instead' : 'Or support by email'}
                </a>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      <a
        href="#shop-top"
        aria-label="Back to top"
        className="fixed right-4 bottom-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-[#24434d] border border-[#d9d5ce] shadow-[0_10px_30px_rgba(36,67,77,.18)] no-underline hover:bg-[#24434d] hover:text-white transition-colors"
      >
        ↑
      </a>
    </>
  )
}
