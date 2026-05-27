import { createClient, type SanityClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { apiVersion, dataset, projectId, writeToken } from '@/sanity/env'

type ResearchRunRequest = {
  projectId?: string
  methods?: string[]
  seedKeywords?: string[]
  seedUrls?: string[]
  database?: string
}

type SemrushKeywordOverview = {
  keyword: string
  volume?: number
  cpc?: number
  competition?: number
  resultsCount?: number
  intent?: string
  raw: Record<string, string>
}

type SemrushKeywordDifficulty = {
  keyword: string
  difficulty?: number
  raw: Record<string, string>
}

type ResearchProjectForRun = {
  _id: string
  title?: string
  researchType?: string
  brief?: string
  audience?: string
  goals?: string[]
  seedKeywords?: string[]
  seedUrls?: string[]
  targetGeography?: string
  canonicalUrl?: string
  researchQuestions?: Array<{
    question?: string
    whyItMatters?: string
    decisionNeeded?: string
  }>
  collaborators?: Array<{
    topicArea?: string
    expectedContribution?: string
    notes?: string
  }>
  performanceSignals?: PerformanceSignalForResearch[]
}

type PerformanceSignalForResearch = {
  _id: string
  title?: string
  provider?: string
  status?: string
  signalType?: string
  sourceLabel?: string
  query?: string
  pageUrl?: string
  metricDate?: string
  periodStart?: string
  periodEnd?: string
  metrics?: Array<{
    label?: string
    value?: number
    unit?: string
    change?: string
  }>
  interpretation?: string
  recommendation?: string
  rawImport?: string
}

type SourceScanFinding = {
  title: string
  url: string
  resultType?: 'sourceEvidence' | 'contentGap' | 'competitorExample'
  claim: string
  implication: string
  contentGap: string
  evidenceType: 'sourceArticle' | 'siteContent' | 'competitorExample'
  confidence: 'strong' | 'medium' | 'early' | 'needsValidation'
  matchedTerms: string[]
  summary: string
  headings: string[]
  textLength: number
  provider: 'sourceScan' | 'cms'
}

type AnalyticsSignalResearchResult = {
  title: string
  priority: 'high' | 'medium' | 'low'
  provider: 'analytics'
  sourceMethod: string
  scoreSource: 'provider' | 'manual' | 'none'
  keyword?: string
  canonicalUrl?: string
  contentGap: string
  sourceTitle: string
  sourceUrl?: string
  claim: string
  confidence: 'strong' | 'medium' | 'early' | 'needsValidation'
  implication: string
  performanceSignalId: string
  rawProviderMetadata: Record<string, unknown>
}

type SiteContentCandidate = {
  _id: string
  _type?: 'feature' | 'caseStudy'
  title?: string
  slug?: string
  description?: string
  contentPreview?: string
  client?: string
}

let sanityClient: SanityClient | null = null

function getSanityClient() {
  if (!writeToken) return null
  if (!sanityClient) {
    sanityClient = createClient({
      projectId,
      dataset,
      token: writeToken,
      apiVersion,
      useCdn: false,
    })
  }
  return sanityClient
}

export async function POST(request: NextRequest) {
  const sanityClient = getSanityClient()
  if (!sanityClient) {
    return NextResponse.json({ error: 'Sanity write token is not configured.' }, { status: 500 })
  }

  const input = (await request.json()) as ResearchRunRequest
  const projectId = sanitizeId(input.projectId)
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required.' }, { status: 400 })
  }

  const project = await sanityClient.fetch<ResearchProjectForRun | null>(
    `*[_id == $projectId && _type == "marketingResearchProject"][0]{
      _id,
      title,
      researchType,
      brief,
      audience,
      goals,
      seedKeywords,
      seedUrls,
      targetGeography,
      canonicalUrl,
      researchQuestions,
      collaborators,
      performanceSignals[]->{
        _id,
        title,
        provider,
        status,
        signalType,
        sourceLabel,
        query,
        pageUrl,
        metricDate,
        periodStart,
        periodEnd,
        metrics,
        interpretation,
        recommendation,
        rawImport
      }
    }`,
    { projectId },
  )

  if (!project) {
    return NextResponse.json({ error: 'Research project not found.' }, { status: 404 })
  }

  const methods = normalizeMethods(input.methods)
  const seedKeywords = uniqueStrings([...(input.seedKeywords || []), ...(project.seedKeywords || [])]).slice(0, 100)
  const seedUrls = uniqueStrings([...(input.seedUrls || []), ...(project.seedUrls || []), project.canonicalUrl || '']).slice(0, 30)
  const database = sanitizeDatabase(input.database || project.targetGeography || 'us')
  const warnings: string[] = []
  const errors: string[] = []
  const resultIds: string[] = []
  const counts: Record<string, number> = {}
  const startedAt = new Date().toISOString()

  const run = await sanityClient.create({
    _type: 'marketingResearchRun',
    title: `${project.title || 'Research'} run ${startedAt.slice(0, 10)}`,
    project: referenceFromId(projectId),
    provider: methods.some(isSeoMethod) ? 'semrush' : methods.includes('analyticsReview') ? 'analytics' : 'sourceScan',
    status: 'running',
    startedAt,
    methods,
    seedKeywords,
    seedUrls,
    database,
    rawInput: JSON.stringify({ projectId, researchType: project.researchType || 'topic', methods, seedKeywords, seedUrls, database }, null, 2),
  })

  try {
    if (methods.some(isSeoMethod)) {
      if (!process.env.SEMRUSH_API_KEY) {
        warnings.push('SEMRUSH_API_KEY is not configured, so no provider SEO scores were created.')
      } else if (seedKeywords.length === 0) {
        warnings.push('No seed keywords were supplied for Semrush.')
      } else {
        const seoResults = await fetchSemrushKeywordResults(seedKeywords, database, process.env.SEMRUSH_API_KEY)
        for (const result of seoResults) {
          const created = await sanityClient.create({
            _type: 'marketingResearchResult',
            title: `${result.keyword} keyword score`,
            resultType: 'seoKeyword',
            status: 'needsReview',
            project: referenceFromId(projectId),
            run: referenceFromId(run._id),
            selectedForSynthesis: false,
            priority: priorityFromKeywordResult(result),
            provider: 'semrush',
            sourceMethod: 'semrush:phrase_these+phrase_kdi',
            scoreSource: 'provider',
            database,
            fetchedAt: new Date().toISOString(),
            rawProviderMetadata: JSON.stringify(result.raw, null, 2),
            keyword: result.keyword,
            searchIntent: intentFromSemrush(result.intent),
            volume: result.volume,
            difficulty: result.difficulty,
            cpc: result.cpc,
            competition: result.competition,
            resultsCount: result.resultsCount,
            canonicalUrl: project.canonicalUrl || '',
            contentGap: `Review whether GoInvo has a strong destination that answers "${result.keyword}".`,
            claim: `Semrush returned provider keyword metrics for "${result.keyword}".`,
            evidenceType: 'searchSignal',
            confidence: 'medium',
            implication: 'Use this as a reviewed SEO signal before creating opportunities or release records.',
          })
          resultIds.push(created._id)
          counts.seoKeyword = (counts.seoKeyword || 0) + 1
        }
      }
    }

    if (methods.includes('sourceReview') || methods.includes('sourceEvidence')) {
      for (const url of seedUrls) {
        const finding = await scanSourceUrl(url, project, seedKeywords).catch((scanError) => {
          warnings.push(`Could not scan ${url}: ${scanError instanceof Error ? scanError.message : 'unknown error'}`)
          return buildFallbackSourceFinding(url, project, seedKeywords)
        })
        const created = await sanityClient.create({
          _type: 'marketingResearchResult',
          title: finding.title,
          resultType: 'sourceEvidence',
          status: 'needsReview',
          project: referenceFromId(projectId),
          run: referenceFromId(run._id),
          selectedForSynthesis: false,
          priority: 'medium',
          provider: finding.provider,
          sourceMethod: 'source-scan:html-summary',
          scoreSource: 'none',
          sourceUrl: url,
          sourceTitle: finding.title,
          claim: finding.claim,
          evidenceType: finding.evidenceType,
          confidence: finding.confidence,
          implication: finding.implication,
          contentGap: finding.contentGap,
          rawProviderMetadata: JSON.stringify(
            {
              sourceUrl: url,
              summary: finding.summary,
              matchedTerms: finding.matchedTerms,
              headings: finding.headings,
              textLength: finding.textLength,
            },
            null,
            2,
          ),
        })
        resultIds.push(created._id)
        counts.sourceEvidence = (counts.sourceEvidence || 0) + 1
      }
    }

    if (methods.includes('cmsScan') || methods.includes('deskResearch') || methods.includes('sourceReview')) {
      const cmsFindings = await scanCmsContent(sanityClient, project, seedKeywords)
      if (cmsFindings.length === 0) {
        warnings.push('CMS/site scan did not find matching GoInvo content for this project.')
      }
      for (const finding of cmsFindings) {
        const created = await sanityClient.create({
          _type: 'marketingResearchResult',
          title: finding.title,
          resultType: finding.resultType || 'sourceEvidence',
          status: 'needsReview',
          project: referenceFromId(projectId),
          run: referenceFromId(run._id),
          selectedForSynthesis: false,
          priority: finding.matchedTerms.length >= 2 ? 'high' : 'medium',
          provider: 'cms',
          sourceMethod: 'cms-site-scan',
          scoreSource: 'none',
          sourceUrl: finding.url,
          sourceTitle: finding.title,
          claim: finding.claim,
          evidenceType: 'siteContent',
          confidence: finding.confidence,
          implication: finding.implication,
          contentGap: finding.contentGap,
          rawProviderMetadata: JSON.stringify(
            {
              sourceUrl: finding.url,
              summary: finding.summary,
              matchedTerms: finding.matchedTerms,
              headings: finding.headings,
              textLength: finding.textLength,
            },
            null,
            2,
          ),
        })
        resultIds.push(created._id)
        const countKey = finding.resultType || 'sourceEvidence'
        counts[countKey] = (counts[countKey] || 0) + 1
      }
    }

    if (methods.includes('analyticsReview')) {
      const analyticsResults = buildAnalyticsSignalResearchResults(project, project.performanceSignals || [])
      if (analyticsResults.length === 0) {
        warnings.push('No performance signals were linked to this project, so analyticsReview did not create analytics signal results.')
      }
      for (const result of analyticsResults) {
        const created = await sanityClient.create({
          _type: 'marketingResearchResult',
          title: result.title,
          resultType: 'analyticsSignal',
          status: 'needsReview',
          project: referenceFromId(projectId),
          run: referenceFromId(run._id),
          selectedForSynthesis: false,
          priority: result.priority,
          provider: result.provider,
          sourceMethod: result.sourceMethod,
          scoreSource: result.scoreSource,
          fetchedAt: new Date().toISOString(),
          keyword: result.keyword,
          canonicalUrl: result.canonicalUrl,
          contentGap: result.contentGap,
          sourceTitle: result.sourceTitle,
          sourceUrl: result.sourceUrl,
          claim: result.claim,
          evidenceType: 'firstPartyAnalytics',
          confidence: result.confidence,
          implication: result.implication,
          performanceSignals: [referenceFromId(result.performanceSignalId)],
          rawProviderMetadata: JSON.stringify(result.rawProviderMetadata, null, 2),
        })
        resultIds.push(created._id)
        counts.analyticsSignal = (counts.analyticsSignal || 0) + 1
      }
    }

    if (methods.includes('competitiveScan')) {
      for (const url of seedUrls) {
        const finding = await scanSourceUrl(url, project, seedKeywords).catch((scanError) => {
          warnings.push(`Could not scan competitor/example ${url}: ${scanError instanceof Error ? scanError.message : 'unknown error'}`)
          return buildFallbackSourceFinding(url, project, seedKeywords)
        })
        const created = await sanityClient.create({
          _type: 'marketingResearchResult',
          title: `${finding.title} example`,
          resultType: 'competitorExample',
          status: 'needsReview',
          project: referenceFromId(projectId),
          run: referenceFromId(run._id),
          selectedForSynthesis: false,
          priority: 'medium',
          provider: finding.provider,
          sourceMethod: 'competitive-scan:html-summary',
          scoreSource: 'none',
          competitorUrl: url,
          competitorName: finding.title,
          claim: finding.claim,
          evidenceType: 'competitorExample',
          confidence: finding.confidence,
          implication: `Competitive pattern to evaluate: ${finding.implication}`,
          contentGap: finding.contentGap,
          rawProviderMetadata: JSON.stringify(
            {
              competitorUrl: url,
              summary: finding.summary,
              matchedTerms: finding.matchedTerms,
              headings: finding.headings,
              textLength: finding.textLength,
            },
            null,
            2,
          ),
        })
        resultIds.push(created._id)
        counts.competitorExample = (counts.competitorExample || 0) + 1
      }
    }

    const completedAt = new Date().toISOString()
    const status = errors.length > 0 ? 'failed' : warnings.length > 0 ? 'partial' : 'complete'
    await sanityClient
      .patch(run._id)
      .set({
        status,
        completedAt,
        createdResults: refsFromIds(resultIds),
        warnings,
        errors,
        rawOutputSummary: JSON.stringify({ counts, warnings, errors }, null, 2),
      })
      .commit()

    await sanityClient
      .patch(projectId)
      .set({
        status: resultIds.length > 0 ? 'reviewing' : 'researching',
      })
      .commit()

    return NextResponse.json({
      runId: run._id,
      counts,
      createdResults: resultIds.length,
      warnings,
      errors,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Research run failed.'
    errors.push(message)
    await sanityClient
      .patch(run._id)
      .set({
        status: 'failed',
        completedAt: new Date().toISOString(),
        createdResults: refsFromIds(resultIds),
        warnings,
        errors,
        rawOutputSummary: JSON.stringify({ counts, warnings, errors }, null, 2),
      })
      .commit()

    console.error('Marketing research run failed:', error)
    return NextResponse.json({ runId: run._id, counts, warnings, errors }, { status: 500 })
  }
}

async function fetchSemrushKeywordResults(
  keywords: string[],
  database: string,
  apiKey: string,
): Promise<Array<SemrushKeywordOverview & { difficulty?: number }>> {
  const overviewUrl = buildSemrushKeywordOverviewUrl({ apiKey, keywords, database })
  const overviewResponse = await fetch(overviewUrl, { cache: 'no-store' })
  const overviewText = await overviewResponse.text()
  if (!overviewResponse.ok) throw new Error(`Semrush keyword overview returned ${overviewResponse.status}.`)

  const difficultyUrl = buildSemrushKeywordDifficultyUrl({ apiKey, keywords, database })
  const difficultyResponse = await fetch(difficultyUrl, { cache: 'no-store' })
  const difficultyText = await difficultyResponse.text()
  if (!difficultyResponse.ok) throw new Error(`Semrush keyword difficulty returned ${difficultyResponse.status}.`)

  const overviews = parseSemrushKeywordOverview(overviewText)
  const difficulties = new Map(parseSemrushKeywordDifficulty(difficultyText).map((item) => [item.keyword.toLowerCase(), item.difficulty]))

  return overviews.map((overview) => ({
    ...overview,
    difficulty: difficulties.get(overview.keyword.toLowerCase()),
    raw: {
      ...overview.raw,
      keywordDifficulty: String(difficulties.get(overview.keyword.toLowerCase()) ?? ''),
    },
  }))
}

export function buildSemrushKeywordOverviewUrl({
  apiKey,
  keywords,
  database,
}: {
  apiKey: string
  keywords: string[]
  database: string
}) {
  const url = new URL('https://api.semrush.com/')
  url.searchParams.set('type', 'phrase_these')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('phrase', keywords.join(';'))
  url.searchParams.set('database', database)
  url.searchParams.set('export_columns', 'Ph,Nq,Cp,Co,Nr,In')
  return url.toString()
}

export function buildSemrushKeywordDifficultyUrl({
  apiKey,
  keywords,
  database,
}: {
  apiKey: string
  keywords: string[]
  database: string
}) {
  const url = new URL('https://api.semrush.com/')
  url.searchParams.set('type', 'phrase_kdi')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('phrase', keywords.join(';'))
  url.searchParams.set('database', database)
  url.searchParams.set('export_columns', 'Ph,Kd')
  return url.toString()
}

export function parseSemrushKeywordOverview(csv: string): SemrushKeywordOverview[] {
  return parseSemrushRows(csv)
    .map((row): SemrushKeywordOverview | undefined => {
      const keyword = row.Keyword || row.Ph || ''
      if (!keyword) return undefined
      return {
        keyword,
        volume: numericValue(row['Search Volume'] || row.Nq),
        cpc: numericValue(row.CPC || row.Cp),
        competition: numericValue(row.Competition || row.Co),
        resultsCount: numericValue(row['Number of Results'] || row.Nr),
        intent: row.Intent || row.In,
        raw: row,
      }
    })
    .filter((row): row is SemrushKeywordOverview => !!row)
}

export function parseSemrushKeywordDifficulty(csv: string): SemrushKeywordDifficulty[] {
  return parseSemrushRows(csv)
    .map((row): SemrushKeywordDifficulty | undefined => {
      const keyword = row.Keyword || row.Ph || ''
      if (!keyword) return undefined
      return {
        keyword,
        difficulty: numericValue(row['Keyword Difficulty Index'] || row.Kd),
        raw: row,
      }
    })
    .filter((row): row is SemrushKeywordDifficulty => !!row)
}

export async function scanSourceUrl(
  url: string,
  project: ResearchProjectForRun,
  seedKeywords: string[],
): Promise<SourceScanFinding> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoInvo marketing research scanner (+https://www.goinvo.com)',
        Accept: 'text/html,text/plain;q=0.9,*/*;q=0.5',
      },
    })
    const body = await response.text()
    if (!response.ok) throw new Error(`source returned ${response.status}`)
    return buildSourceFindingFromSummary(summarizeHtmlSource(body, url), project, seedKeywords, 'sourceArticle', 'sourceScan')
  } finally {
    clearTimeout(timeout)
  }
}

export function summarizeHtmlSource(html: string, url: string) {
  const withoutNoise = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const title = cleanText(extractTagContent(withoutNoise, 'title') || extractTagContent(withoutNoise, 'h1') || sourceTitleFromUrl(url))
  const description = cleanText(extractMetaContent(withoutNoise, 'description') || extractMetaContent(withoutNoise, 'og:description'))
  const headings = extractHeadings(withoutNoise).slice(0, 8)
  const text = cleanText(
    withoutNoise
      .replace(/<\/(p|li|h[1-6]|blockquote|section|article|div)>/gi, '. ')
      .replace(/<[^>]+>/g, ' '),
  )
  const summary = description || firstUsefulSentence(text) || headings[0] || title
  return {
    title,
    description,
    headings,
    text,
    textLength: text.length,
    summary: truncateText(summary, 280),
  }
}

async function scanCmsContent(
  client: SanityClient,
  project: ResearchProjectForRun,
  seedKeywords: string[],
): Promise<SourceScanFinding[]> {
  const candidates = await client.fetch<SiteContentCandidate[]>(
    `*[_type in ["feature", "caseStudy"] && defined(title) && title != "Untitled" && !(slug.current match "untitled-*")]|order(coalesce(date, _updatedAt) desc)[0...80]{
      _id,
      _type,
      title,
      "slug": slug.current,
      "description": coalesce(description, metaDescription, caption, heading),
      "contentPreview": array::join(content[_type == "block"].children[].text, " "),
      client
    }`,
  )
  const terms = deriveResearchTerms(project, seedKeywords)
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreTextForTerms([candidate.title, candidate.description, candidate.contentPreview, candidate.client].filter(Boolean).join(' '), terms),
    }))
    .sort((a, b) => b.score - a.score)
  const selected = ranked.filter((item) => item.score > 0).slice(0, 5)

  if (selected.length === 0) {
    const topic = project.title || seedKeywords[0] || project.brief || 'this research project'
    return [
      {
        title: `No clear GoInvo destination for ${truncateText(topic, 80)}`,
        url: '',
        resultType: 'contentGap',
        claim: `The CMS/site scan did not find an obvious existing GoInvo page that matches ${formatTermList(terms.slice(0, 4)) || 'the project inputs'}.`,
        implication: 'Before scheduling content, decide whether to create a new destination page or update an existing one so social posts have somewhere useful to send people.',
        contentGap: 'Missing or unclear canonical destination in current GoInvo content.',
        evidenceType: 'siteContent',
        confidence: 'medium',
        matchedTerms: [],
        summary: 'No high-match CMS record was found.',
        headings: [],
        textLength: 0,
        provider: 'cms',
      },
    ]
  }

  return selected.map(({ candidate, score }) => {
    const route = candidate._type === 'caseStudy' ? `/work/${candidate.slug || ''}` : `/vision/${candidate.slug || ''}`
    const title = candidate.title || sourceTitleFromUrl(route)
    const summary = truncateText(cleanText(candidate.description || firstUsefulSentence(candidate.contentPreview || '') || title), 280)
    const body = [candidate.title, candidate.description, candidate.contentPreview, candidate.client].filter(Boolean).join(' ')
    const matchedTerms = findMatchedTerms(body, terms)
    return {
      title: `${title} site-content finding`,
      url: candidate.slug ? `https://www.goinvo.com${route}` : '',
      resultType: 'sourceEvidence',
      claim: `${title} is existing GoInvo content related to ${formatTermList(matchedTerms) || 'this project'}: ${summary}`,
      implication: 'Use this as a canonical destination or source material before creating new campaign, funnel, calendar, or Quick Link records.',
      contentGap:
        score >= 3
          ? 'Existing content appears relevant; review whether it needs a clearer social hook, CTA, or updated framing.'
          : 'Partial match only; this may need a stronger bridge between the content idea and the destination page.',
      evidenceType: 'siteContent',
      confidence: score >= 3 ? 'medium' : 'early',
      matchedTerms,
      summary,
      headings: [],
      textLength: (candidate.contentPreview || '').length,
      provider: 'cms',
    }
  })
}

function buildSourceFindingFromSummary(
  source: ReturnType<typeof summarizeHtmlSource>,
  project: ResearchProjectForRun,
  seedKeywords: string[],
  evidenceType: 'sourceArticle' | 'siteContent' | 'competitorExample',
  provider: 'sourceScan' | 'cms',
): SourceScanFinding {
  const terms = deriveResearchTerms(project, seedKeywords)
  const matchedTerms = findMatchedTerms([source.title, source.description, source.headings.join(' '), source.text].join(' '), terms)
  const termLabel = formatTermList(matchedTerms)
  const title = source.title || 'Scanned source'
  return {
    title: `${title} finding`,
    url: '',
    resultType: evidenceType === 'competitorExample' ? 'competitorExample' : 'sourceEvidence',
    claim: termLabel
      ? `${title} contains a research signal for ${termLabel}: ${source.summary}`
      : `${title} was scanned; the strongest available summary is: ${source.summary}`,
    implication: termLabel
      ? `Use the ${termLabel} angle only if the claim is relevant to the project brief and the source supports it clearly.`
      : 'This source may be weakly related; use it only after a human confirms the connection to the project brief.',
    contentGap: termLabel
      ? 'Compare this framing against GoInvo content and decide whether the destination page answers the same audience question.'
      : 'Low topical match from the automated scan; add better seed keywords/URLs or reject this finding.',
    evidenceType,
    confidence: source.textLength > 1200 && matchedTerms.length > 0 ? 'medium' : 'early',
    matchedTerms,
    summary: source.summary,
    headings: source.headings,
    textLength: source.textLength,
    provider,
  }
}

function buildFallbackSourceFinding(
  url: string,
  project: ResearchProjectForRun,
  seedKeywords: string[],
): SourceScanFinding {
  const terms = deriveResearchTerms(project, seedKeywords)
  const title = sourceTitleFromUrl(url)
  return {
    title: `${title} source check needed`,
    url,
    resultType: 'sourceEvidence',
    claim: `The automated scanner could not read ${title}, so this remains an unverified source candidate rather than a finding.`,
    implication: 'Open and review the source manually before approving it for synthesis.',
    contentGap: 'Automated scan could not extract evidence from this URL.',
    evidenceType: 'sourceArticle',
    confidence: 'needsValidation',
    matchedTerms: terms.slice(0, 4),
    summary: 'Source could not be scanned automatically.',
    headings: [],
    textLength: 0,
    provider: 'sourceScan',
  }
}

export function buildAnalyticsSignalResearchResults(
  project: Pick<ResearchProjectForRun, '_id' | 'title' | 'canonicalUrl'>,
  performanceSignals: PerformanceSignalForResearch[],
): AnalyticsSignalResearchResult[] {
  return performanceSignals
    .filter((signal) => signal._id)
    .map((signal): AnalyticsSignalResearchResult => {
      const provider = normalizePerformanceProvider(signal.provider)
      const metrics = signal.metrics || []
      const metricSummary = summarizePerformanceMetrics(metrics)
      const title = signal.title || signal.query || signal.pageUrl || `${project.title || 'Marketing'} performance signal`
      const interpretation = cleanText(signal.interpretation || '')
      const recommendation = cleanText(signal.recommendation || '')
      const claim = interpretation || metricSummary || `${title} is a first-party performance signal that should be reviewed before synthesis.`
      const contentGap = recommendation || 'Decide whether this signal changes the audience, message, CTA, channel, or release timing.'
      const sourceUrl = signal.pageUrl || project.canonicalUrl || ''
      const priority = signal.status === 'suggestsUpdate' || recommendation ? 'high' : metricSummary ? 'medium' : 'low'
      return {
        title: `${title} analytics signal`,
        priority,
        provider: 'analytics',
        sourceMethod: `performance-signal:${provider}`,
        scoreSource: provider === 'manual' || provider === 'other' ? 'manual' : 'provider',
        keyword: signal.query,
        canonicalUrl: sourceUrl,
        contentGap,
        sourceTitle: signal.sourceLabel || title,
        sourceUrl,
        claim,
        confidence: provider === 'manual' ? 'early' : 'medium',
        implication: recommendation || 'Use this signal as first-party evidence when deciding what to adjust next.',
        performanceSignalId: signal._id,
        rawProviderMetadata: {
          performanceSignalId: signal._id,
          provider,
          status: signal.status,
          signalType: signal.signalType,
          query: signal.query,
          pageUrl: signal.pageUrl,
          metricDate: signal.metricDate,
          periodStart: signal.periodStart,
          periodEnd: signal.periodEnd,
          metrics,
          interpretation,
          recommendation,
          rawImport: signal.rawImport,
        },
      }
    })
}

function normalizePerformanceProvider(value: string | undefined) {
  const normalized = (value || '').trim()
  return ['gsc', 'ga4', 'instagram', 'vercel', 'manual', 'other'].includes(normalized) ? normalized : 'manual'
}

function summarizePerformanceMetrics(metrics: PerformanceSignalForResearch['metrics']) {
  return (metrics || [])
    .map((metric) => {
      const label = cleanText(metric.label || '')
      if (!label) return ''
      const value = typeof metric.value === 'number' && Number.isFinite(metric.value) ? `${metric.value}` : ''
      const unit = cleanText(metric.unit || '')
      const change = cleanText(metric.change || '')
      return [label, [value, unit].filter(Boolean).join(' '), change].filter(Boolean).join(': ')
    })
    .filter(Boolean)
    .slice(0, 4)
    .join('; ')
}

function parseSemrushRows(csv: string): Array<Record<string, string>> {
  const trimmed = csv.trim()
  if (!trimmed || /^ERROR\b/i.test(trimmed) || /^NOTHING FOUND/i.test(trimmed)) return []
  const lines = trimmed.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitSemrushLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = splitSemrushLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
  })
}

function splitSemrushLine(line: string) {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ';' && !quoted) {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function numericValue(value: string | undefined) {
  if (!value) return undefined
  const normalized = Number(value.replace(/,/g, ''))
  return Number.isFinite(normalized) ? normalized : undefined
}

function extractTagContent(html: string, tag: string) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? stripTags(match[1]) : ''
}

function extractMetaContent(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']+)["'])[^>]*>`, 'i'),
    new RegExp(`<meta\\b(?=[^>]*content=["']([^"']+)["'])(?=[^>]*(?:name|property)=["']${escaped}["'])[^>]*>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ''
}

function extractHeadings(html: string) {
  const headings: string[] = []
  const pattern = /<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi
  let match = pattern.exec(html)
  while (match) {
    const heading = cleanText(stripTags(match[1]))
    if (heading && !headings.includes(heading)) headings.push(heading)
    match = pattern.exec(html)
  }
  return headings
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ')
}

function cleanText(value: string | undefined) {
  if (!value) return ''
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim()
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function firstUsefulSentence(value: string) {
  const sentences = cleanText(value).split(/(?<=[.!?])\s+/)
  return sentences.find((sentence) => sentence.length >= 60 && sentence.length <= 320) || sentences.find((sentence) => sentence.length >= 25) || ''
}

function deriveResearchTerms(project: ResearchProjectForRun, seedKeywords: string[]) {
  const explicit = uniqueStrings(seedKeywords).slice(0, 10)
  const sourceText = [
    project.brief,
    ...explicit,
    ...(project.researchQuestions || []).flatMap((question) => [
      question.question,
      question.whyItMatters,
      question.decisionNeeded,
    ]),
    ...(project.collaborators || []).flatMap((collaborator) => [
      collaborator.topicArea,
      collaborator.expectedContribution,
      collaborator.notes,
    ]),
  ]
    .filter(Boolean)
    .join(' ')
  const inferred = cleanText(sourceText)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word) && !RESEARCH_STOP_WORDS.has(word))
  return uniqueStrings([...explicit, ...inferred]).slice(0, 18)
}

function findMatchedTerms(value: string, terms: string[]) {
  const lower = value.toLowerCase()
  return terms.filter((term) => lower.includes(term.toLowerCase())).slice(0, 8)
}

function scoreTextForTerms(value: string, terms: string[]) {
  const lower = value.toLowerCase()
  return terms.reduce((score, term) => {
    const normalized = term.toLowerCase()
    if (!normalized) return score
    const matches = lower.match(new RegExp(escapeRegex(normalized), 'g'))?.length || 0
    return score + matches * (normalized.includes(' ') ? 3 : 1)
  }, 0)
}

function formatTermList(terms: string[]) {
  const visible = uniqueStrings(terms).slice(0, 3)
  if (visible.length === 0) return ''
  if (visible.length === 1) return visible[0]
  if (visible.length === 2) return `${visible[0]} and ${visible[1]}`
  return `${visible.slice(0, -1).join(', ')}, and ${visible[visible.length - 1]}`
}

function truncateText(value: string, limit: number) {
  const cleaned = cleanText(value)
  if (cleaned.length <= limit) return cleaned
  return `${cleaned.slice(0, limit - 1).trim()}…`
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const RESEARCH_STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'also',
  'api',
  'area',
  'article',
  'articles',
  'around',
  'based',
  'become',
  'before',
  'being',
  'blank',
  'campaign',
  'canonical',
  'check',
  'choose',
  'content',
  'contain',
  'contains',
  'create',
  'created',
  'creates',
  'current',
  'decide',
  'decision',
  'destination',
  'design',
  'designer',
  'designers',
  'enough',
  'existing',
  'find',
  'follow',
  'follow-up',
  'from',
  'future',
  'goinvo',
  'helps',
  'instagram',
  'instead',
  'into',
  'leader',
  'leaders',
  'marketing',
  'material',
  'needs',
  'opportunity',
  'opportunities',
  'page',
  'pages',
  'people',
  'planning',
  'prepare',
  'project',
  'question',
  'review',
  'reviewed',
  'research',
  'select',
  'source',
  'smoke',
  'social',
  'starting',
  'strategy',
  'strong',
  'support',
  'supports',
  'that',
  'temporary',
  'test',
  'testing',
  'their',
  'there',
  'these',
  'this',
  'thing',
  'those',
  'thread',
  'truths',
  'used',
  'using',
  'verify',
  'verifying',
  'where',
  'whether',
  'which',
  'while',
  'workflow',
  'would',
  'should',
])

function normalizeMethods(methods: string[] | undefined) {
  const normalized = uniqueStrings(methods || []).filter((method) =>
    [
      'seoKeyword',
      'seoReview',
      'sourceReview',
      'sourceEvidence',
      'cmsScan',
      'analyticsReview',
      'competitiveScan',
      'deskResearch',
      'socialListening',
      'audienceInterview',
      'stakeholderInterview',
      'survey',
      'other',
    ].includes(method),
  )
  return normalized.length > 0 ? normalized : ['seoReview', 'sourceReview']
}

function isSeoMethod(method: string) {
  return method === 'seoKeyword' || method === 'seoReview'
}

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean)))
}

function sanitizeDatabase(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
  return normalized || 'us'
}

function sanitizeId(value: unknown) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.-]+$/.test(value) ? value : ''
}

function sourceTitleFromUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '')
  } catch {
    return url || 'Source evidence'
  }
}

function intentFromSemrush(intent?: string) {
  if (!intent) return undefined
  const normalized = intent.split(',')[0]?.trim()
  if (normalized === '0') return 'learn'
  if (normalized === '1') return 'decide'
  if (normalized === '2') return 'compare'
  if (normalized === '3') return 'use'
  return undefined
}

function priorityFromKeywordResult(result: SemrushKeywordOverview & { difficulty?: number }) {
  const volume = result.volume || 0
  const difficulty = result.difficulty || 100
  if (volume >= 1000 && difficulty <= 60) return 'high'
  if (volume >= 100 || difficulty <= 75) return 'medium'
  return 'low'
}

function referenceFromId(id: string) {
  return { _type: 'reference', _ref: id }
}

function refsFromIds(ids: string[]) {
  return ids.map((id) => referenceFromId(id))
}
