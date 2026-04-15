import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type LegacyCarePlansPage = 'part1' | 'part2' | 'part3'

const LEGACY_HTML_DIR = join(
  process.cwd(),
  'src',
  'app',
  '(main)',
  'vision',
  'care-plans',
  'legacy',
)

const CARE_PLANS_ROUTE = '/vision/care-plans'
const CARE_PLANS_PART_2_ROUTE = '/vision/care-plans/part-2'
const CARE_PLANS_PART_3_ROUTE = '/vision/care-plans/part-3'
const GOINVO_ASSET_PREFIX = 'https://www.goinvo.com'

function addSectionAnchors(page: LegacyCarePlansPage, html: string) {
  if (page === 'part2') {
    return html
      .replace("<div class='part journey'>", "<div id='process' class='part journey'>")
      .replace("<div class='part two'>", "<div id='product' class='part two'>")
      .replace("<div class='part three'>", "<div id='barriers' class='part three'>")
      .replace("<div class='part four featureII'>", "<div id='next-steps' class='part four featureII'>")
  }

  if (page === 'part3') {
    return html
      .replace("<div class='part one featureIII'>", "<div id='digitized' class='part one featureIII'>")
      .replace("<div class='part two featureIII'>", "<div id='standardized' class='part two featureIII'>")
      .replace("<div class='part three featureIII'>", "<div id='data-rich' class='part three featureIII'>")
      .replace("<div class='part four featureIII'>", "<div id='empowering' class='part four featureIII'>")
      .replace("<div class='part five featureIII'>", "<div id='care-team' class='part five featureIII'>")
      .replace("<div class='part six featureIII'>", "<div id='dynamic' class='part six featureIII'>")
      .replace("<div class='part seven featureIII'>", "<div id='health-shift' class='part seven featureIII'>")
      .replace("<div class='part eight featureIII'>", "<div id='conclusions' class='part eight featureIII'>")
      .replace("<div class='part nine featureIII'>", "<div id='call-to-action' class='part nine featureIII'>")
  }

  return html
}

function rewriteLegacyLinks(page: LegacyCarePlansPage, html: string) {
  let nextHtml = html
    .replace(/href=(['"])\/features\/careplans\/part-1\.html\1/g, `href="${CARE_PLANS_ROUTE}"`)
    .replace(/href=(['"])\/features\/careplans\/part-2\.html\1/g, `href="${CARE_PLANS_PART_2_ROUTE}"`)
    .replace(/href=(['"])\/features\/careplans\/part-3\.html\1/g, `href="${CARE_PLANS_PART_3_ROUTE}"`)
    .replace(/href=(['"])\/features\/careplans\/?\1/g, `href="${CARE_PLANS_ROUTE}"`)
    .replace(
      /(src|href)=(['"])\/old\//g,
      (_match, attr: string, quote: string) => `${attr}=${quote}${GOINVO_ASSET_PREFIX}/old/`,
    )

  if (page === 'part2') {
    nextHtml = nextHtml
      .replace(/<a class='one([^']*)' href='javascript:void\(0\)'>/g, "<a class='one$1' href='#process'>")
      .replace(/<a class='two([^']*)' href='javascript:void\(0\)'>/g, "<a class='two$1' href='#product'>")
      .replace(/<a class='three([^']*)' href='javascript:void\(0\)'>/g, "<a class='three$1' href='#barriers'>")
      .replace(/<a class='four([^']*)' href='javascript:void\(0\)'>/g, "<a class='four$1' href='#next-steps'>")
  }

  if (page === 'part3') {
    nextHtml = nextHtml
      .replace(/<a class='one([^']*)' href='javascript:void\(0\)'>/g, "<a class='one$1' href='#digitized'>")
      .replace(/<a class='two([^']*)' href='javascript:void\(0\)'>/g, "<a class='two$1' href='#standardized'>")
      .replace(/<a class='three([^']*)' href='javascript:void\(0\)'>/g, "<a class='three$1' href='#data-rich'>")
      .replace(/<a class='four([^']*)' href='javascript:void\(0\)'>/g, "<a class='four$1' href='#empowering'>")
      .replace(/<a class='five([^']*)' href='javascript:void\(0\)'>/g, "<a class='five$1' href='#dynamic'>")
      .replace(/<a class='six([^']*)' href='javascript:void\(0\)'>/g, "<a class='six$1' href='#care-team'>")
      .replace(/<a class='seven([^']*)' href='javascript:void\(0\)'>/g, "<a class='seven$1' href='#health-shift'>")
      .replace(/<a class='eight([^']*)' href='javascript:void\(0\)'>/g, "<a class='eight$1' href='#conclusions'>")
  }

  return nextHtml
}

function loadLegacyArticle(page: LegacyCarePlansPage) {
  const rawHtml = readFileSync(join(LEGACY_HTML_DIR, `${page}.html`), 'utf8')

  return rewriteLegacyLinks(page, addSectionAnchors(page, rawHtml.replace(/^\uFEFF/, '').trim()))
}

export function LegacyCarePlansArticle({
  page,
}: {
  page: LegacyCarePlansPage
}) {
  return (
    <div
      className="legacy-careplans"
      dangerouslySetInnerHTML={{ __html: loadLegacyArticle(page) }}
    />
  )
}
