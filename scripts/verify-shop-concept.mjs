import puppeteer from 'puppeteer'

const baseUrl = process.env.SHOP_BASE_URL || 'http://localhost:3000'
const storefrontPath = '/vision/health-visualizations'
// Dev-server first compiles + 31 unoptimized poster images can outlast the
// default 180s CDP timeout.
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 600_000 })

async function loadLazyImages(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((position) => window.scrollTo(0, position), y)
    await new Promise((resolve) => setTimeout(resolve, 90))
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('article img')].every(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    { timeout: 60_000 },
  )
}

try {
  const redirectPage = await browser.newPage()
  const redirectResponse = await redirectPage.goto(`${baseUrl}/shop`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  const shopRedirect = {
    status: redirectResponse?.status(),
    finalPath: new URL(redirectPage.url()).pathname,
  }
  if (shopRedirect.finalPath !== storefrontPath) {
    throw new Error(
      `The legacy shop route did not reach the combined page: ${JSON.stringify(shopRedirect)}`,
    )
  }
  await redirectPage.close()

  const page = await browser.newPage()
  await page.setViewport({ width: 1064, height: 900, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}${storefrontPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.waitForSelector('[data-shop-print-card]')
  await loadLazyImages(page)
  const checkoutConfig = await page.evaluate(async () => {
    const response = await fetch('/api/shop/config', { cache: 'no-store' })
    return {
      status: response.status,
      body: await response.json(),
    }
  })
  if (
    checkoutConfig.status !== 200 ||
    typeof checkoutConfig.body.checkoutEnabled !== 'boolean'
  ) {
    throw new Error(`Stripe checkout config is unavailable: ${JSON.stringify(checkoutConfig)}`)
  }

  const desktop = await page.evaluate(() => {
    // Money is read off the page, never assumed: prices are CMS-owned.
    const priceFromLabel = (text) => {
      const match = (text || '').match(/\$(\d[\d,.]*)/)
      return match ? Number(match[1].replace(/,/g, '')) : 0
    }
    const shippingFromLabel = (text) => {
      const match = (text || '').match(/\$(\d[\d,.]*) shipping/)
      return match ? Number(match[1].replace(/,/g, '')) : 0
    }
    const cards = [...document.querySelectorAll('[data-shop-print-card]')]
    // Per-item labels (Jon): posters say "Buy Poster", the comic book says
    // "Buy Comic", and the out-of-stock journal has no buy button at all.
    // Count each shape explicitly.
    const cardButtons = [...document.querySelectorAll('[data-shop-print-card] button')]
    const addButtons = cardButtons.filter((button) => /^Buy (Poster|Comic)/.test(button.textContent?.trim() || ''))
    const comicButtons = cardButtons.filter((button) => button.textContent?.includes('Buy Comic'))
    const unavailableCards = cards.filter((card) =>
      card.textContent?.includes('Print currently unavailable'),
    )
    const rect = (element) => {
      const bounds = element.getBoundingClientRect()
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        width: bounds.width,
        height: bounds.height,
      }
    }
    const firstRowCards = cards.slice(0, 3)
    const hero = document.querySelector('h1')?.closest('section')

    return {
      title: document.querySelector('h1')?.textContent?.trim(),
      // One CTA — browsing and downloading are the same trip. The old
      // "Download or print" second button and the eyebrow are gone.
      heroCtas: [...(hero?.querySelectorAll('a[href^="#"]') || [])].map((link) =>
        link.textContent?.trim(),
      ),
      heroHasEyebrow: (hero?.textContent || '').includes('Open Source Health Design · GoInvo'),
      // Price and shipping are stated together, once, in the hero fact line,
      // in the words Juhan dictated. The amount is whatever the CMS says, so
      // match the shape, not a number. "printed on demand" must NOT come back:
      // it was never asked for and the page's own data marks two pieces as
      // stock, so a blanket made-to-order claim is false.
      heroStatesPrice: /\$\d[\d,.]* per print, plus \$\d[\d,.]* flat US shipping/.test(
        hero?.textContent || '',
      ),
      heroClaimsPrintOnDemand: /printed on demand/i.test(hero?.textContent || ''),
      heroPrice: (() => {
        const match = (hero?.textContent || '').match(/\$(\d[\d,.]*) per print/)
        return match ? Number(match[1].replace(/,/g, '')) : 0
      })(),
      howItWorksBandCount: document.querySelectorAll('#how-it-works').length,
      cardCount: cards.length,
      addButtonCount: addButtons.length,
      comicButtonCount: comicButtons.length,
      unavailableCardCount: unavailableCards.length,
      downloadCount: document.querySelectorAll('[data-shop-print-card] [data-shop-download-button]')
        .length,
      openSourceLabelCount: [
        ...document.querySelectorAll('[data-shop-print-card] [data-shop-download-button]'),
      ].filter((link) => link.textContent?.includes('Free Download')).length,
      // Prices live in the CMS and editors change them, so read the prices
      // off the page rather than pinning numbers a legitimate edit would break.
      // What must hold is the SHAPE: every buy button names a price and the
      // shipping charge, and the comic is priced apart from the posters.
      buyLabels: addButtons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim() || ''),
      shippingLabel: shippingFromLabel(addButtons[0]?.textContent || ''),
      posterPrice: priceFromLabel(
        addButtons.find((button) => button.textContent?.startsWith('Buy Poster'))?.textContent || '',
      ),
      comicPrice: priceFromLabel(comicButtons[0]?.textContent || ''),
      imageDownloadCount: document.querySelectorAll('[data-shop-image-download]').length,
      imageDownloadTargetsMatch: cards.every((card) => {
        const imageLink = card.querySelector('[data-shop-image-download]')
        const buttonLink = card.querySelector('[data-shop-download-button]')
        return imageLink?.getAttribute('href') === buttonLink?.getAttribute('href')
      }),
      // Fulfillment is uniform, so it is stated once on the page — never per card.
      cardFulfillmentLabels: [...document.querySelectorAll('[data-shop-print-card] span')].filter(
        (element) => /^(In stock|Printed on demand)$/.test(element.textContent?.trim() || ''),
      ).length,
      descriptions: [...document.querySelectorAll('[data-shop-print-description]')].map(
        (element) => element.textContent?.trim() || '',
      ),
      genericDescriptionCount: [
        ...document.querySelectorAll('[data-shop-print-description]'),
      ].filter((element) =>
        element.textContent?.includes('open-source health and design collection'),
      ).length,
      // Not every card has a buy button (comic book label, unavailable
      // journal) — check alignment only on the labels that exist.
      actionLabelAlignments: cards.flatMap((card) => {
        const download = card.querySelector('[data-shop-download-button]')
        const order = [...card.querySelectorAll('button')].find((button) =>
          /^Buy (Poster|Comic)/.test(button.textContent?.trim() || ''),
        )
        return [download?.firstElementChild, order?.firstElementChild]
          .filter((element) => element)
          .map((element) => getComputedStyle(element).textAlign)
      }),
      imageCount: document.querySelectorAll('[data-shop-print-card] img:not([aria-hidden="true"])')
        .length,
      loadedImageCount: [
        ...document.querySelectorAll('[data-shop-print-card] img:not([aria-hidden="true"])'),
      ].filter((image) => image instanceof HTMLImageElement && image.naturalWidth > 0).length,
      failedImages: [
        ...document.querySelectorAll('[data-shop-print-card] img:not([aria-hidden="true"])'),
      ]
        .filter((image) => image instanceof HTMLImageElement && image.naturalWidth === 0)
        .map((image) => ({
          alt: image.getAttribute('alt'),
          src: image.getAttribute('src'),
        })),
      featuredPosterCount: document.querySelectorAll('[data-shop-featured-poster]').length,
      featuredPostersLoaded: [
        ...document.querySelectorAll('[data-shop-featured-poster] img'),
      ].every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0),
      // Rail captions must all lay out the same way regardless of title length:
      // one tile wrapping its actions while its neighbors sat inline read as a bug.
      featuredRailCaptions: [...document.querySelectorAll('[data-shop-featured-poster]')]
        .slice(1)
        .map((tile) => {
          const title = tile.querySelector('figcaption p')?.getBoundingClientRect()
          const actions = tile.querySelector('figcaption span')?.getBoundingClientRect()
          if (!title || !actions) return null
          return {
            slug: tile.getAttribute('data-shop-featured-poster'),
            stacked: actions.top >= title.bottom - 2,
            alignedLeft: Math.abs(actions.left - title.left) < 2,
            withinTile: actions.right <= tile.getBoundingClientRect().right + 1,
          }
        }),
      featuredHeading: document.querySelector('#artifact-collections h2')?.textContent?.trim(),
      // The tan "download the source files…" byline was cut — the hero already
      // says it once.
      featuredSummaryCount: document.querySelectorAll('[data-shop-featured-summary]').length,
      featuredBrowseLinks: [...document.querySelectorAll('#artifact-collections button')].filter(
        (button) => button.textContent?.includes('Browse'),
      ).length,
      // Collections are presented as cards with a preview of what is inside,
      // not as bare text links.
      seriesCards: [...document.querySelectorAll('[data-shop-series-card]')].map((card) => {
        const strip = card.firstElementChild
        return {
          id: card.getAttribute('data-shop-series-card'),
          thumbnails: card.querySelectorAll('img').length,
          thumbnailsLoaded: [...card.querySelectorAll('img')].every(
            (image) => image instanceof HTMLImageElement && image.naturalWidth > 0,
          ),
          hasCount: /\d+\s+pieces?/.test(card.textContent || ''),
          // A stretched <button> centers its own content, which left a band of
          // dead white above the shorter card's thumbnails. The thumbnail strip
          // must start flush with the top of its card.
          stripOffsetFromTop:
            strip && card
              ? Math.round(strip.getBoundingClientRect().top - card.getBoundingClientRect().top)
              : null,
        }
      }),
      // Every card's "Browse ..." link sits on one line across the row.
      seriesLinkTops: [...document.querySelectorAll('[data-shop-series-card]')].map((card) =>
        Math.round(
          [...card.querySelectorAll('span')]
            .find((span) => span.textContent?.startsWith('Browse '))
            ?.getBoundingClientRect().top ?? -1,
        ),
      ),
      // Section blurbs live under their heading, never appended to the count.
      sectionCountLines: [...document.querySelectorAll('[data-shop-section-head]')].map((head) =>
        head.parentElement?.querySelector('p')?.textContent?.trim(),
      ),
      sectionBlurbCount: document.querySelectorAll('[data-shop-section-blurb]').length,
      printSizes: [...document.querySelectorAll('[data-shop-print-size]')].map((element) => ({
        slug: element.getAttribute('data-shop-print-size'),
        text: element.textContent?.trim(),
      })),
      sectionHeads: [...document.querySelectorAll('[data-shop-section-head]')].map(
        (head) => head.textContent?.trim(),
      ),
      heroHeight: document.querySelector('h1')?.closest('section')?.getBoundingClientRect().height,
      searchCount: document.querySelectorAll('input[type="search"]').length,
      collectionCount: document.querySelectorAll('[aria-label="Visualization collections"] button')
        .length,
      // The sort dropdown is gone — with nothing selected there are no selects
      // on the page at all.
      sortCount: document.querySelectorAll('select').length,
      licenseLink: (() => {
        const link = document.querySelector('[data-shop-license-link]')
        return {
          count: document.querySelectorAll('[data-shop-license-link]').length,
          text: link?.textContent?.trim(),
          href: link?.getAttribute('href'),
        }
      })(),
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      alignment: {
        media: firstRowCards.map((card) => rect(card.children[1])),
        downloads: firstRowCards.map((card) =>
          rect(
            [...card.querySelectorAll('a')].find((link) =>
              link.textContent?.includes('Free Download'),
            ),
          ),
        ),
        orders: firstRowCards.map((card) =>
          rect(
            [...card.querySelectorAll('button')].find((button) =>
              button.textContent?.includes('Buy Poster'),
            ),
          ),
        ),
      },
    }
  })

  if (desktop.title !== 'Health ideas, made visible.') {
    throw new Error(`Unexpected shop title: ${desktop.title}`)
  }
  if (
    desktop.heroCtas.length !== 1 ||
    desktop.heroCtas[0] !== 'Browse the collection' ||
    desktop.heroHasEyebrow ||
    !desktop.heroStatesPrice ||
    desktop.heroClaimsPrintOnDemand ||
    desktop.howItWorksBandCount !== 0
  ) {
    throw new Error(`The hero should carry one CTA and the quiet fact line: ${JSON.stringify(desktop)}`)
  }
  if (
    desktop.cardCount === 0 ||
    desktop.addButtonCount !== desktop.cardCount - 1 ||
    desktop.comicButtonCount !== 1 ||
    desktop.unavailableCardCount !== 1 ||
    desktop.downloadCount !== desktop.cardCount ||
    desktop.openSourceLabelCount !== desktop.cardCount ||
    desktop.buyLabels.some((label) => !/^Buy (Poster|Comic)\$\d[\d,.]* · \$\d[\d,.]* shipping$/.test(label)) ||
    !(desktop.posterPrice > 0) ||
    !(desktop.comicPrice > 0) ||
    desktop.comicPrice >= desktop.posterPrice ||
    desktop.shippingLabel <= 0 ||
    desktop.imageDownloadCount !== desktop.cardCount ||
    !desktop.imageDownloadTargetsMatch ||
    desktop.cardFulfillmentLabels !== 0 ||
    desktop.descriptions.length !== desktop.cardCount ||
    new Set(desktop.descriptions).size !== desktop.cardCount ||
    desktop.descriptions.some((description) => description.length < 40) ||
    desktop.genericDescriptionCount !== 0 ||
    desktop.actionLabelAlignments.some((alignment) => alignment !== 'left')
  ) {
    throw new Error(`Expected selectable catalog cards, found ${JSON.stringify(desktop)}`)
  }
  if (desktop.imageCount !== desktop.cardCount || desktop.loadedImageCount !== desktop.cardCount) {
    throw new Error(`Expected an image for every catalog card, found ${JSON.stringify(desktop)}`)
  }
  if (desktop.scrollWidth > desktop.viewportWidth + 3) {
    throw new Error(`Desktop horizontal overflow: ${JSON.stringify(desktop)}`)
  }
  for (const [name, rectangles] of Object.entries(desktop.alignment)) {
    const topRange =
      Math.max(...rectangles.map((item) => item.top)) -
      Math.min(...rectangles.map((item) => item.top))
    const heightRange =
      Math.max(...rectangles.map((item) => item.height)) -
      Math.min(...rectangles.map((item) => item.height))
    if (topRange > 3 || heightRange > 3) {
      throw new Error(`${name} are not aligned: ${JSON.stringify(rectangles)}`)
    }
  }
  if (
    desktop.searchCount !== 1 ||
    desktop.collectionCount !== 7 ||
    desktop.sortCount !== 0 ||
    desktop.licenseLink.count !== 1 ||
    desktop.licenseLink.text !== 'open-source license' ||
    desktop.licenseLink.href !== 'https://creativecommons.org/licenses/by/3.0/us/' ||
    desktop.heroHeight < 600 ||
    desktop.featuredPosterCount !== 4 ||
    !desktop.featuredPostersLoaded ||
    desktop.featuredRailCaptions.length !== 3 ||
    !desktop.featuredRailCaptions.every(
      (caption) => caption && caption.stacked && caption.alignedLeft && caption.withinTile,
    ) ||
    desktop.featuredHeading !== 'Featured visualizations' ||
    desktop.featuredSummaryCount !== 0 ||
    desktop.featuredBrowseLinks !== 2 ||
    desktop.seriesCards.length !== 2 ||
    !desktop.seriesCards.every(
      (card) =>
        card.thumbnails === 3 &&
        card.thumbnailsLoaded &&
        card.hasCount &&
        card.stripOffsetFromTop !== null &&
        card.stripOffsetFromTop <= 1,
    ) ||
    new Set(desktop.seriesLinkTops).size !== 1 ||
    desktop.sectionBlurbCount !== desktop.sectionHeads.length ||
    desktop.sectionCountLines.some((line) => !/^\d+ designs?$/.test(line || '')) ||
    desktop.printSizes.length !== 2 ||
    !desktop.printSizes.some(
      (size) => size.slug === 'determinants-of-health' && size.text === 'Printed about 24 × 36 in',
    ) ||
    !desktop.printSizes.some(
      (size) =>
        size.slug === 'healthcare-is-a-human-right' && size.text === 'Printed about 11 × 14 in',
    ) ||
    // Unfiltered browsing shows curated sections with sub-heads.
    desktop.sectionHeads.length < 5 ||
    desktop.sectionHeads[0] !== 'Design Axioms'
  ) {
    throw new Error(`Catalog navigation or hero decoration is missing: ${JSON.stringify(desktop)}`)
  }

  const featuredItems = await page.$('#artifact-collections')
  if (!featuredItems) throw new Error('Featured Items section is missing')
  await featuredItems.screenshot({ path: '.audit/shop-featured-items.png' })

  const firstRowClip = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-shop-print-card]')].slice(0, 3)
    if (cards.length !== 3) throw new Error('The first catalog row is incomplete')
    const bounds = cards.map((card) => card.getBoundingClientRect())
    const x = Math.min(...bounds.map((item) => item.left))
    const y = Math.min(...bounds.map((item) => item.top)) + window.scrollY
    const right = Math.max(...bounds.map((item) => item.right))
    const bottom = Math.max(...bounds.map((item) => item.bottom)) + window.scrollY
    return { x, y, width: right - x, height: bottom - y }
  })
  await page.screenshot({
    path: '.audit/shop-layout-cards.png',
    clip: firstRowClip,
    captureBeyondViewport: true,
  })

  await page.type('input[type="search"]', 'autism')
  await page.waitForFunction(() => document.querySelectorAll('[data-shop-print-card]').length === 1)
  const searchResult = await page.evaluate(() => ({
    cardCount: document.querySelectorAll('[data-shop-print-card]').length,
    cardTitle: document.querySelector('[data-shop-print-card] h3')?.textContent?.trim(),
  }))
  if (searchResult.cardTitle !== 'Precision Autism') {
    throw new Error(`Search returned the wrong print: ${JSON.stringify(searchResult)}`)
  }

  await page.click('input[type="search"]')
  await page.keyboard.down('Control')
  await page.keyboard.press('A')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  await page.waitForFunction(
    () => document.querySelectorAll('[data-shop-print-card]').length === 31,
  )

  // The floating pay-what-you-want button is gone: support is asked in a
  // once-per-session dialog after a download (or via the cart's own selector).
  const strayTrigger = await page.evaluate(
    () => document.querySelectorAll('[data-shop-donate-trigger]').length,
  )
  if (strayTrigger !== 0) {
    throw new Error(`Floating donate trigger should be removed: found ${strayTrigger}`)
  }

  // A download click opens the support dialog. The download itself is untouched
  // in production; navigation is suppressed here so the test stays on the page.
  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
    const link = document.querySelector('[data-shop-image-download]')
    if (!(link instanceof HTMLElement)) throw new Error('No download link found')
    link.click()
  })
  await page.waitForSelector('[data-shop-support-dialog]', { visible: true })
  const supportDialog = await page.evaluate(() => {
    const trigger = document.querySelector('[data-shop-support-dialog] [data-shop-donate-trigger]')
    return {
      donateText: trigger?.textContent?.trim(),
      chipCount: document.querySelectorAll('[data-shop-support-dialog] [data-shop-donation-chip]').length,
      // The dialog must not carry an email capture: it posted to
      // /api/newsletter/subscribe, which does not exist, so it 404'd on every
      // submission, and the page already has the real newsletter form further
      // down. A second one here also implied a separate list that we do not run.
      // The capture is the studio's ONE newsletter, wired to a route that
      // exists. It must never again promise a separate list.
      hasNewsletterSubmit: Boolean(document.querySelector('[data-shop-newsletter-submit]')),
      promisesASeparateList: /No newsletter unless you ask for it/.test(
        document.querySelector('[data-shop-support-dialog]')?.textContent || '',
      ),
    }
  })
  if (
    supportDialog.donateText !== 'Pay what you want' ||
    supportDialog.chipCount !== 3 ||
    !supportDialog.hasNewsletterSubmit ||
    supportDialog.promisesASeparateList
  ) {
    throw new Error(`Support dialog is incomplete: ${JSON.stringify(supportDialog)}`)
  }

  // "Pay what you want" opens the checkout screen with the support editor.
  await page.click('[data-shop-support-dialog] [data-shop-donate-trigger]')
  await page.waitForSelector('[data-shop-donation-panel]', { visible: true })
  await page.click('[data-shop-donation-panel] [data-shop-donation-chip="15"]')
  await page.waitForFunction(
    () => document.querySelector('[data-shop-order-total]')?.textContent?.includes('$15 contribution'),
  )
  const standaloneSupport = await page.evaluate(() => {
    const panel = document.querySelector('[data-shop-donation-panel]')
    const fallback = document.querySelector('[data-shop-donation-fallback]')
    const checkout = document.querySelector('[data-shop-stripe-checkout]')
    return {
      text: panel?.textContent?.replace(/\s+/g, ' ').trim(),
      total: document.querySelector('[data-shop-order-total]')?.textContent?.trim(),
      fallbackCount: document.querySelectorAll('[data-shop-donation-fallback]').length,
      checkoutCount: document.querySelectorAll('[data-shop-stripe-checkout]').length,
      href: fallback?.getAttribute('href') || '',
      checkoutText: checkout?.textContent?.trim() || '',
    }
  })
  if (
    !standaloneSupport.text?.includes('Add support') ||
    !standaloneSupport.text.includes('Pay-what-you-want for 20+ years') ||
    standaloneSupport.total !== '$15 contribution' ||
    (checkoutConfig.body.checkoutEnabled
      ? standaloneSupport.checkoutCount !== 1 || standaloneSupport.fallbackCount !== 0
      : standaloneSupport.checkoutCount !== 0 ||
        standaloneSupport.fallbackCount !== 1 ||
        !decodeURIComponent(standaloneSupport.href).includes('contribute $15') ||
        !decodeURIComponent(standaloneSupport.href).includes('more than 20 years'))
  ) {
    throw new Error(
      `Standalone pay-what-you-want flow is not ready: ${JSON.stringify(standaloneSupport)}`,
    )
  }
  // Toggle the support back off and close so later flows start from $0.
  await page.click('[data-shop-donation-panel] [data-shop-donation-chip="15"]')
  await page.waitForFunction(
    () => document.querySelector('[data-shop-order-total]')?.textContent?.includes('$0 contribution'),
  )
  await page.click('[data-shop-cart-close]')
  await page.waitForSelector('[data-shop-donation-panel]', { hidden: true })

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Design Axioms',
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Design Axioms filter is missing')
    button.click()
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-shop-print-card]').length === 3)
  const designAxiomsCount = await page.evaluate(
    () => document.querySelectorAll('[data-shop-print-card]').length,
  )
  // Filtering must announce itself: the collection is named and a "Show all"
  // path back is offered, so the vanished prints don't spook anyone.
  const filteredNotice = await page.evaluate(() => {
    const status = document.querySelector('#catalog p[aria-live="polite"]')
    const showAll = status?.querySelector('button')
    return {
      text: status?.textContent?.replace(/\s+/g, ' ').trim(),
      showAllText: showAll?.textContent?.trim(),
    }
  })
  if (
    !filteredNotice.text?.includes('Design Axioms') ||
    !filteredNotice.text.includes('3 of 31 designs') ||
    filteredNotice.showAllText !== 'Show all 31'
  ) {
    throw new Error(`The filtered state is not announced: ${JSON.stringify(filteredNotice)}`)
  }

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Health Cards',
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Health Cards filter is missing')
    button.click()
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-shop-print-card]').length === 3)
  const healthCardsCount = await page.evaluate(
    () => document.querySelectorAll('[data-shop-print-card]').length,
  )

  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim() === 'Design culture',
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Design culture filter is missing')
    button.click()
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-shop-print-card]').length === 4)
  const designCollectionCount = await page.evaluate(
    () => document.querySelectorAll('[data-shop-print-card]').length,
  )
  // The announced "Show all 31" button is the way back from a filter.
  await page.evaluate(() => {
    const button = document.querySelector('#catalog p[aria-live="polite"] button')
    if (!(button instanceof HTMLButtonElement)) throw new Error('Show all button is missing')
    button.click()
  })
  await page.waitForFunction(
    () => document.querySelectorAll('[data-shop-print-card]').length === 31,
  )

  const firstOrderTitle = await page.evaluate(() => {
    const button = [...document.querySelectorAll('[data-shop-print-card] button')].find(
      (candidate) => candidate.textContent?.includes('Buy Poster'),
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('No add-print button found')
    const title = button
      .closest('[data-shop-print-card]')
      ?.querySelector('h3')
      ?.textContent?.trim()
    button.click()
    return title
  })
  if (!firstOrderTitle) throw new Error('Could not resolve the ordered print title')
  await page.waitForSelector('[data-shop-cart-bar]')
  // The first popup breaks out shipping (Jon's feedback): "$30 + $6 shipping",
  // never a bare surprise total.
  const unit = desktop.posterPrice
  const ship = desktop.shippingLabel
  const money = (amount) =>
    `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
  const cartBar = await page.$eval('[data-shop-cart-total]', (element) =>
    element.textContent?.replace(/\s+/g, ' ').trim(),
  )
  if (cartBar !== `${money(unit)} + ${money(ship)} shipping`) {
    throw new Error(`The cart bar should break out shipping: ${JSON.stringify(cartBar)}`)
  }
  await page.evaluate(() => document.querySelector('[data-shop-open-cart]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.waitForSelector('[data-shop-donation-panel]', { visible: true })
  const cart = await page.evaluate(() => {
    const requestLink = [...document.querySelectorAll('a')].find((link) =>
      link.textContent?.includes('Request order'),
    )
    return {
      text: document.querySelector('[data-shop-donation-panel]')?.textContent?.replace(/\s+/g, ' ').trim(),
      href: requestLink?.getAttribute('href'),
      donationChips: document.querySelectorAll('[data-shop-donation-panel] [data-shop-donation-chip]').length,
      customToggle: document.querySelectorAll('[data-shop-donation-custom-toggle]').length,
      fallbackCount: document.querySelectorAll('[data-shop-order-fallback]').length,
      stripeCheckoutCount: document.querySelectorAll('[data-shop-stripe-checkout]').length,
    }
  })

  if (
    !cart.text?.includes(`${money(unit + ship)} total`) ||
    cart.donationChips !== 3 ||
    cart.customToggle !== 1
  ) {
    throw new Error(`The print order request is not ready: ${JSON.stringify(cart)}`)
  }
  if (
    checkoutConfig.body.checkoutEnabled
      ? cart.stripeCheckoutCount !== 1 || cart.fallbackCount !== 0
      : cart.fallbackCount !== 1 ||
        cart.stripeCheckoutCount !== 0 ||
        !cart.href?.startsWith('mailto:') ||
        !decodeURIComponent(cart.href).includes('Optional support: $0') ||
        !decodeURIComponent(cart.href).includes(`Order total: ${money(unit + ship)}`)
  ) {
    throw new Error(`Checkout handoff does not match its configuration: ${JSON.stringify({
      checkoutConfig,
      cart,
    })}`)
  }

  await page.select('[data-shop-cart-quantity]', '3')
  await page.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit * 3 + ship)} total`,
  )
  const quantityOrder = await page.evaluate(() => {
    const requestLink = [...document.querySelectorAll('a')].find((link) =>
      link.textContent?.includes('Request order'),
    )
    const quantitySelect = document.querySelector('[data-shop-cart-quantity]')
    return {
      total: document.querySelector('[data-shop-order-total]')?.textContent?.replace(/\s+/g, ' ').trim(),
      order: decodeURIComponent(requestLink?.getAttribute('href') || ''),
      quantity: quantitySelect instanceof HTMLSelectElement ? quantitySelect.value : '',
      quantityOptionCount: quantitySelect?.querySelectorAll('option').length || 0,
    }
  })
  if (
    quantityOrder.total !== `${money(unit * 3 + ship)} total` ||
    quantityOrder.quantity !== '3' ||
    quantityOrder.quantityOptionCount !== 20 ||
    (!checkoutConfig.body.checkoutEnabled &&
      (!quantityOrder.order.includes(`${firstOrderTitle} × 3: ${money(unit * 3)}`) ||
        !quantityOrder.order.includes(`Order total: ${money(unit * 3 + ship)}`)))
  ) {
    throw new Error(`Print quantity is not reflected in the order: ${JSON.stringify(quantityOrder)}`)
  }
  await page.select('[data-shop-cart-quantity]', '1')
  await page.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit + ship)} total`,
  )

  await page.click('[data-shop-donation-panel] [data-shop-donation-chip="15"]')
  await page.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit + ship + 15)} total`,
  )
  const presetDonation = await page.evaluate(() => {
    const requestLink = [...document.querySelectorAll('a')].find((link) =>
      link.textContent?.includes('Request order'),
    )
    return {
      total: document.querySelector('[data-shop-order-total]')?.textContent?.replace(/\s+/g, ' ').trim(),
      order: decodeURIComponent(requestLink?.getAttribute('href') || ''),
    }
  })
  if (
    !presetDonation.total?.includes(`${money(unit + ship + 15)} total`) ||
    (!checkoutConfig.body.checkoutEnabled &&
      (!presetDonation.order.includes('Optional support: $15') ||
        !presetDonation.order.includes(`Order total: ${money(unit + ship + 15)}`)))
  ) {
    throw new Error(`Preset donation is not reflected in the order: ${JSON.stringify(presetDonation)}`)
  }

  await page.click('[data-shop-donation-custom-toggle]')
  await page.waitForSelector('[data-shop-custom-donation]', { visible: true })
  await page.type('[data-shop-custom-donation]', '12')
  await page.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit + ship + 12)} total`,
  )
  const customDonation = await page.evaluate(() => {
    const requestLink = [...document.querySelectorAll('a')].find((link) =>
      link.textContent?.includes('Request order'),
    )
    return {
      total: document.querySelector('[data-shop-order-total]')?.textContent?.replace(/\s+/g, ' ').trim(),
      order: decodeURIComponent(requestLink?.getAttribute('href') || ''),
      customFieldCount: document.querySelectorAll('[data-shop-custom-donation]').length,
    }
  })
  if (
    customDonation.customFieldCount !== 1 ||
    !customDonation.total?.includes(`${money(unit + ship + 12)} total`) ||
    (!checkoutConfig.body.checkoutEnabled &&
      (!customDonation.order.includes('Optional support: $12') ||
        !customDonation.order.includes(`Order total: ${money(unit + ship + 12)}`)))
  ) {
    throw new Error(`Custom donation is not reflected in the order: ${JSON.stringify(customDonation)}`)
  }
  const orderPanel = await page.$('[data-shop-donation-panel]')
  if (!orderPanel) throw new Error('Checkout screen is missing')
  await orderPanel.screenshot({ path: '.audit/shop-donation-cart.png' })
  await page.click('[data-shop-cart-close]')
  await page.waitForSelector('[data-shop-donation-panel]', { hidden: true })

  await page.evaluate(() => {
    const cta = document.querySelector('[data-poster-chat-cta]')
    if (!(cta instanceof HTMLButtonElement)) throw new Error('Poster chat CTA is missing')
    cta.click()
  })
  await page.waitForSelector('[data-poster-chat-flow]', { visible: true })
  const posterChat = await page.evaluate(() => {
    const widget = document.querySelector('[aria-label="GoInvo chat"]')
    const flow = document.querySelector('[data-poster-chat-flow]')
    const submit = document.querySelector('[data-poster-chat-submit]')
    const fieldNames = [...document.querySelectorAll('[data-poster-chat-field]')].map((field) =>
      field.getAttribute('data-poster-chat-field'),
    )
    const rect = widget?.getBoundingClientRect()
    return {
      flowCount: document.querySelectorAll('[data-poster-chat-flow]').length,
      optionCount: document.querySelectorAll('[data-poster-use-option]').length,
      submitText: submit?.textContent?.trim(),
      intro: flow?.textContent?.replace(/\s+/g, ' ').trim(),
      fieldNames,
      widgetRect: rect
        ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
        : null,
    }
  })
  if (
    posterChat.flowCount !== 1 ||
    posterChat.optionCount !== 6 ||
    posterChat.submitText !== 'Connect with the GoInvo team' ||
    !posterChat.intro?.includes('route your poster request to the right person') ||
    !posterChat.intro?.includes('live conversation with our staff') ||
    !['interests', 'quantity', 'timeline', 'destination', 'name', 'email'].every((field) =>
      posterChat.fieldNames.includes(field),
    ) ||
    !posterChat.widgetRect ||
    posterChat.widgetRect.top < 0 ||
    posterChat.widgetRect.right > 1440 ||
    posterChat.widgetRect.bottom > 1000 ||
    posterChat.widgetRect.left < 0
  ) {
    throw new Error(`Poster chat flow is incomplete: ${JSON.stringify(posterChat)}`)
  }

  await page.click('[data-poster-use-option][value="other"]')
  await page.waitForSelector('[data-poster-other-use]', { visible: true })
  const otherFieldVisible = await page.$eval(
    '[data-poster-other-use]',
    (field) => field instanceof HTMLInputElement && field.required,
  )
  if (!otherFieldVisible) throw new Error('The required Other field did not appear')

  const chatWidget = await page.$('[aria-label="GoInvo chat"]')
  if (!chatWidget) throw new Error('Chat widget is missing after the poster CTA opens it')
  await chatWidget.screenshot({ path: '.audit/shop-poster-chat.png' })
  await page.$eval('[data-poster-chat-submit]', (submit) =>
    submit.scrollIntoView({ block: 'center' }),
  )
  const posterSubmitVisible = await page.$eval('[data-poster-chat-submit]', (submit) => {
    const rect = submit.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= window.innerHeight
  })
  if (!posterSubmitVisible) throw new Error('Poster chat submit button is not reachable')
  await chatWidget.screenshot({ path: '.audit/shop-poster-chat-details.png' })

  await page.screenshot({
    path: '.audit/shop-concept-desktop.png',
    fullPage: true,
  })

  const mobilePage = await browser.newPage()
  await mobilePage.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
  })
  await mobilePage.goto(`${baseUrl}${storefrontPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await mobilePage.waitForSelector('[data-shop-print-card]')
  await loadLazyImages(mobilePage)
  const mobile = await mobilePage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    cardCount: document.querySelectorAll('[data-shop-print-card]').length,
  }))
  if (mobile.scrollWidth > mobile.viewportWidth + 3 || mobile.cardCount !== desktop.cardCount) {
    throw new Error(`Mobile layout mismatch: ${JSON.stringify(mobile)}`)
  }
  await mobilePage.screenshot({
    path: '.audit/shop-concept-mobile.png',
    fullPage: true,
  })
  // The support ask opens after a download (once per session), then hands off
  // to the checkout screen.
  await mobilePage.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    })
    const link = document.querySelector('[data-shop-image-download]')
    if (!(link instanceof HTMLElement)) throw new Error('Mobile download link is missing')
    link.click()
  })
  await mobilePage.waitForSelector('[data-shop-support-dialog]', { visible: true })
  await mobilePage.click('[data-shop-support-dialog] [data-shop-donate-trigger]')
  await mobilePage.waitForSelector('[data-shop-donation-panel]', { visible: true })
  const mobileStandaloneSupport = await mobilePage.evaluate(() => {
    const panel = document.querySelector('[data-shop-donation-panel]')
    const rect = panel?.getBoundingClientRect()
    return {
      text: panel?.textContent?.replace(/\s+/g, ' ').trim(),
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      panelRect: rect
        ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
        : null,
    }
  })
  if (
    !mobileStandaloneSupport.text?.includes('Add support') ||
    mobileStandaloneSupport.scrollWidth > mobileStandaloneSupport.viewportWidth + 3 ||
    !mobileStandaloneSupport.panelRect ||
    mobileStandaloneSupport.panelRect.left < 0 ||
    mobileStandaloneSupport.panelRect.right > 390 ||
    mobileStandaloneSupport.panelRect.bottom > 844
  ) {
    throw new Error(
      `Mobile standalone support layout mismatch: ${JSON.stringify(mobileStandaloneSupport)}`,
    )
  }
  const mobileSupportPanel = await mobilePage.$('[data-shop-donation-panel]')
  if (!mobileSupportPanel) throw new Error('Mobile standalone support panel is missing')
  await mobileSupportPanel.screenshot({ path: '.audit/shop-support-mobile.png' })
  await mobilePage.click('[data-shop-cart-close]')
  await mobilePage.waitForSelector('[data-shop-donation-panel]', { hidden: true })
  await mobilePage.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.includes('Buy Poster'),
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Mobile order button is missing')
    button.click()
  })
  await mobilePage.waitForSelector('[data-shop-cart-bar]')
  await mobilePage.evaluate(() => document.querySelector('[data-shop-open-cart]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await mobilePage.waitForSelector('[data-shop-donation-panel]', { visible: true })
  await mobilePage.select('[data-shop-cart-quantity]', '3')
  await mobilePage.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit * 3 + ship)} total`,
  )
  const mobileQuantity = await mobilePage.evaluate(() => {
    const select = document.querySelector('[data-shop-cart-quantity]')
    const rect = select?.getBoundingClientRect()
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      total: document.querySelector('[data-shop-order-total]')?.textContent?.replace(/\s+/g, ' ').trim(),
      selectRect: rect
        ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
        : null,
    }
  })
  if (
    mobileQuantity.scrollWidth > mobileQuantity.viewportWidth + 3 ||
    mobileQuantity.total !== `${money(unit * 3 + ship)} total` ||
    !mobileQuantity.selectRect ||
    mobileQuantity.selectRect.left < 0 ||
    mobileQuantity.selectRect.right > 390
  ) {
    throw new Error(`Mobile print quantity layout mismatch: ${JSON.stringify(mobileQuantity)}`)
  }
  await mobilePage.select('[data-shop-cart-quantity]', '1')
  await mobilePage.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit + ship)} total`,
  )
  await mobilePage.click('[data-shop-donation-panel] [data-shop-donation-chip="15"]')
  await mobilePage.waitForFunction(
    (expected) => document.querySelector('[data-shop-order-total]')?.textContent?.includes(expected),
    {},
    `${money(unit + ship + 15)} total`,
  )
  const mobileDonation = await mobilePage.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    total: document.querySelector('[data-shop-order-total]')?.textContent?.replace(/\s+/g, ' ').trim(),
    chipCount: document.querySelectorAll('[data-shop-donation-panel] [data-shop-donation-chip]').length,
    panelRect: (() => {
      const rect = document
        .querySelector('[data-shop-donation-panel]')
        ?.getBoundingClientRect()
      return rect
        ? { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left }
        : null
    })(),
  }))
  if (
    mobileDonation.scrollWidth > mobileDonation.viewportWidth + 3 ||
    mobileDonation.total !== `${money(unit + ship + 15)} total` ||
    mobileDonation.chipCount !== 3 ||
    !mobileDonation.panelRect ||
    mobileDonation.panelRect.left < 0 ||
    mobileDonation.panelRect.right > 390 ||
    mobileDonation.panelRect.bottom > 844
  ) {
    throw new Error(`Mobile donation layout mismatch: ${JSON.stringify(mobileDonation)}`)
  }
  const mobileOrderPanel = await mobilePage.$('[data-shop-donation-panel]')
  if (!mobileOrderPanel) throw new Error('Mobile checkout screen is missing')
  await mobileOrderPanel.screenshot({ path: '.audit/shop-donation-cart-mobile.png' })
  await mobilePage.click('[data-shop-cart-close]')
  await mobilePage.waitForSelector('[data-shop-donation-panel]', { hidden: true })

  await mobilePage.evaluate(() => {
    const cta = document.querySelector('[data-poster-chat-cta]')
    if (!(cta instanceof HTMLButtonElement)) throw new Error('Mobile poster chat CTA is missing')
    cta.click()
  })
  await mobilePage.waitForSelector('[data-poster-chat-flow]', { visible: true })
  await mobilePage.click('[data-poster-use-option][value="other"]')
  await mobilePage.$eval('[data-poster-chat-submit]', (submit) =>
    submit.scrollIntoView({ block: 'center' }),
  )
  const mobileChat = await mobilePage.evaluate(() => {
    const widget = document.querySelector('[aria-label="GoInvo chat"]')
    const submit = document.querySelector('[data-poster-chat-submit]')
    const widgetRect = widget?.getBoundingClientRect()
    const submitRect = submit?.getBoundingClientRect()
    return {
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      optionCount: document.querySelectorAll('[data-poster-use-option]').length,
      otherFieldCount: document.querySelectorAll('[data-poster-other-use]').length,
      widgetRect: widgetRect
        ? {
            top: widgetRect.top,
            right: widgetRect.right,
            bottom: widgetRect.bottom,
            left: widgetRect.left,
          }
        : null,
      submitVisible: submitRect
        ? submitRect.top >= 0 && submitRect.bottom <= window.innerHeight
        : false,
    }
  })
  if (
    mobileChat.scrollWidth > mobileChat.viewportWidth + 3 ||
    mobileChat.optionCount !== 6 ||
    mobileChat.otherFieldCount !== 1 ||
    !mobileChat.widgetRect ||
    mobileChat.widgetRect.top < 0 ||
    mobileChat.widgetRect.right > 390 ||
    mobileChat.widgetRect.bottom > 844 ||
    mobileChat.widgetRect.left < 0 ||
    !mobileChat.submitVisible
  ) {
    throw new Error(`Mobile poster chat layout mismatch: ${JSON.stringify(mobileChat)}`)
  }
  const mobileChatWidget = await mobilePage.$('[aria-label="GoInvo chat"]')
  if (!mobileChatWidget) throw new Error('Mobile chat widget is missing')
  await mobileChatWidget.screenshot({ path: '.audit/shop-poster-chat-mobile.png' })

  // Homepage "bring GoInvo home" section: one CTA (no second "Download the
  // files" button → no anchor-jump double hop), the shop hero's matted poster
  // spray, and the $30 fact line (Juhan's feedback, 2026-08-07).
  const homePage = await browser.newPage()
  await homePage.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
  // The homepage is not changing yet, so NO ordinary visitor may see the
  // section — including one the edge assigned to the cohort that would show it.
  // The flag's defaultValue is 'present', so a plain visit is exactly the case
  // that would leak a homepage change.
  for (const [label, path] of [
    ['a plain visitor', '/'],
    ['the control cohort', '/?home-shop-section-variant=control'],
  ]) {
    const visitorPage = await browser.newPage()
    await visitorPage.goto(`${baseUrl}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    })
    await new Promise((resolve) => setTimeout(resolve, 4_000))
    const sections = await visitorPage.evaluate(
      () => document.querySelectorAll('#goinvo-at-home').length,
    )
    const assignedVariant = await visitorPage.evaluate(
      () => (document.cookie.match(/home-shop-section-variant=([a-z]*)/) || [])[1] || null,
    )
    if (sections !== 0) {
      throw new Error(
        `The homepage must be unchanged for ${label} (assigned "${assignedVariant}"), found ${sections} section(s)`,
      )
    }
    await visitorPage.close()
  }

  await homePage.goto(`${baseUrl}/?home-shop-section-variant=present`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await homePage.waitForSelector('#goinvo-at-home')
  await homePage.evaluate(() =>
    document.getElementById('goinvo-at-home')?.scrollIntoView({ block: 'center' }),
  )
  await homePage.waitForFunction(
    () =>
      [...document.querySelectorAll('#goinvo-at-home img')].length > 0 &&
      [...document.querySelectorAll('#goinvo-at-home img')].every(
        (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
      ),
    { timeout: 60_000 },
  )
  const homeSection = await homePage.evaluate(() => {
    const section = document.getElementById('goinvo-at-home')
    if (!section) return null
    // The poster spray is a decorative tabindex=-1 link; the real CTAs are the
    // remaining links.
    const ctaTexts = [...section.querySelectorAll('a:not([tabindex="-1"])')]
      .map((link) => link.textContent?.trim())
      .filter((text) => text && text.length > 0)
    const sprayTiles = [...section.querySelectorAll('a[tabindex="-1"] > span')]
    return {
      ctaTexts,
      mentionsDownloadFiles: (section.textContent || '').includes('Download the files'),
      // The homepage must NOT quote a print price: prices are CMS-owned, so a
      // hardcoded number here goes stale the first time an editor changes one.
      // Shipping is a code constant, so naming it is safe.
      statesPrice: /Free open-source PDFs · Prints ship flat-rate in the US/.test(
        section.textContent || '',
      ),
      quotesAStalePrice: /\$\d[\d,.]* per print/.test(section.textContent || ''),
      sprayTileCount: sprayTiles.length,
      // Tailwind v4 rotate-* utilities set the CSS `rotate` property.
      sprayTilted: sprayTiles.filter((tile) => {
        const style = getComputedStyle(tile)
        return style.transform !== 'none' || (style.rotate && style.rotate !== 'none')
      }).length,
      sprayMatted: sprayTiles.every((tile) =>
        getComputedStyle(tile).backgroundColor.startsWith('rgb(247'),
      ),
    }
  })
  if (
    !homeSection ||
    homeSection.ctaTexts.length !== 1 ||
    homeSection.ctaTexts[0] !== 'Explore the collection' ||
    homeSection.mentionsDownloadFiles ||
    !homeSection.statesPrice ||
    homeSection.quotesAStalePrice ||
    homeSection.sprayTileCount !== 3 ||
    homeSection.sprayTilted !== 3 ||
    !homeSection.sprayMatted
  ) {
    throw new Error(`The homepage prints section is not right: ${JSON.stringify(homeSection)}`)
  }
  const homeSectionHandle = await homePage.$('#goinvo-at-home')
  await homeSectionHandle.screenshot({ path: '.audit/home-goinvo-at-home.png' })

  // A shared link carries the #goinvo-at-home fragment. The section mounts
  // after hydration, so the browser's own attempt to resolve that fragment
  // finds nothing; the gate has to finish the jump or the recipient lands on
  // the hero with the section thousands of pixels below the fold.
  const anchorPage = await browser.newPage()
  await anchorPage.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
  await anchorPage.goto(`${baseUrl}/?home-shop-section-variant=present#goinvo-at-home`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await anchorPage.waitForSelector('#goinvo-at-home', { timeout: 30_000 })
  await anchorPage.waitForFunction(() => window.scrollY > 0, { timeout: 15_000 }).catch(() => {})
  const anchorScroll = await anchorPage.evaluate(() => {
    const element = document.getElementById('goinvo-at-home')
    const bounds = element?.getBoundingClientRect()
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: bounds ? Math.round(bounds.top) : null,
      inViewport: bounds ? bounds.top < window.innerHeight && bounds.bottom > 0 : false,
    }
  })
  if (!anchorScroll.inViewport || anchorScroll.scrollY <= 0) {
    throw new Error(`The #goinvo-at-home deep link did not scroll: ${JSON.stringify(anchorScroll)}`)
  }
  await anchorPage.close()

  console.log(
    JSON.stringify(
      {
        desktop,
        shopRedirect,
        checkoutConfig,
        searchResult,
        designAxiomsCount,
        filteredNotice,
        healthCardsCount,
        designCollectionCount,
        firstOrderTitle,
        cartBar,
        homeSection,
        anchorScroll,
        supportDialog,
        standaloneSupport,
        cart,
        quantityOrder,
        presetDonation,
        customDonation,
        posterChat,
        otherFieldVisible,
        posterSubmitVisible,
        mobile,
        mobileStandaloneSupport,
        mobileQuantity,
        mobileDonation,
        mobileChat,
      },
      null,
      2,
    ),
  )
} finally {
  await browser.close()
}
