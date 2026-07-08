/**
 * Server-only token crypto for shareable draft-preview links.
 *
 * Kept out of previewShare.ts so node:crypto never lands in the Studio bundle.
 * The raw token is a 256-bit random value shown once (in the share URL); the
 * dataset stores only its SHA-256 hash, so a leak of the record reveals nothing
 * usable and the token cannot be brute-forced.
 */
import { randomBytes, createHash } from 'node:crypto'

/** 32 random bytes, URL-safe base64 (~43 chars, 256 bits of entropy). */
export function generateShareToken(): string {
  return randomBytes(32).toString('base64url')
}

/** SHA-256 hex digest — the only form of the token that is ever persisted. */
export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
