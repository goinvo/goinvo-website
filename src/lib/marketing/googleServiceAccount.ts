import { createSign } from 'node:crypto'

// Shared Google service-account auth for the marketing routes (GA4 Data API +
// Search Console). Mints an OAuth token from a signed JWT using Node crypto, so
// no Google SDK dependency. Gated on GOOGLE_SERVICE_ACCOUNT_JSON.

export type ServiceAccount = { client_email: string; private_key: string }

export function getServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key }
    }
  } catch {
    // fall through
  }
  return null
}

export async function getGoogleAccessToken(sa: ServiceAccount, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const unsigned = `${header}.${claim}`
  const signature = createSign('RSA-SHA256').update(unsigned).end().sign(sa.private_key).toString('base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('Google token exchange returned no access_token.')
  return data.access_token
}

export type Ga4Row = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }

export async function ga4RunReport(token: string, propertyId: string, body: Record<string, unknown>): Promise<Ga4Row[]> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GA4 report failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as { rows?: Ga4Row[] }
  return data.rows || []
}
