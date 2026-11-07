/**
 * The review switches. Each is a URL parameter remembered in a cookie and applied as
 * an attribute on <html> before first paint, by an inline script in the root layout.
 * The server never reads the cookies, so pages stay static, and every difference is
 * CSS keyed on the attributes. All of it is off in production.
 *
 *   ?design=human|classic                 data-design="human"         design-human.css
 *   ?hand=accents|full|off                data-hand="accents|full"    design-hand.css
 *   ?hand-font=caveat|patrick|kalam       data-hand-font="…"          design-hand.css
 *
 * `hand` is the hand-drawn option: `accents` sets labels, notes and annotations in a
 * handwriting font and draws underlines, circles, rules and arrows by hand; `full`
 * sets the headings in handwriting too.
 */

export const designSwitchEnabled = process.env.VERCEL_ENV !== 'production'

export const HAND_LEVELS = ['accents', 'full'] as const
export const HAND_FONTS = [
  { key: 'caveat', name: 'Caveat' },
  { key: 'patrick', name: 'Patrick Hand' },
  { key: 'kalam', name: 'Kalam' },
] as const
export type HandLevel = (typeof HAND_LEVELS)[number]
export type HandFont = (typeof HAND_FONTS)[number]['key']

export const REVIEW_COOKIES = { design: 'goinvo-design', hand: 'goinvo-hand', handFont: 'goinvo-hand-font' } as const
const MAX_AGE = 2592000 // 30 days

/** Write (or with an empty value, clear) one review cookie. */
export function setReviewCookie(name: string, value: string) {
  document.cookie = `${name}=${value};path=/;max-age=${value ? MAX_AGE : 0};samesite=lax`
}

const levels = HAND_LEVELS.join('|')
const fonts = HAND_FONTS.map((f) => f.key).join('|')

export const DESIGN_SWITCH_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search),d=document.documentElement,m,q;function s(n,v){document.cookie=n+'='+v+';path=/;max-age='+(v?${MAX_AGE}:0)+';samesite=lax'}q=p.get('design');if(q==='human')s('${REVIEW_COOKIES.design}','human');else if(q==='classic')s('${REVIEW_COOKIES.design}','');q=p.get('hand');if(/^(${levels})$/.test(q||''))s('${REVIEW_COOKIES.hand}',q);else if(q==='off')s('${REVIEW_COOKIES.hand}','');q=p.get('hand-font');if(/^(${fonts})$/.test(q||''))s('${REVIEW_COOKIES.handFont}',q);var c=document.cookie;if(/(?:^|; )${REVIEW_COOKIES.design}=human/.test(c))d.setAttribute('data-design','human');if(m=c.match(/(?:^|; )${REVIEW_COOKIES.hand}=(${levels})/))d.setAttribute('data-hand',m[1]);if(m=c.match(/(?:^|; )${REVIEW_COOKIES.handFont}=(${fonts})/))d.setAttribute('data-hand-font',m[1])}catch(e){}})();`
