/**
 * The one place the shop cart's storage key is written down.
 *
 * Two components need it and they must never disagree: the storefront, which
 * reads and persists the cart, and the order-confirmation page, which clears it
 * after a paid checkout. A duplicated literal is how "we cleared the cart" turns
 * into "we cleared a different key".
 *
 * sessionStorage (not localStorage) is deliberate: an abandoned cart should not
 * outlive the browser tab.
 */
export const CART_STORAGE_KEY = 'goinvo-shop-cart-v1'
