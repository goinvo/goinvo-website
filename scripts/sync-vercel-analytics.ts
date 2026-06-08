#!/usr/bin/env tsx

import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

type VercelProjectLink = {
  projectId: string
  orgId: string
  projectName: string
}

type VercelFeatureResult = {
  enabled?: boolean
  projectId?: string
  projectName?: string
}

type ParsedArgs = {
  project?: string
  scope?: string
  productionUrl?: string
  skipEnable: boolean
  dryRun: boolean
}

const cwd = process.cwd()
const apiVersion = '2024-01-01'

loadEnv({ path: path.resolve(cwd, '.env.local'), quiet: true })
loadEnv({ quiet: true })

function parseArgs(argv: string[]): ParsedArgs {
  const valueFor = (name: string) => {
    const equalsPrefix = `--${name}=`
    const inline = argv.find((arg) => arg.startsWith(equalsPrefix))
    if (inline) return inline.slice(equalsPrefix.length)

    const index = argv.indexOf(`--${name}`)
    if (index === -1) return undefined
    return argv[index + 1]
  }

  return {
    project: valueFor('project'),
    scope: valueFor('scope') || process.env.VERCEL_SCOPE,
    productionUrl: valueFor('production-url'),
    skipEnable: argv.includes('--skip-enable'),
    dryRun: argv.includes('--dry-run'),
  }
}

function readLinkedProject(): VercelProjectLink {
  const projectPath = path.resolve(cwd, '.vercel', 'project.json')
  if (!existsSync(projectPath)) {
    throw new Error('No .vercel/project.json found. Run `npx vercel link` before syncing analytics.')
  }

  const parsed = JSON.parse(readFileSync(projectPath, 'utf8')) as Partial<VercelProjectLink>
  if (!parsed.projectId || !parsed.orgId || !parsed.projectName) {
    throw new Error('.vercel/project.json is missing projectId, orgId, or projectName.')
  }

  return {
    projectId: parsed.projectId,
    orgId: parsed.orgId,
    projectName: parsed.projectName,
  }
}

function runVercel(args: string[]): string {
  const result = spawnSync('npx', ['--yes', 'vercel', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: process.platform === 'win32',
  })

  const stdout = result.stdout ? String(result.stdout) : ''
  const stderr = result.stderr ? String(result.stderr) : ''

  if (result.status !== 0 || result.error) {
    throw new Error(
      [
        `Vercel CLI failed: npx vercel ${args.join(' ')}`,
        stdout.trim(),
        stderr.trim(),
        result.error?.message,
      ].filter(Boolean).join('\n'),
    )
  }

  return [stdout, stderr].filter(Boolean).join('\n')
}

function parseJsonOutput<T>(output: string): T {
  const firstBrace = output.indexOf('{')
  const lastBrace = output.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(`Expected JSON from Vercel CLI, received:\n${output}`)
  }

  return JSON.parse(output.slice(firstBrace, lastBrace + 1)) as T
}

function inferProjectListDetails(projectName: string): { scope?: string; productionUrl?: string } {
  const output = runVercel(['project', 'list', '--no-color'])
  const scope =
    output.match(/Fetching projects in ([^\s\b]+)/)?.[1] ||
    output.match(/Projects found under ([^\s\b]+)/)?.[1]
  const projectLine = output
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith(`${projectName} `))
  const productionUrl = projectLine?.match(/https?:\/\/\S+/)?.[0]

  return { scope, productionUrl }
}

function inspectProject(scope?: string): { owner?: string } {
  const args = ['project', 'inspect', '--no-color']
  if (scope) args.push('--scope', scope)

  const output = runVercel(args)
  return {
    owner: output.match(/Owner\s+(.+)/)?.[1]?.trim(),
  }
}

function enableVercelFeature(feature: 'web-analytics' | 'speed-insights', projectName: string, scope?: string): VercelFeatureResult {
  const args = ['project', feature, projectName, '--format', 'json']
  if (scope) args.push('--scope', scope)

  return parseJsonOutput<VercelFeatureResult>(runVercel(args))
}

function buildDashboardBase(projectName: string, scope?: string): string {
  if (scope) return `https://vercel.com/${scope}/${projectName}`
  return `https://vercel.com/dashboard/project/${projectName}`
}

function siteLabelFor(productionUrl?: string): string {
  if (!productionUrl) return 'GoInvo'
  try {
    const host = new URL(productionUrl).hostname.replace(/^www\./, '')
    return host === 'goinvo.com' ? 'GoInvo' : host
  } catch {
    return 'GoInvo'
  }
}

function metric(_key: string, label: string, definition: string) {
  return { _key, _type: 'keyMetric', label, definition }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const linkedProject = readLinkedProject()
  const projectName = args.project || linkedProject.projectName
  const inferred = inferProjectListDetails(projectName)
  const scope = args.scope || inferred.scope
  const productionUrl = args.productionUrl || inferred.productionUrl || 'https://www.goinvo.com'
  const inspect = inspectProject(scope)
  const dashboardBase = buildDashboardBase(projectName, scope)
  const syncedAt = new Date().toISOString()
  const shouldEnable = !args.skipEnable && !args.dryRun

  const linkedFeature = { projectId: linkedProject.projectId, projectName }
  const webAnalytics = shouldEnable
    ? enableVercelFeature('web-analytics', projectName, scope)
    : linkedFeature
  const speedInsights = shouldEnable
    ? enableVercelFeature('speed-insights', projectName, scope)
    : linkedFeature
  const enablementLabel = (result: VercelFeatureResult) => {
    if (!shouldEnable) return args.dryRun ? 'not checked in dry run' : 'not checked'
    return result.enabled === true ? 'yes' : 'unknown'
  }

  const common = {
    status: 'connected',
    vercelProject: projectName,
    vercelProjectId: webAnalytics.projectId || speedInsights.projectId || linkedProject.projectId,
    vercelTeamSlug: scope || inspect.owner,
    productionUrl,
    targetSites: [
      {
        _key: 'goinvo',
        _type: 'targetSite',
        label: siteLabelFor(productionUrl),
        url: productionUrl,
      },
    ],
    reportingCadence: 'weekly',
    lastSyncedAt: syncedAt,
  }

  const docs = [
    {
      _id: 'marketingAnalyticsSource-vercelWebAnalytics',
      _type: 'marketingAnalyticsSource',
      title: `Vercel Web Analytics - ${projectName}`,
      provider: 'vercelAnalytics',
      dashboardUrl: `${dashboardBase}/analytics`,
      keyMetrics: [
        metric('visitors', 'Visitors', 'Unique visitors and traffic trends from Vercel Web Analytics.'),
        metric('page-views', 'Page views', 'Page-level visits for published GoInvo content.'),
        metric('referrers', 'Referrers', 'Sources that bring visitors to the site.'),
        metric('top-pages', 'Top pages', 'Pages and posts attracting the most attention.'),
      ],
      implementationNotes: `Synced from Vercel CLI on ${syncedAt}. Web Analytics enabled: ${enablementLabel(webAnalytics)}. Project owner: ${inspect.owner || scope || 'Vercel'}.`,
      ...common,
    },
    {
      _id: 'marketingAnalyticsSource-vercelSpeedInsights',
      _type: 'marketingAnalyticsSource',
      title: `Vercel Speed Insights - ${projectName}`,
      provider: 'vercelSpeedInsights',
      dashboardUrl: `${dashboardBase}/speed-insights`,
      keyMetrics: [
        metric('real-experience-score', 'Real Experience Score', 'Field performance score from actual visitors.'),
        metric('core-web-vitals', 'Core Web Vitals', 'LCP, INP, CLS, and related page experience metrics.'),
        metric('page-performance', 'Page performance', 'Slow pages that need design or engineering attention.'),
      ],
      implementationNotes: `Synced from Vercel CLI on ${syncedAt}. Speed Insights enabled: ${enablementLabel(speedInsights)}. Project owner: ${inspect.owner || scope || 'Vercel'}.`,
      ...common,
    },
  ]

  if (args.dryRun) {
    console.log(JSON.stringify({ projectName, scope, productionUrl, docs }, null, 2))
    return
  }

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_WRITE_TOKEN

  if (!projectId || !token) {
    throw new Error('Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN (or SANITY_API_WRITE_TOKEN) before syncing.')
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  })

  for (const doc of docs) {
    await client.createOrReplace(doc)
  }

  console.log(`Vercel Web Analytics: ${webAnalytics.enabled === true ? 'enabled' : 'confirmed'}`)
  console.log(`Vercel Speed Insights: ${speedInsights.enabled === true ? 'enabled' : 'confirmed'}`)
  console.log(`Synced ${docs.length} analytics sources to Sanity for ${projectName}.`)
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
