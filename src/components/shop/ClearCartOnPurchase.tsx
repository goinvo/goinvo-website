'use client'

import { useEffect } from 'react'
import { CART_STORAGE_KEY } from '@/lib/shop/cartStorage'

/**
 * Empties the shop cart once a checkout is confirmed paid.
 *
 * Stripe returns the buyer to this page in the SAME tab they left from, so the
 * tab's sessionStorage — and with it the cart they just bought — is still
 * alive. Without this they go back to the storefront and find the purchased
 * pieces sitting in the cart, which reads as "my order didn't go through".
 *
 * Render this ONLY when the session is confirmed paid server-side. That is what
 * keeps an abandoned checkout from wiping a legitimate cart: cancelling returns
 * the shopper to the storefront, never here, so their cart survives as it
 * should. Payment methods that settle asynchronously land here unpaid and
 * simply keep their cart until a paid confirmation is seen.
 */
export function ClearCartOnPurchase() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Private-mode browsers can throw on storage access. The cart is a
      // convenience, not a record — failing to clear it must never break the
      // page that tells someone their order succeeded.
    }
  }, [])

  return null
}
