#!/usr/bin/env tsx

import { spawn } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

type Runner = 'node' | 'tsx' | 'sanity'

type Task = {
  runner: Runner
  file?: string
  command?: string[]
  description: string
}

const tasks = {
  'verify': {
    runner: 'tsx',
    file: 'batch-verify.ts',
    description: 'Run batch page verification. Forwards flags such as --section, --mobile, --all-viewports, --clear-cache, --flush-non-clean.',
  },
  'batch': {
    runner: 'tsx',
    file: 'batch-verify.ts',
    description: 'Alias for verify.',
  },
  'tree': {
    runner: 'tsx',
    file: 'page-tree.ts',
    description: 'Dump or diff a rendered page tree. Example: tree https://www.goinvo.com/vision/slug/ --diff http://localhost:3000/vision/slug',
  },
  'compare:vision': {
    runner: 'tsx',
    file: 'compare-pages.ts',
    description: 'Compare vision pages against Gatsby.',
  },
  'compare:all': {
    runner: 'tsx',
    file: 'compare-all-pages.ts',
    description: 'Compare case study and main pages against Gatsby.',
  },
  'compare:visual': {
    runner: 'tsx',
    file: 'compare-visual.ts',
    description: 'Run visual/computed-style comparison.',
  },
  'audit:content': {
    runner: 'node',
    file: 'audit-content.mjs',
    description: 'Audit Sanity documents for structural/content issues.',
  },
  'audit:site': {
    runner: 'node',
    file: 'audit-site-integrity.mjs',
    description: 'Audit routes, redirects, links, and SEO.',
  },
  'audit:superscripts': {
    runner: 'tsx',
    file: 'audit-superscripts.ts',
    description: 'Audit reference superscripts.',
  },
  'audit:linebreaks': {
    runner: 'tsx',
    file: 'check-linebreaks.ts',
    description: 'Audit line breaks and inline mark spacing.',
  },
  'audit:deep': {
    runner: 'tsx',
    file: 'deep-audit.ts',
    description: 'Run broad Puppeteer element-level audit.',
  },
  'audit:a11y': {
    runner: 'tsx',
    file: 'accessibility-audit.ts',
    description: 'Run axe-core accessibility checks plus project-specific heading, overflow, and tap-target checks.',
  },
  'fix:content': {
    runner: 'node',
    file: 'auto-fix-content.mjs',
    description: 'Run repeatable Sanity content normalization. Pass --write to apply.',
  },
  'regression': {
    runner: 'tsx',
    file: 'regression-test.ts',
    description: 'Run baseline-driven CSS regression checks. Pass --baseline to save a baseline.',
  },
  'generate:verification': {
    runner: 'node',
    file: 'generate-verification.mjs',
    description: 'Generate the manual verification checklist.',
  },
  'sanity:schema': {
    runner: 'sanity',
    command: ['sanity', 'schema', 'extract', '--path', '.audit/sanity-schema.json'],
    description: 'Extract the Sanity schema used by the embedded Studio.',
  },
} satisfies Record<string, Task>

const aliases: Record<string, string> = {
  'compare': 'compare:vision',
  'content-audit': 'audit:content',
  'content-fix': 'fix:content',
  'schema': 'sanity:schema',
  'a11y': 'audit:a11y',
}

function printHelp(): void {
  console.log(`
GoInvo maintenance script

Usage:
  npm run manage -- <task> [...args]
  npx tsx scripts/manage.ts <task> [...args]

Examples:
  npm run manage -- verify --all-viewports --flush-non-clean
  npm run manage -- verify --section vision --mobile
  npm run manage -- tree https://www.goinvo.com/vision/slug/ --diff http://localhost:3000/vision/slug
  npm run manage -- compare:vision human-centered-design-for-ai --verbose
  npm run manage -- audit:content
  npm run manage -- audit:a11y --viewport mobile --section vision
  npm run manage -- fix:content --write
  npm run manage -- regression --baseline
  npm run manage -- sanity:schema

Tasks:
${Object.entries(tasks)
  .map(([name, task]) => `  ${name.padEnd(22)} ${task.description}`)
  .join('\n')}
`)
}

function resolveTask(rawName?: string): { name: string; task: Task } | null {
  if (!rawName || rawName === '--help' || rawName === '-h' || rawName === 'help') return null

  const name = aliases[rawName] || rawName
  const task = tasks[name as keyof typeof tasks]
  if (!task) return null

  return { name, task }
}

function commandFor(task: Task, forwardedArgs: string[]): { command: string; args: string[] } {
  if (task.runner === 'sanity') {
    const sanityCli = path.resolve(process.cwd(), 'node_modules', 'sanity', 'bin', 'sanity')
    if (!existsSync(sanityCli)) {
      throw new Error(`Sanity CLI not found: ${sanityCli}`)
    }
    return {
      command: process.execPath,
      args: [sanityCli, ...(task.command || []).slice(1), ...forwardedArgs],
    }
  }

  const file = task.file
  if (!file) throw new Error('Task is missing a file')

  const scriptPath = path.resolve(process.cwd(), 'scripts', file)
  if (!existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`)
  }

  if (task.runner === 'node') {
    return { command: process.execPath, args: [scriptPath, ...forwardedArgs] }
  }

  const tsxCli = path.resolve(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!existsSync(tsxCli)) {
    throw new Error(`tsx CLI not found: ${tsxCli}. Run npm install first.`)
  }

  return { command: process.execPath, args: [tsxCli, scriptPath, ...forwardedArgs] }
}

async function run(): Promise<number> {
  const [rawName, ...forwardedArgs] = process.argv.slice(2)
  const resolved = resolveTask(rawName)

  if (!resolved) {
    printHelp()
    if (rawName && !['--help', '-h', 'help'].includes(rawName)) {
      console.error(`Unknown task: ${rawName}`)
      return 1
    }
    return 0
  }

  const { command, args } = commandFor(resolved.task, forwardedArgs)
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  })

  return await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', (error) => {
      console.error(error)
      resolve(1)
    })
  })
}

run()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
