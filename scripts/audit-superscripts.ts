import puppeteer, { type Page } from 'puppeteer'

type SupSnapshot = {
  text: string
  context: string
}

const DEFAULT_PATHS = ['/work/mount-sinai-consent']

function normalizeUrl(base: string, path: string) {
  const trimmedBase = base.replace(/\/$/, '')
  return `${trimmedBase}${path.startsWith('/') ? path : `/${path}`}`
}

function parseArgs() {
  const args = process.argv.slice(2)
  const paths: string[] = []
  let nextBase = process.env.NEXT_BASE_URL || 'http://localhost:3000'
  let gatsbyBase = process.env.GATSBY_BASE_URL || 'https://www.goinvo.com'

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--next') {
      nextBase = args[++index]
      continue
    }
    if (arg === '--gatsby') {
      gatsbyBase = args[++index]
      continue
    }
    paths.push(arg)
  }

  return {
    paths: paths.length > 0 ? paths : DEFAULT_PATHS,
    nextBase,
    gatsbyBase,
  }
}

async function getSuperscripts(page: Page, url: string): Promise<SupSnapshot[]> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })

  return page.evaluate(`
    (() => {
      const normalize = (text) => text.replace(/\\s+/g, ' ').trim()
      const root = document.querySelector('main') || document.body

      return Array.from(root.querySelectorAll('sup'))
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
        })
        .map((element) => {
          const text = normalize(element.textContent || '')
          const block =
            element.closest('p, li, blockquote, figcaption, h1, h2, h3, h4, h5, h6') ||
            element.parentElement ||
            root

          const beforeRange = document.createRange()
          beforeRange.setStart(block, 0)
          beforeRange.setEndBefore(element)

          const afterRange = document.createRange()
          afterRange.setStartAfter(element)
          afterRange.setEnd(block, block.childNodes.length)

          const before = normalize(beforeRange.toString()).slice(-42)
          const after = normalize(afterRange.toString()).slice(0, 42)

          beforeRange.detach()
          afterRange.detach()

          return {
            text,
            context: before + '[' + text + ']' + after,
          }
        })
    })()
  `)
}

function snapshotKey(snapshot: SupSnapshot) {
  return `${snapshot.text}::${snapshot.context}`
}

function diffSuperscripts(gatsby: SupSnapshot[], next: SupSnapshot[]) {
  const gatsbySet = new Set(gatsby.map(snapshotKey))
  const nextSet = new Set(next.map(snapshotKey))

  return {
    missing: gatsby.filter((snapshot) => !nextSet.has(snapshotKey(snapshot))),
    extra: next.filter((snapshot) => !gatsbySet.has(snapshotKey(snapshot))),
  }
}

async function main() {
  const { paths, nextBase, gatsbyBase } = parseArgs()
  if (paths.length === 0) {
    throw new Error('Superscript audit checked 0 paths.')
  }

  const browser = await puppeteer.launch({ headless: true })
  const failures: string[] = []

  try {
    for (const path of paths) {
      const gatsbyUrl = normalizeUrl(gatsbyBase, path)
      const nextUrl = normalizeUrl(nextBase, path)
      const gatsbyPage = await browser.newPage()
      const nextPage = await browser.newPage()

      const [gatsbySuperscripts, nextSuperscripts] = await (async () => {
        try {
          return await Promise.all([
            getSuperscripts(gatsbyPage, gatsbyUrl),
            getSuperscripts(nextPage, nextUrl),
          ])
        } finally {
          await gatsbyPage.close()
          await nextPage.close()
        }
      })()

      const diff = diffSuperscripts(gatsbySuperscripts, nextSuperscripts)

      console.log(
        `${path}: Gatsby ${gatsbySuperscripts.length} superscripts, Next ${nextSuperscripts.length} superscripts`
      )

      if (diff.missing.length || diff.extra.length) {
        failures.push(
          [
            `${path} superscript mismatch`,
            ...diff.missing.map((item) => `  MISSING ${item.text}: ${item.context}`),
            ...diff.extra.map((item) => `  EXTRA ${item.text}: ${item.context}`),
          ].join('\n')
        )
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`Checked ${paths.length} page${paths.length === 1 ? '' : 's'}.`)

  if (failures.length) {
    throw new Error(failures.join('\n\n'))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
