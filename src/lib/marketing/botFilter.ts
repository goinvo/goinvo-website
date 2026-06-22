/**
 * Lightweight bot/automation detection by User-Agent for the PUBLIC first-party
 * beacon collector (/api/marketing/analytics/collect), which is unauthenticated
 * by necessity (beacons can't carry auth). Paid traffic attracts crawlers and
 * click-fraud; dropping clearly non-browser UAs keeps invalid hits out of the
 * per-variant A/B counters.
 *
 * Deliberately CONSERVATIVE: only a positive match drops a hit, and a missing UA
 * is NOT treated as a bot — false-dropping real visitors would bias the
 * experiment (worse than letting a few bots through, which the per-IP rate limit
 * also catches). No external dependency.
 */
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|adsbot|bingpreview|facebookexternalhit|whatsapp|telegrambot|slackbot|discordbot|headless|phantomjs|puppeteer|playwright|lighthouse|gtmetrix|pingdom|uptimerobot|statuscake|monitor(?:ing)?|curl|wget|python-requests|python-urllib|go-http|axios|node-fetch|okhttp|java\/|libwww|httpclient|scrapy|semrush|ahrefs|mj12bot|dotbot|petalbot|dataforseo|bytespider/i

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  return BOT_UA.test(userAgent)
}
