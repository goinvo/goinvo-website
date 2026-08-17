import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'

import { strToU8, zipSync } from 'fflate'
import { chromium, type BrowserContext, type Locator, type Page } from 'playwright'

const ROOT = process.cwd()
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')
const RESULTS_DIR = path.join(ROOT, 'test-results', 'marketing-principal')
const HARNESS_PATH = '/marketing-e2e-harness/principal'
const EMPLOYEE_NAMES = ['Jen Patel', 'Eric Benoit', 'Sharon Lee', 'Juhan Sonin', 'Huahua Zhu']
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function excelColumn(index: number) {
  let column = ''
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    column = String.fromCharCode(65 + ((value - 1) % 26)) + column
  }
  return column
}

/** Build a standards-shaped XLSX package in memory so this scenario tests the
 * browser file boundary and workbook parser rather than a CSV renamed to XLSX. */
function bossNetworkWorkbook() {
  const rows = [
    ['Full Name', 'Company', 'Title', 'Email', 'Phone', 'LinkedIn', 'How We Know', 'Owner', 'Segment', 'Warmth'],
    [
      'Morgan Rivera',
      'Northstar Health',
      'VP Product',
      'Morgan.Rivera@Example.com',
      '+1 617 555 0199',
      'https://www.linkedin.com/in/morgan-rivera',
      'Met at HIMSS',
      'Alex',
      'Provider / Health System',
      'Warm',
    ],
    [
      'Samir Okafor',
      'Signal Diagnostics',
      'Chief Digital Officer',
      'samir@signal.example',
      '+1 212 555 0142',
      'https://www.linkedin.com/in/samir-okafor',
      'Former client introduction',
      'Rebecca',
      'Med-Device / Diagnostics',
      'Hot',
    ],
  ]
  const sheetData = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = `${excelColumn(columnIndex)}${rowIndex + 1}`
      return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const files = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '</Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets><sheet name="Boss Network" sheetId="1" r:id="rId1"/></sheets></workbook>',
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
      '</Relationships>',
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`,
    ),
  }
  return Buffer.from(zipSync(files))
}

async function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${args.join(' ')} failed (${signal || code})`))
    })
  })
}

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not allocate a local Marketing E2E port.'))
        return
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })
}

async function waitForServer(url: string, server: ChildProcess) {
  const deadline = Date.now() + 60_000
  let lastError: unknown = null
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Next.js exited before serving the harness (${server.exitCode}).`)
    try {
      const response = await fetch(url, { redirect: 'manual' })
      if (response.status === 200) return
      lastError = new Error(`Harness returned ${response.status}.`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Marketing E2E server did not become ready: ${String(lastError)}`)
}

async function eventually(
  assertion: () => Promise<void>,
  label: string,
  timeoutMs = 6_000,
) {
  const deadline = Date.now() + timeoutMs
  let lastError: unknown = null
  while (Date.now() < deadline) {
    try {
      await assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
  throw new Error(`${label}: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function expectCount(locator: Locator, count: number, label: string) {
  await eventually(async () => assert.equal(await locator.count(), count), label)
}

async function expectEnabled(locator: Locator, enabled: boolean, label: string) {
  await eventually(async () => assert.equal(await locator.isEnabled(), enabled), label)
}

async function expectText(locator: Locator, text: string, label: string) {
  await eventually(async () => assert.equal((await locator.textContent())?.trim(), text), label)
}

async function expectFocused(locator: Locator, label: string) {
  await eventually(
    async () => assert.equal(await locator.evaluate((element) => document.activeElement === element), true),
    label,
  )
}

function captureBrowserFailures(page: Page, label: string, failures: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`${label} console: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`))
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'unknown error'
    // Chromium can cancel a still-pending Google font when the isolated
    // scenario page closes. That exact external font cancellation says nothing
    // about application behavior; every other failed request remains fatal.
    const benignFontCancellation = request.resourceType() === 'font'
      && errorText === 'net::ERR_ABORTED'
      && new URL(request.url()).hostname === 'fonts.gstatic.com'
    if (!benignFontCancellation) {
      failures.push(`${label} request failed: ${request.method()} ${request.url()} (${errorText})`)
    }
  })
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`${label} response: ${response.status()} ${response.request().method()} ${response.url()}`)
    }
  })
}

async function runCorruptStorageRecovery(page: Page, baseUrl: string) {
  // Seed before application scripts run. Writing after the first render raced
  // the empty-state persistence effect on slower CI runners, so the fixture
  // could be cleared before reload and the test would exercise no recovery.
  const storageKey = 'goinvo.marketing.outreach.intake.v1'
  const corruptStoredIntake = JSON.stringify({
    entries: ['Stored Person — Acme'],
    draft: '',
    preview: [{ name: 'Stored Person', organization: { unexpected: true } }],
  })
  await page.addInitScript(
    `window.sessionStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(corruptStoredIntake)});`,
  )
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  await expectCount(
    page.getByRole('rowheader', { name: 'Stored Person', exact: true }),
    1,
    'A malformed cached preview must not destroy the recoverable source row',
  )
  await expectEnabled(
    page.getByRole('button', { name: 'Review 1 Contact', exact: true }),
    true,
    'A malformed cached preview must fall back to a fresh contact review',
  )
  await expectCount(
    page.getByRole('button', { name: /Add \d+ Contacts?/, exact: true }),
    0,
    'A malformed cached preview must never remain eligible to create contacts',
  )
}

async function runUnavailableStorageWarning(page: Page, baseUrl: string) {
  // Pass source text so TS/esbuild cannot inject a module-scoped helper into a
  // function that Playwright serializes in isolation. A transformed `__name`
  // call here previously made the test silently exercise normal storage.
  await page.addInitScript(`
    (() => {
      const prototype = Object.getPrototypeOf(window.sessionStorage)
      const originalSetItem = prototype.setItem
      prototype.setItem = function (key, value) {
        if (key === 'goinvo.marketing.outreach.intake.v1') {
          throw new DOMException('Synthetic storage denial', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      }
    })()
  `)
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  await composer.fill('No Storage Person — Acme')
  await composer.press('Enter')
  await expectCount(
    page.getByText(/Reload recovery is unavailable in this browser — keep this tab open/),
    1,
    'The UI must not promise reload recovery when browser storage rejects the draft',
  )
  await expectCount(
    page.getByRole('rowheader', { name: 'No Storage Person', exact: true }),
    1,
    'Storage denial must not destroy the in-page draft',
  )
}

async function runHeaderlessTabbedPasteJourney(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  const headerlessRows = [
    'Avery Stone\tNorthstar Health\tavery@northstar.example',
    'Jordan Lee\tSignal Diagnostics\tjordan@signal.example',
  ].join('\r\n')
  await composer.evaluate((element, text) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text/plain', text)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }))
  }, headerlessRows)

  await expectCount(
    page.getByRole('alert').filter({ hasText: 'Spreadsheet not imported.' }),
    0,
    'Headerless tab-delimited rows must not be rejected as a malformed spreadsheet',
  )
  const table = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  const averyRow = table.getByRole('rowheader', { name: 'Avery Stone', exact: true }).locator('..')
  const jordanRow = table.getByRole('rowheader', { name: 'Jordan Lee', exact: true }).locator('..')
  await expectCount(averyRow, 1, 'The first headerless tab-delimited row must remain in the draft')
  await expectCount(jordanRow, 1, 'The second headerless tab-delimited row must remain in the draft')
  await expectText(averyRow.locator('td').nth(0), 'Northstar Health', 'The first tab-delimited organization must be reviewable')
  await expectText(jordanRow.locator('td').nth(0), 'Signal Diagnostics', 'The second tab-delimited organization must be reviewable')
  await expectText(
    averyRow.locator('td').nth(2),
    'avery@northstar.example',
    'The ordinary draft row may show contact details inferred from its source text before review',
  )
  await expectText(averyRow.locator('td').nth(4), 'Manual', 'Headerless tab-delimited rows must stay ordinary manual drafts')
  assert.equal(await composer.inputValue(), '', 'Pasting headerless rows must clear the entry box after staging them')
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Staging headerless tab-delimited rows must not call the intake API',
  )

  const reviewContacts = page.getByRole('button', { name: 'Review 2 Contacts', exact: true })
  await expectEnabled(reviewContacts, true, 'Headerless tab-delimited drafts must remain eligible for review')
  await reviewContacts.click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:2',
    'Both headerless tab-delimited rows must reach the preview request intact',
  )
  await expectCount(
    averyRow.getByText('Ready to add', { exact: true }),
    1,
    'The first reviewed row must be eligible for explicit approval',
  )
  await expectCount(
    jordanRow.getByText('Ready to add', { exact: true }),
    1,
    'The second reviewed row must be eligible for explicit approval',
  )
  await expectText(
    averyRow.locator('td').nth(2),
    '—',
    'After review, the table must not retain an email omitted from the preview payload',
  )
  await expectText(
    averyRow.locator('td').nth(3),
    'warm',
    'After review, the table must display routing data supplied by the preview payload',
  )

  const addContacts = page.getByRole('button', { name: 'Add 2 Contacts', exact: true })
  await expectEnabled(addContacts, true, 'Both reviewed rows must remain explicitly approvable')
  await addContacts.click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:2, intake:create:2',
    'Creation must use exactly the two reviewed preview contacts',
  )
  await page.getByRole('heading', { name: 'Contact records (2)', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Edit Avery Stone', exact: true }).click()
  const editor = page.locator('#outreach-contact-editor')
  await editor.waitFor({ state: 'visible' })
  assert.deepEqual(
    {
      name: await editor.locator('[data-outreach-contact-field="name"]').inputValue(),
      organization: await editor.locator('[data-outreach-contact-field="organization"]').inputValue(),
      email: await editor.locator('[data-outreach-contact-field="email"]').inputValue(),
      warmth: await editor.locator('[data-outreach-contact-field="warmth"]').inputValue(),
    },
    {
      name: 'Avery Stone',
      organization: 'Northstar Health',
      email: '',
      warmth: 'warm',
    },
    'The saved contact must exactly retain the reviewed payload instead of source-text inferences',
  )
}

async function runSpreadsheetImportJourney(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Add contacts', exact: true }).waitFor()
  await expectText(page.getByTestId('harness-request-log'), 'none', 'Import must begin without API requests')

  const importButton = page.getByRole('button', { name: 'Import Excel or CSV', exact: true })
  const fileInput = page.locator('input[type="file"][accept*=".xlsx"]')
  await expectCount(importButton, 1, 'The outreach intake must expose one spreadsheet import action')
  await expectCount(fileInput, 1, 'The outreach intake must expose one bounded spreadsheet file input')
  await fileInput.setInputFiles({
    name: 'boss-network.xlsx',
    mimeType: XLSX_MIME,
    buffer: bossNetworkWorkbook(),
  })

  const importReport = page.locator('[role="status"]')
    .filter({ hasText: '2 contacts staged' })
    .filter({ hasText: 'boss-network.xlsx' })
  await expectCount(importReport, 1, 'A real XLSX upload must render one import report')
  assert.match(
    (await importReport.textContent()) || '',
    /Boss Network.*boss-network\.xlsx/,
    'The report must identify the selected worksheet and source file',
  )
  assert.match(
    (await importReport.textContent()) || '',
    /Full Name.*name.*Company.*organization.*Email.*email/i,
    'The report must disclose the important column mappings',
  )
  assert.match(
    (await importReport.textContent()) || '',
    /Claude is not needed/,
    'An unchanged structured spreadsheet must explain that no prose model is needed',
  )
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Local workbook staging must not cross the intake API boundary',
  )

  const table = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  const morganHeader = table.getByRole('rowheader', { name: 'Morgan Rivera', exact: true })
  const samirHeader = table.getByRole('rowheader', { name: 'Samir Okafor', exact: true })
  await expectCount(morganHeader, 1, 'The first workbook contact must be staged')
  await expectCount(samirHeader, 1, 'The second workbook contact must be staged')
  const morganDraft = (await morganHeader.locator('..').textContent()) || ''
  assert.match(morganDraft, /Northstar Health/, 'The mapped organization must appear in the review row')
  assert.match(morganDraft, /VP Product/, 'The mapped role must appear in the review row')
  assert.match(morganDraft, /Met at HIMSS/, 'The mapped relationship must appear in the review row')
  assert.match(morganDraft, /morgan\.rivera@example\.com/i, 'The mapped email must appear in the review row')
  assert.match(morganDraft, /Spreadsheet/, 'Imported rows must disclose their spreadsheet source')

  // A bad follow-up selection must be non-destructive. This specifically
  // guards against clearing a boss's already-reviewed network on parser error.
  await fileInput.setInputFiles({
    name: 'damaged-boss-network.xlsx',
    mimeType: XLSX_MIME,
    buffer: Buffer.from('this is not an Open XML zip package'),
  })
  const importError = page.getByRole('alert').filter({ hasText: 'Spreadsheet not imported.' })
  await expectCount(importError, 1, 'A malformed XLSX must produce a visible, recoverable error')
  assert.match(
    (await importError.textContent()) || '',
    /existing draft was not changed/i,
    'The malformed-file error must promise only behavior the UI actually preserves',
  )
  await expectCount(morganHeader, 1, 'A malformed follow-up import must preserve the first staged contact')
  await expectCount(samirHeader, 1, 'A malformed follow-up import must preserve the second staged contact')
  await expectCount(importReport, 1, 'A malformed follow-up import must preserve the successful import report')
  await expectFocused(importButton, 'Malformed import recovery must return focus to the import action')
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Malformed workbook handling must stay local and issue no intake request',
  )

  await fileInput.setInputFiles({
    name: 'too-large-boss-network.xlsx',
    mimeType: XLSX_MIME,
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  })
  const oversizedError = page.getByRole('alert').filter({ hasText: 'Spreadsheet not imported.' })
  await expectCount(oversizedError, 1, 'An oversized workbook must fail visibly before parsing')
  assert.match(
    (await oversizedError.textContent()) || '',
    /under 5 MB/i,
    'The oversized-file error must state the enforced limit',
  )
  await expectCount(morganHeader, 1, 'An oversized follow-up import must preserve staged contacts')
  await expectCount(samirHeader, 1, 'An oversized follow-up import must preserve every staged contact')
  await expectFocused(importButton, 'Oversized import recovery must return focus to the import action')
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Oversized workbook rejection must issue no intake request',
  )

  await page.getByRole('button', { name: 'Review 2 Contacts', exact: true }).click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:structured:2',
    'Unedited workbook rows must cross the request boundary as two structured contacts',
  )
  await expectCount(
    morganHeader.locator('..').getByText('Ready to add', { exact: true }),
    1,
    'Structured contact review must leave the imported contact ready for explicit approval',
  )
  await page.getByRole('button', { name: 'Add 2 Contacts', exact: true }).click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:structured:2, intake:create:2',
    'Approved workbook rows must be created exactly once from the reviewed preview',
  )
  await page.getByRole('heading', { name: 'Contact records (2)', exact: true }).waitFor()

  await page.getByRole('button', { name: 'Edit Morgan Rivera', exact: true }).click()
  const editor = page.locator('#outreach-contact-editor')
  await editor.waitFor({ state: 'visible' })
  const importedValues = {
    name: await editor.locator('[data-outreach-contact-field="name"]').inputValue(),
    organization: await editor.locator('[data-outreach-contact-field="organization"]').inputValue(),
    role: await editor.locator('[data-outreach-contact-field="role"]').inputValue(),
    segment: await editor.locator('[data-outreach-contact-field="segment"]').inputValue(),
    warmth: await editor.locator('[data-outreach-contact-field="warmth"]').inputValue(),
    owner: await editor.locator('[data-outreach-contact-field="owner"]').inputValue(),
    email: await editor.locator('[data-outreach-contact-field="email"]').inputValue(),
    phone: await editor.locator('[data-outreach-contact-field="phone"]').inputValue(),
    linkedinUrl: await editor.locator('[data-outreach-contact-field="linkedinUrl"]').inputValue(),
    howWeKnow: await editor.locator('[data-outreach-contact-field="howWeKnow"]').inputValue(),
  }
  assert.deepEqual(
    importedValues,
    {
      name: 'Morgan Rivera',
      organization: 'Northstar Health',
      role: 'VP Product',
      segment: 'provider',
      warmth: 'warm',
      owner: 'Alex',
      email: 'morgan.rivera@example.com',
      phone: '+1 617 555 0199',
      linkedinUrl: 'https://www.linkedin.com/in/morgan-rivera',
      howWeKnow: 'Met at HIMSS',
    },
    'Every supported workbook property must survive staging, review, and contact creation',
  )
}

async function runMixedSpreadsheetAndTypedJourney(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  const fileInput = page.locator('input[type="file"][accept*=".xlsx"]')
  await fileInput.setInputFiles({
    name: 'boss-network.xlsx',
    mimeType: XLSX_MIME,
    buffer: bossNetworkWorkbook(),
  })

  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  await composer.fill('Taylor Brooks — Bright Health — met at HLTH')
  await composer.press('Enter')
  await expectCount(
    page.getByRole('rowheader', { name: 'Taylor Brooks', exact: true }),
    1,
    'A typed contact must coexist with imported workbook contacts',
  )
  await expectCount(
    page.locator('[role="status"]').filter({
      hasText: 'Only typed or edited rows will be structured with Claude; spreadsheet fields stay intact.',
    }),
    1,
    'The mixed-batch privacy copy must describe the actual request split',
  )

  await page.getByRole('button', { name: 'Review 3 Contacts', exact: true }).click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:mixed:2+1',
    'A mixed batch must preserve two structured rows and parse only one typed row',
  )
  const morganRow = page.getByRole('rowheader', { name: 'Morgan Rivera', exact: true }).locator('..')
  assert.match((await morganRow.textContent()) || '', /Alex.*provider.*warm/i, 'Routing fields must remain reviewable after a mixed preview')
  await page.getByRole('button', { name: 'Add 3 Contacts', exact: true }).click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:mixed:2+1, intake:create:3',
    'A reviewed mixed batch must create exactly the three visible contacts',
  )
  await page.getByRole('heading', { name: 'Contact records (3)', exact: true }).waitFor()
}

async function runDesktopJourney(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Add contacts', exact: true }).waitFor()

  await expectText(page.getByTestId('harness-request-log'), 'none', 'Harness must begin without API requests')

  const preflightTrigger = page.getByTestId('show-preflight-coach')
  await preflightTrigger.click()
  let dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await expectFocused(dialog, 'The coach must move keyboard focus into its dialog')
  await expectCount(
    dialog.getByRole('button', { name: 'Add Contacts', exact: true }),
    1,
    'Preflight coach must render Add Contacts',
  )
  await expectCount(dialog.getByText('Got it', { exact: true }), 0, 'Coach must not render Got it')
  await expectCount(dialog.getByText('Not yet', { exact: true }), 0, 'Coach must not render Not yet')
  await page.keyboard.press('Escape')
  await expectCount(page.getByRole('dialog'), 0, 'Escape must close the coach without advancing')
  await expectFocused(preflightTrigger, 'Escape must restore focus to the control that opened the coach')

  await preflightTrigger.click()
  dialog = page.getByRole('dialog')
  await dialog.waitFor()
  await dialog.getByRole('button', { name: 'Close tutorial', exact: true }).click()
  await expectCount(page.getByRole('dialog'), 0, 'Coach X must close without advancing')
  await expectFocused(preflightTrigger, 'Coach X must restore focus to the control that opened the coach')

  await page.getByTestId('show-intake-coach').click()
  dialog = page.getByRole('dialog')
  const mirroredEmptyCheck = dialog.getByRole('button', {
    name: 'Enter a Contact Above in highlighted panel',
    exact: true,
  })
  await mirroredEmptyCheck.waitFor()
  await expectEnabled(mirroredEmptyCheck, false, 'Empty intake must explain that a contact is required')
  await dialog.getByRole('button', { name: 'Close tutorial', exact: true }).click()

  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  const oversizedPaste = Array.from({ length: 201 }, (_, index) => `Limit Person ${index} — Limit Org`).join('\n')
  await composer.evaluate((element, text) => {
    const clipboard = new DataTransfer()
    clipboard.setData('text/plain', text)
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboard }))
  }, oversizedPaste)
  await expectCount(
    page.getByRole('alert').filter({ hasText: 'Add at most 200 contacts in one batch.' }),
    1,
    'Limit-plus-one paste must show an inline error',
  )
  await expectCount(
    page.getByRole('table', { name: 'Contact drafts ready to check', exact: true }),
    0,
    'Rejected oversized paste must create no draft rows',
  )
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Rejected oversized paste must issue no request',
  )
  await composer.fill('Resume Person — Reload Org')
  await composer.press('Enter')
  const unsavedWarning = page.locator('[data-outreach-intake-unsaved-warning="true"]')
  await expectCount(unsavedWarning, 1, 'A staged contact must show a prominent unsaved warning')
  assert.match(
    (await unsavedWarning.textContent()) || '',
    /Not saved to Outreach yet.*needs Review Contacts, then Add Contacts/s,
    'The warning must name both remaining save steps',
  )
  await expectCount(
    page.getByText('Team contact-intake status (1)', { exact: true }),
    1,
    'A metadata-only team checkpoint must appear after staging a contact',
  )
  await page.waitForFunction(() => window.sessionStorage.getItem('goinvo.marketing.outreach.intake.v1')?.includes('Resume Person'))
  const leaveDialogPromise = page.waitForEvent('dialog')
  const reloadPromise = page.reload({ waitUntil: 'networkidle' })
  const leaveDialog = await leaveDialogPromise
  assert.equal(leaveDialog.type(), 'beforeunload', 'Leaving with staged contacts must trigger the browser warning')
  await leaveDialog.accept()
  await reloadPromise
  const resumedTable = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  await expectCount(
    resumedTable.getByRole('rowheader', { name: 'Resume Person', exact: true }),
    1,
    'Unsaved contact rows must resume after a reload in the same tab',
  )
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Reloading a local draft must not issue an intake request',
  )
  await page.getByRole('button', { name: 'Remove Resume Person from Add Contacts', exact: true }).click()
  await composer.fill('Failure Person — FAIL_PREVIEW')
  await composer.press('Enter')
  await page.getByRole('button', { name: 'Review 1 Contact', exact: true }).click()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:error',
    'Synthetic failure must cross the real request boundary exactly once',
  )
  await expectCount(
    page.getByRole('alert').filter({ hasText: 'Synthetic preview failure.' }),
    1,
    'Preview failure must be explained without destroying the draft',
  )
  await expectCount(
    page.getByRole('rowheader', { name: 'Failure Person', exact: true }),
    1,
    'Preview failure must preserve the recoverable source row',
  )
  await expectEnabled(
    page.getByRole('button', { name: 'Review 1 Contact', exact: true }),
    true,
    'Preview failure must release the pending state for retry',
  )
  await page.getByRole('button', { name: 'Remove Failure Person from Add Contacts', exact: true }).click()
  await page.waitForFunction(() => window.sessionStorage.getItem('goinvo.marketing.outreach.intake.v1') === null)
  await page.reload({ waitUntil: 'networkidle' })
  await expectText(page.getByTestId('harness-request-log'), 'none', 'Fresh harness must reset the failure log')
  const manualDraft = 'Ada Lovelace — Analytical Engines'
  await composer.fill(manualDraft)
  await composer.press('Enter')
  let draftTable = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  await expectCount(
    draftTable.getByRole('rowheader', { name: 'Ada Lovelace', exact: true }),
    1,
    'Enter must create one structured contact row',
  )
  await assert.doesNotReject(async () => assert.equal(await composer.inputValue(), ''))
  await page.getByRole('button', { name: 'Remove Ada Lovelace from Add Contacts', exact: true }).click()
  await expectCount(draftTable, 0, 'Removing the final row must remove the draft table')
  assert.equal(await composer.evaluate((element) => document.activeElement === element), true)
  await expectEnabled(
    page.getByRole('button', { name: 'Enter a Contact Above', exact: true }),
    false,
    'Removing the final row must restore the explicit empty-state action',
  )

  await page.getByRole('button', { name: 'Suggest from our past work', exact: true }).click()
  await page.getByRole('heading', { name: 'People (1)', exact: true }).waitFor()
  await page.getByRole('heading', { name: 'Organizations (2)', exact: true }).waitFor()
  for (const employeeName of EMPLOYEE_NAMES) {
    await expectCount(page.getByText(employeeName, { exact: true }), 0, `${employeeName} must be excluded`)
  }

  const addZero = page.getByRole('button', { name: 'Add 0 selected', exact: true })
  await expectEnabled(addZero, false, 'Nothing may be selected by default')
  await page.getByRole('button', { name: 'Check all suggestions', exact: true }).click()
  await expectCount(page.locator('input[type="checkbox"]:checked'), 3, 'Global Check all must select every suggestion')
  await expectEnabled(
    page.getByRole('button', { name: 'Add 3 selected', exact: true }),
    true,
    'Global selection must enable Add 3 selected',
  )
  await page.getByRole('button', { name: 'Uncheck all people', exact: true }).click()
  await expectCount(page.locator('input[type="checkbox"]:checked'), 2, 'People toggle must preserve organizations')
  await page.getByRole('button', { name: 'Uncheck all organizations', exact: true }).click()
  await expectCount(page.locator('input[type="checkbox"]:checked'), 0, 'Organization toggle must clear only organizations')
  await page.getByRole('button', { name: 'Check all organizations', exact: true }).click()
  await expectCount(page.locator('input[type="checkbox"]:checked'), 2, 'Organization toggle must select both organizations')
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Selecting suggestions must not call an API',
  )

  if (process.env.MARKETING_E2E_MUTATION === 'noop-add-selected') {
    await page.evaluate(() => {
      document.addEventListener(
        'click',
        (event) => {
          const button = (event.target as Element | null)?.closest('button')
          if (button?.textContent?.trim() !== 'Add 2 selected') return
          event.preventDefault()
          event.stopImmediatePropagation()
        },
        true,
      )
    })
  }

  await page.getByRole('button', { name: 'Add 2 selected', exact: true }).click()
  draftTable = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  await expectCount(
    draftTable.getByRole('rowheader', { name: '3M', exact: true }),
    1,
    'Add selected must stage the 3M row',
  )
  await expectCount(
    draftTable.getByRole('rowheader', { name: 'IPSOS', exact: true }),
    1,
    'Add selected must stage the IPSOS row',
  )
  const draftFilter = page.getByRole('searchbox', { name: 'Filter contact drafts', exact: true })
  await draftFilter.fill('3m')
  await expectText(
    page.getByText('Showing 1 of 2 contact drafts.', { exact: true }),
    'Showing 1 of 2 contact drafts.',
    'Draft filtering must narrow the structured table',
  )
  await draftFilter.fill('')
  await page.getByRole('combobox', { name: 'Sort contact drafts', exact: true }).selectOption('name')
  assert.deepEqual(
    await draftTable.getByRole('rowheader').allTextContents(),
    ['3M', 'IPSOS'],
    'Name sorting must order draft rows ascending',
  )
  await page.getByRole('button', { name: 'Sort contact drafts descending', exact: true }).click()
  assert.deepEqual(
    await draftTable.getByRole('rowheader').allTextContents(),
    ['IPSOS', '3M'],
    'Direction control must reverse draft rows',
  )
  await page.getByRole('button', { name: 'Edit 3M in Add Contacts', exact: true }).click()
  assert.match(await composer.inputValue(), /^3M — account placeholder/)
  await expectCount(
    draftTable.getByRole('rowheader', { name: '3M', exact: true }),
    0,
    'Editing must move the selected row back into the entry box',
  )
  await composer.press('Enter')
  await expectCount(
    draftTable.getByRole('rowheader', { name: '3M', exact: true }),
    1,
    'Enter must return an edited contact to the structured table',
  )
  await expectCount(
    page.getByRole('group', { name: 'Suggestion selection', exact: true }),
    0,
    'Staging suggestions must close the picker',
  )
  await expectText(
    page.getByTestId('harness-request-log'),
    'none',
    'Staging suggestions must not save or call the intake API',
  )

  await page.getByTestId('show-intake-coach').click()
  dialog = page.getByRole('dialog')
  const mirroredCheck = dialog.getByRole('button', {
    name: 'Review 2 Contacts in highlighted panel',
    exact: true,
  })
  await mirroredCheck.waitFor()
  await expectEnabled(mirroredCheck, true, 'Staged rows must enable the mirrored count-based contact review')
  await mirroredCheck.dblclick()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:2',
    'Rapid repeated contact reviews must issue exactly one preview request for two rows',
  )
  assert.match(
    (await unsavedWarning.textContent()) || '',
    /2 reviewed contacts are still only in this browser tab\. Choose Add Contacts before leaving\./,
    'Reviewed contacts must still be labeled unsaved and name the exact final action',
  )
  await page.waitForFunction(() => document.body.textContent?.includes('2 reviewed; Add Contacts not completed'))
  const checkpointPanel = page.locator('[data-outreach-intake-checkpoints="true"]')
  await expectCount(checkpointPanel, 1, 'The team checkpoint panel must remain available during intake')
  assert.match(
    (await checkpointPanel.textContent()) || '',
    /Harness Principal:\s*2 reviewed; Add Contacts not completed/,
    'The team checkpoint must identify review as the point where work stopped',
  )
  const mirroredCreate = dialog.getByRole('button', {
    name: 'Add 2 Contacts in highlighted panel',
    exact: true,
  })
  await mirroredCreate.waitFor()
  await expectEnabled(mirroredCreate, true, 'Parsed preview must enable mirrored Add 2 Contacts')
  await mirroredCreate.dblclick()
  await expectText(
    page.getByTestId('harness-request-log'),
    'intake:preview:2, intake:create:2',
    'Rapid repeated Add Contacts must create exactly two contacts once',
  )
  await dialog.getByRole('button', { name: 'Close tutorial', exact: true }).click()
  await page.getByRole('heading', { name: 'Contact records (2)', exact: true }).waitFor()
  assert.match(
    (await checkpointPanel.textContent()) || '',
    /Harness Principal:\s*2 contacts saved/,
    'The team checkpoint must distinguish durable saved contacts from a reviewed browser draft',
  )
  await expectText(
    page.getByText('Showing 2 of 2 contacts.', { exact: true }),
    'Showing 2 of 2 contacts.',
    'The contact filter must refresh from an immutable post-create snapshot',
  )
  await expectCount(
    page.getByRole('button', { name: 'Research 3M', exact: true }),
    1,
    'The exact approved 3M identity must appear in Contact records',
  )
  await expectCount(
    page.getByRole('button', { name: 'Research IPSOS', exact: true }),
    1,
    'The exact approved IPSOS identity must appear in Contact records',
  )
  await expectEnabled(
    page.getByRole('button', { name: 'Research all new (2)', exact: true }),
    true,
    'Both created contacts must be available to the next workflow step',
  )
  await page.getByRole('button', { name: 'Edit 3M', exact: true }).click()
  const contactEditor = page.locator('#outreach-contact-editor')
  await contactEditor.waitFor({ state: 'visible' })
  await expectCount(
    contactEditor.locator('[data-outreach-contact-field="status"]'),
    0,
    'Contact data editor must not bypass interaction logging with a pipeline-status field',
  )
  await contactEditor.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expectText(
    page.getByTestId('harness-completion'),
    'outreach:addContacts',
    'Successful contact creation must signal Autopilot completion',
  )
}

async function runFullOutreachPipeline(page: Page, baseUrl: string) {
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  await composer.fill('Pipeline Principal — Northstar Health')
  await composer.press('Enter')
  await page.getByRole('button', { name: 'Review 1 Contact', exact: true }).click()
  await page.getByRole('button', { name: 'Add 1 Contact', exact: true }).click()
  await page.getByRole('heading', { name: 'Contact records (1)', exact: true }).waitFor()

  await page.getByRole('button', { name: 'Research all new (1)', exact: true }).click()
  await expectText(
    page.getByTestId('harness-completion'),
    'outreach:research',
    'A saved research result must signal the research step instead of relying on a coach confirmation',
  )
  await expectCount(
    page.locator('[data-tour-id="autopilot-outreach-workflow"]'),
    1,
    'The research and review coach target must exist in rendered output',
  )

  await page.getByRole('button', { name: 'Review brief for Pipeline Principal', exact: true }).click()
  const approve = page.getByRole('button', { name: 'Approve for call plan', exact: true })
  await expectEnabled(approve, true, 'A fully supported researched brief must be explicitly approvable')
  await approve.click()
  await expectText(
    page.getByTestId('harness-completion'),
    'outreach:review',
    'Human approval must signal the review step',
  )

  await page
    .getByRole('region', { name: 'Recommended next outreach', exact: true })
    .getByRole('button', { name: 'Log result for Pipeline Principal', exact: true })
    .click()
  await page.getByPlaceholder('Outcome of the call/message', { exact: true }).fill('Interested; send the diagnostic outline next Tuesday.')
  await page.getByRole('button', { name: 'Save log', exact: true }).click()
  await expectText(
    page.getByTestId('harness-completion'),
    'outreach:log',
    'The pipeline must finish only after a durable interaction is saved',
  )
  const callHistory = page.getByText('Call history (1)', { exact: true }).locator('..')
  await callHistory.getByText('Call history (1)', { exact: true }).click()
  assert.match(
    (await callHistory.textContent()) || '',
    /Interested; send the diagnostic outline next Tuesday\./,
    'The saved interaction must remain visible in the rendered contact history',
  )
}

async function runMobileLayout(page: Page, baseUrl: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}${HARNESS_PATH}`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Suggest from our past work', exact: true }).click()
  await page.getByRole('heading', { name: 'Organizations (2)', exact: true }).waitFor()
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    peopleWidth: document
      .querySelector<HTMLElement>('section[aria-labelledby="outreach-warm-start-people-title"]')
      ?.getBoundingClientRect().width,
    organizationWidth: document
      .querySelector<HTMLElement>('section[aria-labelledby="outreach-warm-start-organizations-title"]')
      ?.getBoundingClientRect().width,
  }))
  assert.ok(metrics.documentWidth <= metrics.viewport + 1, `Mobile page overflows: ${JSON.stringify(metrics)}`)
  assert.ok((metrics.peopleWidth || 0) <= metrics.viewport, `People section overflows: ${JSON.stringify(metrics)}`)
  assert.ok((metrics.organizationWidth || 0) <= metrics.viewport, `Organization section overflows: ${JSON.stringify(metrics)}`)
  await page.getByRole('button', { name: 'Check all organizations', exact: true }).click()
  await expectCount(page.locator('input[type="checkbox"]:checked'), 2, 'Mobile organization toggle must work')
  await page.getByRole('button', { name: 'Add 2 selected', exact: true }).click()
  const composer = page.getByRole('textbox', {
    name: 'Type one contact and press Enter, or paste a list',
    exact: true,
  })
  const longestAllowedName = 'X'.repeat(2_000)
  await composer.fill(longestAllowedName)
  await composer.press('Enter')
  const table = page.getByRole('table', { name: 'Contact drafts ready to check', exact: true })
  await table.waitFor()
  const tableMetrics = await table.evaluate((element, longName) => {
    const scroller = element.parentElement
    const longCell = element.querySelector<HTMLElement>(`tbody th span[title="${longName}"]`)
    const style = longCell ? getComputedStyle(longCell) : null
    const lineHeight = style ? Number.parseFloat(style.lineHeight) : 0
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      scrollerWidth: scroller?.clientWidth || 0,
      scrollerScrollWidth: scroller?.scrollWidth || 0,
      longCellHeight: longCell?.getBoundingClientRect().height || 0,
      lineHeight,
    }
  }, longestAllowedName)
  assert.ok(tableMetrics.documentWidth <= tableMetrics.viewport + 1, `Mobile table escaped its local scroller: ${JSON.stringify(tableMetrics)}`)
  assert.ok(tableMetrics.scrollerScrollWidth > tableMetrics.scrollerWidth, `Mobile table is not locally scrollable: ${JSON.stringify(tableMetrics)}`)
  assert.ok(tableMetrics.longCellHeight > 0, `Longest allowed row was not rendered: ${JSON.stringify(tableMetrics)}`)
  assert.ok(
    tableMetrics.longCellHeight <= tableMetrics.lineHeight * 3 + 3,
    `Longest allowed row was not clamped to three lines: ${JSON.stringify(tableMetrics)}`,
  )
}

async function main() {
  const env = {
    ...process.env,
    ENABLE_MARKETING_E2E_HARNESS: '1',
    NEXT_TELEMETRY_DISABLED: '1',
  }
  await rm(RESULTS_DIR, { recursive: true, force: true })
  await mkdir(RESULTS_DIR, { recursive: true })

  if (process.env.MARKETING_E2E_SKIP_BUILD !== '1') {
    const nextDir = path.resolve(ROOT, '.next')
    assert.equal(path.dirname(nextDir), ROOT, `Refusing to clean build path outside the repository: ${nextDir}`)
    await rm(nextDir, { recursive: true, force: true })
    await run(process.execPath, [NEXT_BIN, 'build'], env)
  }

  const port = await availablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const server = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(port)], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  })
  let context: BrowserContext | null = null
  let browser = null as Awaited<ReturnType<typeof chromium.launch>> | null
  const browserErrors: string[] = []
  let failed = true
  try {
    await waitForServer(`${baseUrl}${HARNESS_PATH}`, server)
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })

    const scenarios = [
      ['corrupt-storage recovery', runCorruptStorageRecovery],
      ['unavailable-storage warning', runUnavailableStorageWarning],
      ['headerless tab-delimited paste', runHeaderlessTabbedPasteJourney],
      ['spreadsheet import and recovery', runSpreadsheetImportJourney],
      ['mixed spreadsheet and typed intake', runMixedSpreadsheetAndTypedJourney],
      ['desktop contact workflow', runDesktopJourney],
      ['full research-review-contact-log pipeline', runFullOutreachPipeline],
      ['mobile containment', runMobileLayout],
    ] as const
    assert.ok(scenarios.length > 0, 'Marketing E2E must discover at least one browser scenario.')
    const completedScenarios: string[] = []
    for (const [label, scenario] of scenarios) {
      const page = await context.newPage()
      captureBrowserFailures(page, label, browserErrors)
      try {
        await scenario(page, baseUrl)
        completedScenarios.push(label)
      } catch (error) {
        const safeLabel = label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
        await page.screenshot({
          path: path.join(RESULTS_DIR, `failure-${safeLabel}.png`),
          fullPage: true,
        }).catch(() => undefined)
        throw error
      } finally {
        await page.close()
      }
    }

    assert.deepEqual(browserErrors, [], `Browser errors:\n${browserErrors.join('\n')}`)
    assert.equal(
      completedScenarios.length,
      scenarios.length,
      `Only ${completedScenarios.length} of ${scenarios.length} Marketing E2E scenarios completed.`,
    )
    failed = false
    console.log(`Marketing principal E2E: PASS (${completedScenarios.length} scenarios: ${completedScenarios.join(', ')})`)
  } catch (error) {
    if (context) {
      const pages = context.pages()
      const page = pages[pages.length - 1]
      if (page) await page.screenshot({ path: path.join(RESULTS_DIR, 'failure.png'), fullPage: true })
    }
    throw error
  } finally {
    if (context) {
      await context.tracing.stop(
        failed ? { path: path.join(RESULTS_DIR, 'trace.zip') } : undefined,
      )
    }
    await browser?.close()
    server.kill('SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 250))
    if (server.exitCode === null) server.kill('SIGKILL')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
