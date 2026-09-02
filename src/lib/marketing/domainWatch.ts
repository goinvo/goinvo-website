/**
 * Noticing that a domain is about to expire, before it does.
 *
 * On 2026-09-02 goinvo.com was nine hours from expiry and nobody in the studio
 * knew. It renewed fine — it had renewed every year since 2008 — but the way a
 * long-held domain actually dies is not forgetfulness, it is an auto-renew that
 * keeps reporting success against a card that expired, silently, for a year.
 * And when it goes it takes the site, the client email and every other
 * scheduled job with it at the same moment.
 *
 * RDAP is the right instrument for this and costs nothing: it is the registry's
 * own successor to WHOIS, needs no key, no account and no vendor, returns
 * structured JSON, and is rate-limited generously enough for a handful of
 * domains once a week. NO model is involved anywhere — an expiry date is a
 * fact to be read, not a judgement, and asking a model to interpret it could
 * only introduce error.
 *
 * Pure and dependency-free: every rule here is date arithmetic against a parsed
 * payload, so the thresholds are testable without a network.
 */

/** Registry RDAP endpoints for the TLDs the studio actually holds. */
const RDAP_BY_TLD: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/domain/',
  net: 'https://rdap.verisign.com/net/v1/domain/',
  org: 'https://rdap.publicinterestregistry.org/rdap/domain/',
}

/**
 * The IANA-run redirector, used only for a TLD not in the map above.
 *
 * Kept as the fallback rather than the primary: going straight to the registry
 * is one fewer service that can be down, and these three TLDs cover everything
 * the studio owns.
 */
const RDAP_FALLBACK = 'https://rdap.org/domain/'

export function rdapUrlFor(domain: string): string {
  const clean = String(domain || '').trim().toLowerCase().replace(/^www\./, '')
  const tld = clean.split('.').pop() || ''
  const base = RDAP_BY_TLD[tld] || RDAP_FALLBACK
  return `${base}${clean}`
}

/** The shape we care about; RDAP returns a great deal more. */
export type RdapPayload = {
  ldhName?: string
  events?: Array<{ eventAction?: string; eventDate?: string }>
  status?: string[]
}

/**
 * The expiry date out of an RDAP payload.
 *
 * Returns null rather than guessing when the event is absent: a domain with no
 * readable expiry is a thing to report, not a thing to assume is fine.
 */
export function expiryFromRdap(payload: RdapPayload | null | undefined): string | null {
  const event = (payload?.events || []).find((entry) => entry.eventAction === 'expiration')
  const date = event?.eventDate
  if (!date || Number.isNaN(Date.parse(date))) return null
  return date
}

export type DomainStatus = {
  domain: string
  expiresAt: string | null
  daysLeft: number | null
  level: 'ok' | 'notice' | 'warning' | 'urgent' | 'expired' | 'unknown'
  /** One line for a person. Empty when there is nothing worth saying. */
  message: string
}

/**
 * How close is too close?
 *
 * Tiered rather than a single threshold because the useful response changes:
 * sixty days out is "put it on the list", a fortnight out is "check the card on
 * file", and inside a week it is the most urgent thing in the studio. A single
 * alarm date would either nag for two months or arrive too late to be calm.
 */
export const DOMAIN_NOTICE_DAYS = 60
export const DOMAIN_WARNING_DAYS = 30
export const DOMAIN_URGENT_DAYS = 7

const MS_PER_DAY = 86_400_000

export function daysUntil(dateIso: string, now: Date = new Date()): number {
  return Math.floor((Date.parse(dateIso) - now.getTime()) / MS_PER_DAY)
}

export function assessDomain(
  input: { domain: string; expiresAt: string | null; error?: string },
  now: Date = new Date(),
): DomainStatus {
  const { domain, expiresAt } = input

  if (!expiresAt) {
    return {
      domain,
      expiresAt: null,
      daysLeft: null,
      level: 'unknown',
      // Reported, not swallowed. A lookup that silently fails every week is
      // indistinguishable from a domain that is fine, which is the whole
      // failure this watch exists to prevent.
      message: `Could not read the registry record for *${domain}*${input.error ? ` (${input.error})` : ''}. Check it by hand.`,
    }
  }

  const daysLeft = daysUntil(expiresAt, now)
  const on = expiresAt.slice(0, 10)

  if (daysLeft < 0) {
    return {
      domain,
      expiresAt,
      daysLeft,
      level: 'expired',
      message: `*${domain} expired ${Math.abs(daysLeft)} day(s) ago* (${on}). The site and any email on it can stop working. Renew it now.`,
    }
  }
  if (daysLeft <= DOMAIN_URGENT_DAYS) {
    return {
      domain,
      expiresAt,
      daysLeft,
      level: 'urgent',
      message: `*${domain} expires in ${daysLeft} day(s)* (${on}). Confirm auto-renew is on AND the card on file is current — auto-renew fails silently against an expired card.`,
    }
  }
  if (daysLeft <= DOMAIN_WARNING_DAYS) {
    return {
      domain,
      expiresAt,
      daysLeft,
      level: 'warning',
      message: `${domain} expires in ${daysLeft} days (${on}). Worth confirming the payment method on the registrar account.`,
    }
  }
  if (daysLeft <= DOMAIN_NOTICE_DAYS) {
    return {
      domain,
      expiresAt,
      daysLeft,
      level: 'notice',
      message: `${domain} expires in ${daysLeft} days (${on}).`,
    }
  }
  return { domain, expiresAt, daysLeft, level: 'ok', message: '' }
}

/**
 * Only what is worth saying.
 *
 * Silent by default: a domain with ten months left produces no message at all,
 * because a watch that speaks every week is a watch people learn to scroll
 * past, and then it is worthless on the week it matters.
 */
export function domainsWorthMentioning(statuses: DomainStatus[]): DomainStatus[] {
  return statuses.filter((status) => status.level !== 'ok')
}

/** Does anything here need a person today rather than eventually? */
export function hasUrgentDomain(statuses: DomainStatus[]): boolean {
  return statuses.some((status) => status.level === 'urgent' || status.level === 'expired')
}

/** Which domains to watch. Configurable, because the studio owns more than the site. */
export function watchedDomains(): string[] {
  const raw = process.env.MARKETING_WATCHED_DOMAINS || 'goinvo.com,determinantsofhealth.org'
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
    .filter(Boolean)
}
