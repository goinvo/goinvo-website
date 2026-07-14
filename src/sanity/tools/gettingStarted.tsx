import { definePlugin, type Tool } from 'sanity'
import {
  BookIcon,
  CheckmarkCircleIcon,
  CircleIcon,
  EditIcon,
  ImageIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  RocketIcon,
  ResetIcon,
  RefreshIcon,
  SearchIcon,
  CloseIcon,
  RobotIcon,
  ControlsIcon,
  UploadIcon,
  UsersIcon,
  TagsIcon,
  CaseIcon,
  BulbOutlineIcon,
  WarningOutlineIcon,
  PublishIcon,
  EarthGlobeIcon,
  MasterDetailIcon,
  StackIcon,
  ChartUpwardIcon,
} from '@sanity/icons'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, CSSProperties, ReactNode } from 'react'

/* -----------------------------------------------------------------
 * Storage keys + persistence
 * ----------------------------------------------------------------- */

const STORAGE_KEY = 'goinvo-knowledge-base-v1'

type ProgressState = Record<string, boolean>

function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveProgress(state: ProgressState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/* -----------------------------------------------------------------
 * Data model
 * ----------------------------------------------------------------- */

type IntentSpec = {
  /**
   * Direct desk path inside the studio. We bypass router.navigateIntent
   * because the project's custom orderable desk structure intercepts
   * intents and routes them to the wrong list. The link target is
   * relative to /studio (the studio basePath).
   */
  path: string
  label: string
}

type StepDef = {
  id: string
  title: string
  body: ReactNode
  tip?: ReactNode
  intent?: IntentSpec
}

type Article = {
  id: string
  title: string
  blurb: string
  /** ~minutes to skim/perform */
  minutes?: number
  steps: StepDef[]
  /** Standalone "Open …" buttons rendered above the steps */
  links?: IntentSpec[]
  /** Free-text keywords for the search filter */
  keywords?: string[]
  /** Plain-language body concepts that should remain discoverable even when the rendered body is JSX. */
  searchText?: string
}

type Category = {
  id: string
  title: string
  blurb: string
  icon: ComponentType<{ style?: CSSProperties }>
  articles: Article[]
}

/* -----------------------------------------------------------------
 * Inline style helpers used by article body content (defined here so
 * that the categories array below can reference them).
 * ----------------------------------------------------------------- */

const teal = '#007385'

const inlineList: CSSProperties = {
  margin: '4px 0',
  paddingLeft: 20,
}

const kbd: CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  fontSize: 12,
  border: '1px solid var(--card-border-color)',
  borderBottomWidth: 2,
  borderRadius: 4,
  background: 'var(--card-bg-color)',
  margin: '0 1px',
}

const KNOWLEDGE_BASE_RESPONSIVE_CSS = `
  @media (max-width: 640px) {
    [data-knowledge-base="true"] { padding: 16px 12px 72px !important; }
    [data-knowledge-hero="true"] { flex-wrap: wrap !important; padding: 16px !important; }
    [data-knowledge-progress="true"] { width: 100% !important; min-width: 0 !important; align-items: flex-start !important; }
    [data-knowledge-article-header="true"] { align-items: flex-start !important; flex-wrap: wrap !important; padding: 12px !important; }
    [data-knowledge-article-meta="true"] { width: 100% !important; padding-left: 34px !important; flex-wrap: wrap !important; }
  }
`

/* -----------------------------------------------------------------
 * Categories + articles
 * ----------------------------------------------------------------- */

const categories: Category[] = [
  /* ---------------- 1. Getting started ---------------- */
  {
    id: 'basics',
    title: 'Getting started',
    blurb: 'First-time editor? Start here.',
    icon: RocketIcon,
    articles: [
      {
        id: 'basics.tour',
        title: 'Take a tour of the studio',
        blurb: 'The Studio tabs, the structure pane, and the editor pane.',
        minutes: 3,
        keywords: ['intro', 'overview', 'welcome', 'first time', 'navigation'],
        links: [{ path: '/structure', label: 'Open the Structure pane' }],
        steps: [
          {
            id: 'basics.tour.tabs',
            title: 'The Studio tabs',
            body: (
              <>
                <strong>Structure</strong> for editing content.{' '}
                <strong>Marketing</strong> for calendar, campaign, funnel,
                channel, and analytics planning.{' '}
                <strong>Presentation</strong> for previewing the live site with
                your draft applied.{' '}
                <strong>Getting Started</strong> (this guide).{' '}
                <strong>Feedback</strong> for sending notes to the dev team.
              </>
            ),
          },
          {
            id: 'basics.tour.structure',
            title: 'The Structure pane',
            body: (
              <>
                The left column lists every content type. Click one to see its
                documents; click a document to open the editor on the right.
                Every change saves automatically as a draft.
              </>
            ),
          },
          {
            id: 'basics.tour.drafts',
            title: 'The "Drafts" / release picker',
            body: (
              <>
                That&apos;s Sanity&apos;s release-context picker, not a status
                filter. Most day-to-day edits happen in <em>Drafts</em>.
                Switch to <em>Published</em> only when you want to inspect the
                live version, or choose a named release when you&apos;re staging
                a coordinated launch.
              </>
            ),
          },
        ],
      },
      {
        id: 'basics.first-edit',
        title: 'Make your first edit',
        blurb: 'A 5-minute walkthrough of editing an existing document.',
        minutes: 5,
        keywords: ['first', 'edit', 'how to start'],
        links: [{ path: '/structure/orderable-teamMember', label: 'Open Team Member list' }],
        steps: [
          {
            id: 'basics.first-edit.find',
            title: 'Find a document',
            body: (
              <>
                Open <em>Structure</em>, click <strong>Team Member</strong> in
                the left column, and pick anyone in the list.
              </>
            ),
          },
          {
            id: 'basics.first-edit.edit',
            title: 'Make a small change',
            body: (
              <>
                Tweak their role or fix a typo in the bio. Watch the orange{' '}
                <strong>Draft</strong> badge appear at the top of the editor —
                that means your edit is saved as a draft, not yet live.
              </>
            ),
          },
          {
            id: 'basics.first-edit.preview',
            title: 'Preview the change',
            body: (
              <>
                Click <em>Presentation</em> at the top to see the live site
                with your draft applied. The change is invisible to the public
                until you publish.
              </>
            ),
          },
          {
            id: 'basics.first-edit.publish-or-discard',
            title: 'Publish or discard',
            body: (
              <>
                Happy with it? Click <strong>Publish</strong> in the document
                action bar. Want to abandon it? Open the document action menu
                and choose <em>Discard changes</em>.
              </>
            ),
            tip: (
              <>
                Discard never deletes published content — it only throws away
                your in-progress draft.
              </>
            ),
          },
        ],
      },
      {
        id: 'basics.cheat-sheet',
        title: 'Studio cheat sheet',
        blurb: 'The shortcuts and patterns you’ll use every day.',
        minutes: 2,
        keywords: ['shortcuts', 'tips', 'reference'],
        steps: [
          {
            id: 'basics.cheat-sheet.shortcuts',
            title: 'Shortcuts',
            body: (
              <ul style={inlineList}>
                <li><kbd style={kbd}>Ctrl</kbd>/<kbd style={kbd}>Cmd</kbd> + <kbd style={kbd}>K</kbd> - open the global search</li>
                <li><kbd style={kbd}>Esc</kbd> - close the current modal, menu, or preview overlay</li>
                <li>Publishing is always done from the document action bar; do not use browser print shortcuts as publish shortcuts.</li>
              </ul>
            ),
          },
          {
            id: 'basics.cheat-sheet.statusdots',
            title: 'Reading the status badges',
            body: (
              <ul style={inlineList}>
                <li><strong style={{ color: '#22a06b' }}>Published</strong> — live</li>
                <li><strong style={{ color: '#f59e0b' }}>Draft</strong> — your in-progress edits, not yet live</li>
                <li>Both shown — published doc + new draft pending publish</li>
                <li>No badge — never published; only exists as a draft</li>
              </ul>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 2. Marketing suite ---------------- */
  {
    id: 'marketing',
    title: 'Marketing suite',
    blurb: 'Plan from evidence, make connected outreach, and measure what works across all 15 workspaces.',
    icon: ChartUpwardIcon,
    articles: [
      {
        id: 'marketing.overview',
        title: 'Use the Marketing workspace',
        blurb: 'The designer-friendly operating layer for planned outreach.',
        minutes: 5,
        keywords: ['marketing', 'overview', 'calendar', 'campaign', 'funnel', 'channels', 'analytics', 'instagram', 'posture', 'principal', 'coworker', 'runway'],
        searchText: 'Confirm financial posture and role before choosing the workflow. Survival and rebuild prioritize direct warm outreach; stable and growth support research, content, SEO, experiments, and brand.',
        links: [{ path: '/marketing?view=dashboard', label: 'Open Marketing dashboard' }],
        steps: [
          {
            id: 'marketing.overview.framework',
            title: 'Confirm financial posture and role first',
            body: (
              <>
                The Dashboard and Settings show the studio&apos;s current financial
                posture. In Survival or Rebuild, a principal should lead with
                direct warm-network Outreach because it can close inside the
                runway. In Stable or Growth, research, content, SEO, experiments,
                and brand can run alongside relationship maintenance. A coworker
                should use the same posture but follow the assigned operational step.
              </>
            ),
            tip: (
              <>
                Re-confirm posture at least monthly. Autopilot and Needs attention
                should follow that decision instead of forcing every user through
                the same research-first workflow.
              </>
            ),
          },
          {
            id: 'marketing.overview.order',
            title: 'Work from strategy to artifact',
            body: (
              <>
                Start with the broad intent, then move toward the thing you
                need to make: research plans collect SEO, collaboration, and
                release timing inputs; campaigns set the goal and audience;
                funnels define the next step; channels constrain the format;
                calendar items become the actual posts or pages; and analytics
                explains whether the work helped.
              </>
            ),
          },
          {
            id: 'marketing.overview.templates',
            title: 'Use templates as scaffolding',
            body: (
              <>
                Templates are prompts, not rules. Pick the closest campaign,
                funnel, or content pattern, then rewrite the goal, audience,
                CTA, and brief in plain language so designers do not need to
                invent the marketing strategy before making the content.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.dashboard',
        title: 'Start from the Dashboard',
        blurb: 'Use ranked next actions and runway signals to decide what deserves attention first.',
        minutes: 3,
        keywords: ['dashboard', 'home', 'next actions', 'runway', 'needs attention', 'autopilot'],
        links: [{ path: '/marketing?view=dashboard', label: 'Open Dashboard' }],
        steps: [
          {
            id: 'marketing.dashboard.scan',
            title: 'Scan the runway before opening editors',
            body: (
              <>
                Start on <strong>Home</strong> to see posture-aware priorities,
                publishing runway, unresolved strategy gaps, and records that
                need attention. Runway counts execution-ready scheduled work in
                the next 30 dates; an Idea far in the future does not make the
                intervening calendar healthy. These signals summarize the suite;
                they do not create or edit records by themselves.
              </>
            ),
          },
          {
            id: 'marketing.dashboard.next-action',
            title: 'Open one ranked next action',
            body: (
              <>
                Choose the highest useful action, review the destination, and
                save there. Similar gaps are merged so the list describes one
                problem once. In Survival or Rebuild, due relationship and
                revenue work ranks ahead of long-horizon content planning. Use
                Autopilot when you want the same work broken into one reviewable
                step at a time.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.research',
        title: 'Run evidence-first Research',
        blurb: 'Ask a decision question, review the evidence, and create connected drafts only from findings you explicitly trust.',
        minutes: 7,
        keywords: ['research', 'seo', 'collaborations', 'interns', 'release windows', 'content opportunities', 'strategy'],
        links: [{ path: '/marketing?view=research', label: 'Open Research' }],
        steps: [
          {
            id: 'marketing.research.inputs',
            title: 'Start with the decision you need to make',
            body: (
              <>
                Use <strong>Research</strong> when evidence should change a
                marketing decision, not simply to generate more copy. Write the
                question, audience, decision, and constraints, then choose the
                smallest evidence method that can answer it.
              </>
            ),
            tip: (
              <>
                Research here is not a 30-day phase. It is the minimum useful
                evidence needed to decide what should ship, when, and why.
              </>
            ),
          },
          {
            id: 'marketing.research.collaborators',
            title: 'Treat collaborators as strategy inputs',
            body: (
              <>
                Add university interns, advisors, partner organizations,
                guests, or communities with their topic area, availability, and
                contribution type. If someone new can help, the release plan
                should suggest what moves earlier, what gets added, and what
                needs their review.
              </>
            ),
          },
          {
            id: 'marketing.research.seo',
            title: 'Use SEO as wording and destination guidance',
            body: (
              <>
                SEO targets should include the query, search intent, canonical
                destination, and content gap. These fields flow into campaigns
                and calendar items as topic clusters, target queries, and
                production prompts.
              </>
            ),
          },
          {
            id: 'marketing.research.review',
            title: 'Trust evidence before letting it guide drafts',
            body: (
              <>
                A finding can be selected for synthesis without being trusted.
                Open its evidence, verify the source and claim, then use{' '}
                <strong>Trust + use</strong>. Only explicitly trusted findings
                can guide setup drafts; rejected or merely selected findings
                remain out of generation.
              </>
            ),
          },
          {
            id: 'marketing.research.convert',
            title: 'Create the connected drafts once',
            body: (
              <>
                Select the trusted findings that should guide execution, then
                create the linked campaign, funnel, calendar items, and Quick
                Links. Conversion is one reviewable operation: after it
                succeeds, open and edit the existing drafts instead of creating
                a second copy.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.seo',
        title: 'Find and verify SEO opportunities',
        blurb: 'Use search performance, page audits, crawl findings, and AI citations to prioritize page work.',
        minutes: 5,
        keywords: ['seo', 'search console', 'ga4', 'page audit', 'crawl', 'citation', 'search opportunity'],
        links: [{ path: '/marketing?view=seo', label: 'Open SEO' }],
        steps: [
          {
            id: 'marketing.seo.opportunities',
            title: 'Start with ranked opportunities',
            body: (
              <>
                Run the opportunities check intentionally, then review Search
                Console and GA4 context before changing a page. The action can
                use limited provider credits, so read its cost and availability
                note before starting it. Look for meaningful impressions,
                page-two rankings, and conversion context rather than optimizing
                a keyword in isolation.
              </>
            ),
          },
          {
            id: 'marketing.seo.audit',
            title: 'Audit the intended GoInvo page',
            body: (
              <>
                Run a page audit or site sweep only after reviewing the listed
                providers and quota cost, then resolve the highest-impact
                findings first. Use the crawl for site-wide link problems and
                the citation checker when a claim needs factual verification.
              </>
            ),
          },
          {
            id: 'marketing.seo.ai-citations',
            title: 'Treat AI citation checks as periodic snapshots',
            body: (
              <>
                AI citation checks are slower and use paid model capacity. Run
                them intentionally, then compare stored snapshots instead of
                repeating a live check during routine page editing.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.strategy',
        title: 'Answer reusable Strategy questions',
        blurb: 'Save the audiences, messages, proof, CTAs, tracking rules, and quality checks content can reuse.',
        minutes: 5,
        keywords: ['strategy', 'audience', 'message', 'proof', 'cta', 'tracking', 'quality gate', 'experiment'],
        links: [{ path: '/marketing?view=strategy', label: 'Open Strategy Q&A' }],
        steps: [
          {
            id: 'marketing.strategy.foundation',
            title: 'Build the reusable foundation',
            body: (
              <>
                Work through audience, message, proof, CTA, tracking, quality,
                and experiment answers. Keep each answer specific enough that a
                designer can use it without reopening the entire marketing plan.
                An empty placeholder is not a completed strategy answer and does
                not improve the Home readiness score.
              </>
            ),
          },
          {
            id: 'marketing.strategy.drafts',
            title: 'Review local or AI-assisted drafts before saving',
            body: (
              <>
                A restored or suggested draft is still working material. Check
                its source evidence and wording, then save it to Sanity only
                when it is suitable for reuse across future content.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.strategy-brief',
        title: 'Read the Positioning brief',
        blurb: 'Use the read-only strategy brief to align positioning, commercial search terms, AI visibility, and the Red Team play.',
        minutes: 4,
        keywords: ['strategy brief', 'positioning', 'money terms', 'ai visibility', 'red team', 'go to market'],
        links: [{ path: '/marketing?view=strategyBrief', label: 'Open Positioning' }],
        steps: [
          {
            id: 'marketing.strategy-brief.read',
            title: 'Use the brief for orientation, not editing',
            body: (
              <>
                This view summarizes the current positioning recommendation,
                commercial search opportunities, AI visibility, and failure-
                teardown strategy. It is intentionally read-only and dated.
                Static claims in the brief do not carry per-claim verification,
                so confirm figures in Research, Evidence, or SEO before using
                them externally.
              </>
            ),
          },
          {
            id: 'marketing.strategy-brief.apply',
            title: 'Move actionable decisions to their owning workspace',
            body: (
              <>
                Use Strategy Q&amp;A for reusable language, SEO for page and
                citation work, and Campaigns or Calendar for execution. The
                brief should align those decisions, not become a second editor.
                If the newest AI-citation attempt failed, the live block labels
                the older successful snapshot instead of calling it the latest run.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.outreach',
        title: 'Build a researched Outreach call plan',
        blurb: 'Turn warm contacts into a ranked progress tracker with verified opportunities, channel advice, offers, and follow-ups.',
        minutes: 8,
        keywords: ['outreach', 'contacts', 'warm network', 'call plan', 'progress tracker', 'next contact', 'modality', 'channel override', 'cold call', 'phone', 'email', 'linkedin', 'offers', 'follow up', 'research', 'lead', 'leads', 'prospect', 'buyer', 'past client', 'price', 'posture', 'privacy'],
        searchText: 'Warm-network outreach, not external prospect discovery. Suggest from past work, qualify a named buyer, verify identity, review AI research, approve the brief, use the progress tracker to choose the next contact and phone, email, or LinkedIn modality, override unavailable or unresponsive channels, edit contact data, choose a priced offer, recover failed research, log follow-ups, and measure won or lost revenue.',
        links: [{ path: '/marketing?view=outreach', label: 'Open Outreach' }],
        steps: [
          {
            id: 'marketing.outreach.scope',
            title: 'Use the 60-second principal path',
            body: (
              <>
                In a hurry, use one loop: <strong>Add → Research → Review and tune the
                voice → Contact → Log</strong>. Start each return visit at the progress
                tracker&apos;s <strong>Recommended next</strong> card. Outreach activates
                GoInvo&apos;s existing relationships; it can suggest people and client
                accounts found in published work, parse a pasted list, research a saved
                contact, rank approved briefs, and track follow-ups. It does not discover external prospects,
                identify a decision-maker automatically, or send
                calls, emails, or messages.
              </>
            ),
          },
          {
            id: 'marketing.outreach.qualify',
            title: 'Start from past work, then qualify a named buyer',
            body: (
              <>
                Choose <strong>Suggest from our past work</strong> for a reviewed warm
                start, or paste contacts you already know. Nothing is selected by
                default. A contact is worth researching when it names a real person,
                the relationship owner can explain how GoInvo knows them, and there is
                a plausible buyer, budget, or referral path. An organization placeholder
                remains an account lead until someone names the person to call.
              </>
            ),
          },
          {
            id: 'marketing.outreach.intake',
            title: 'Preview contact intake before saving',
            body: (
              <>
                Paste the contact list, review the parsed names and companies,
                remove rows that should not become records, and leave detected
                duplicates skipped. Contacts are stored in the private Outreach
                dataset. <strong>Check names sends the raw pasted list to Claude</strong>
                for structuring. Later, Research sends the contact&apos;s name,
                organization, role, public LinkedIn URL, relationship notes, owner,
                and source notes to Claude with web search enabled. Do not enter
                secrets or sensitive personal, medical, financial, or client data.
              </>
            ),
          },
          {
            id: 'marketing.outreach.research',
            title: 'Research before ranking calls',
            body: (
              <>
                Research each contact against active case-study evidence, then
                review identity confidence, relationship warmth, linked evidence,
                relationship owner/history, the full call brief, and the proposed
                offer. AI research enters <strong>Needs review</strong>,
                never the call plan. Choose <strong>Make this sound like me</strong> to
                edit the opener and call brief in your own words before approval.
                Approve only when the person is verified and
                current evidence is linked and the chosen offer has a real currency
                amount, not just a timeframe or “rate card” label.
              </>
            ),
          },
          {
            id: 'marketing.outreach.tracker',
            title: 'Work from the progress tracker',
            body: (
              <>
                Start with the first actionable row. The tracker puts due and overdue
                follow-ups ahead of new first touches, then uses workflow readiness and
                relationship warmth to order the remaining work. Read <strong>Why next</strong>{' '}
                before acting: it explains the stored evidence behind the position instead
                of presenting a mystery score. A preparation row can tell you to research,
                review, or complete contact details before outreach is appropriate.
              </>
            ),
          },
          {
            id: 'marketing.outreach.modality',
            title: 'Correct the recommended modality',
            body: (
              <>
                Phone, email, and LinkedIn advice comes only from saved contact details,
                interaction history, and your channel options. Use <strong>Channel options</strong>{' '}
                to mark a modality Preferred, Unavailable, Unresponsive, or Do not use;
                return it to Auto to remove the override. These options change the advice
                without deleting an address, number, or URL. Choose <strong>Edit contact info</strong>{' '}
                when the underlying contact information is missing or wrong. Contact links
                only open your phone, mail, or LinkedIn app. When reviewed wording exists,
                email opens with that opener prefilled for you to edit. Outreach never sends anything
                automatically.
              </>
            ),
          },
          {
            id: 'marketing.outreach.recover',
            title: 'Recover without losing reviewed work',
            body: (
              <>
                A failed batch leaves unfinished contacts as New, so rerun only those.
                If identity is uncertain, edit the person or organization before trying
                again. Re-research replaces the generated summary, sources, opener, and
                brief (including voice edits), clears prior approval, and preserves
                human-edited offer drafts. If work
                evidence is missing or stale, correct Evidence first and then re-research.
              </>
            ),
          },
          {
            id: 'marketing.outreach.log',
            title: 'Log the real outcome and next step',
            body: (
              <>
                After contact, record the channel, outcome, intelligence, next step,
                status, the offer and evidence actually used, follow-up date, and any
                opportunity value. Use Won or Lost
                when the commercial outcome is known; Won requires the actual closed
                value. This keeps active opportunities
                in the follow-up queue and makes conversion and revenue attributable
                to the relationship, offer, evidence, and channel used.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.evidence',
        title: 'Maintain case-study Evidence',
        blurb: 'Review the capability evidence Outreach uses to match contacts with credible work.',
        minutes: 4,
        keywords: ['evidence', 'case studies', 'capabilities', 'outreach', 'extract', 'proof', 'manual edit', 'duplicate', 're-extract', 'source'],
        searchText: 'Extract published case studies, filter and edit evidence, preserve manual corrections, confirm destructive replacement, verify source links, and re-run contact research after material changes.',
        links: [{ path: '/marketing?view=workEvidence', label: 'Open Evidence' }],
        steps: [
          {
            id: 'marketing.evidence.extract',
            title: 'Extract evidence from real case studies',
            body: (
              <>
                Build the evidence index from published GoInvo work so
                Outreach can match a contact to specific capabilities and
                shipped examples rather than generic claims.
              </>
            ),
          },
          {
            id: 'marketing.evidence.review',
            title: 'Review evidence before using it in outreach',
            body: (
              <>
                Keep titles, summaries, capability tags, and source links
                accurate with the row&apos;s Edit action. Saving marks the record as
                manually reviewed so bulk re-extraction preserves it. Re-run contact
                research after meaningful evidence changes so the call plan uses the
                current index. An <strong>Ignored duplicate</strong> does not enter
                research matching; exclude the obsolete sibling only after checking
                whether an existing contact still references it.
              </>
            ),
          },
          {
            id: 'marketing.evidence.reextract',
            title: 'Re-extract without erasing manual corrections',
            body: (
              <>
                Bulk re-extraction advances through every published case study and
                reports failures instead of claiming success early. It preserves
                manually edited records. Replacing one of those records requires an
                explicit destructive confirmation because its summary, tags, outcomes,
                highlights, and source fields will be regenerated.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.measure',
        title: 'Set up and read A/B tests',
        blurb: 'Define a controlled bet, verify launch readiness, and keep the result and decision together.',
        minutes: 6,
        keywords: ['measure', 'a/b test', 'experiment', 'variant', 'flag', 'metric', 'vercel', 'decision'],
        links: [{ path: '/marketing?view=abTesting', label: 'Open A/B tests' }],
        steps: [
          {
            id: 'marketing.measure.setup',
            title: 'Define the bet and control',
            body: (
              <>
                Use <strong>Add A/B test</strong> to name the hypothesis, page,
                flag key, one control, one treatment, the primary metric, and
                guardrails. A test is not launch-ready without exactly those two
                unique variants and a measurable success rule.
              </>
            ),
          },
          {
            id: 'marketing.measure.launch',
            title: 'Verify previews, tracking, and rollout',
            body: (
              <>
                Check desktop and mobile previews, connect the analytics
                source, and verify every required event includes the experiment,
                flag, variant, and page context without visitor PII. Signals
                from another experiment never belong in this result. Changing
                the tracking definition starts a new measurement window, so
                earlier counts are not mixed with the repaired setup.
              </>
            ),
          },
          {
            id: 'marketing.measure.decide',
            title: 'Record evidence before the decision',
            body: (
              <>
                Treat early comparisons as directional, not statistically
                proven winners. Add the readout and evidence in Results, then
                choose the decision. Preserve the result even when a variant
                loses so the same design bet is not repeated without new evidence.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.designer-workflow-tutorials',
        title: 'Autopilot tutorials',
        blurb: 'Practice the Marketing view tour and learn how Autopilot sessions, suggestions, and next-step routing fit together.',
        minutes: 4,
        keywords: ['autopilot', 'tutorial', 'tour', 'sessions', 'ai assistant', 'guided setup'],
        links: [
          { path: '/marketing?view=dashboard&designerWorkflowTutorial=marketing-view-tour', label: 'Run Marketing view tour' },
          { path: '/marketing?view=dashboard&designerWorkflowTutorial=designer-workflow-recommendation', label: 'Run demo recommendation tour' },
          { path: '/marketing?view=dashboard&designerWorkflowTutorial=designer-workflow-sessions', label: 'Run sessions tour' },
        ],
        steps: [
          {
            id: 'marketing.designer-workflow-tutorials.launch',
            title: 'Launch the Marketing view tour',
            body: (
              <>
                Use <strong>Run Marketing view tour</strong> to open Marketing
                and start the guided overlay. A first visit also offers this
                tour once; closing it early will not mark it complete. It highlights the active UI,
                explains the decision in plain language, and advances with
                either the bubble arrows or the real action.
              </>
            ),
          },
          {
            id: 'marketing.designer-workflow-tutorials.sessions',
            title: 'Use sessions instead of restarting',
            body: (
              <>
                The Autopilot sessions tutorial shows how to reopen saved setup runs.
                This keeps designers from wasting prompts when they are still
                working through the same planning question.
              </>
            ),
          },
          {
            id: 'marketing.designer-workflow-tutorials.non-mutating',
            title: 'Tours do not create records',
            body: (
              <>
                Tutorials stop before the create action. They can prepare the
                interface and generate a recommendation preview, but research
                plans are only created by an explicit user action. Campaigns,
                funnels, calendar items, and Quick Links are created later from
                selected Research opportunities.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.channels',
        title: 'Configure Marketing settings',
        blurb: 'Set financial posture, brand voices, the approved AI model, and the channels where GoInvo publishes.',
        minutes: 7,
        keywords: ['settings', 'financial posture', 'survival', 'growth', 'ai model', 'brand voice', 'tone', 'default voice', 'learn voice', 'review edits', 'examples', 'overfit', 'archive', 'channels', 'instagram', 'linkedin', 'email', 'content types', 'carousel', 'reel'],
        links: [
          { path: '/marketing?view=channels', label: 'Open Settings' },
          { path: '/marketing?view=outreach', label: 'Open Outreach' },
        ],
        steps: [
          {
            id: 'marketing.channels.posture',
            title: 'Set financial posture before choosing priorities',
            body: (
              <>
                Financial posture changes what Home and Autopilot recommend.
                Survival and Rebuild favor work that can create revenue inside
                the runway; Stable and Growth can support longer-horizon
                research, content, SEO, experiments, and brand work. If the
                saved posture cannot be loaded, stop and retry instead of
                replacing an unknown value.
              </>
            ),
          },
          {
            id: 'marketing.channels.ai-model',
            title: 'Choose an approved AI model deliberately',
            body: (
              <>
                The selected model is shared by Marketing AI assistance. Use
                one of the supported choices shown in Settings; changing it can
                affect response speed, cost, and writing quality across the suite.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-library',
            title: 'Create publish-safe voice profiles',
            body: (
              <>
                In Settings, add a profile for the studio voice and for any
                principal whose writing should sound distinct. Use plain-language
                guidance, one <strong>Do</strong> or <strong>Avoid</strong> rule per
                line, and up to six short representative snippets that demonstrate
                different principles rather than repeating the same pattern. These
                profiles live with public site configuration, so enter publish-safe guidance only.
                Never paste private client details, private emails, credentials,
                or claims GoInvo cannot substantiate.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-default',
            title: 'Keep one active default',
            body: (
              <>
                Mark the voices people can still use as <strong>Active</strong> and
                choose one active default. That default is used for outward-facing
                generation across the Marketing Suite unless a workflow selects a
                different active voice. <strong>Archive</strong> a retired voice so
                it remains recognizable in older work but cannot guide new drafts.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-boundary',
            title: 'Voice changes style, never the evidence',
            body: (
              <>
                A voice profile can change cadence, word choice, and formality. It
                never changes verified facts, evidence, identity checks,
                feasibility scores, citations, URLs, prices, metrics, statuses, or
                internal analysis. If style guidance conflicts with accuracy,
                privacy, or a source, the factual constraint wins.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-learning',
            title: 'Review what your edits should teach the voice',
            body: (
              <>
                After you revise generated copy, the Marketing Suite can compare
                the generated and edited versions and propose a small set of
                reusable voice principles. It ignores factual corrections,
                prices, URLs, citations, evidence, and scores instead of treating
                them as style. Nothing changes the voice automatically: a human
                chooses which general <strong>Do</strong> and <strong>Avoid</strong>{' '}
                rules to add and, for publish-safe content drafts, whether to
                replace the small representative example set. One edit never
                replaces the voice&apos;s overall guidance.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-examples',
            title: 'Keep examples small, diverse, and forward-looking',
            body: (
              <>
                An approved learning proposal can curate at most six
                representative snippets. Keep examples that demonstrate different
                principles and situations; near-duplicates encourage overfitting
                without teaching anything new. Approved learning affects future
                drafts only. It does not rewrite the document you just edited or
                preserve a history of the before-and-after copy.
              </>
            ),
          },
          {
            id: 'marketing.channels.voice-outreach',
            title: 'Override the default for one Outreach contact',
            body: (
              <>
                Use a contact&apos;s voice selector before research or re-research
                when that relationship should sound like a particular principal.
                The per-contact selection overrides the suite default for the
                outward-facing opener and call wording only. After research,{' '}
                <strong>Make this sound like me</strong> remains the final human
                override. Saving that manual wording clears approval so the edited
                brief receives one more review before returning to the call plan.
                When the opener materially changes, Outreach also prepares a
                separate voice-learning proposal for review; saving never applies
                that proposal automatically. The mixed factual context in the call
                brief is deliberately excluded until its ask and question are stored
                as separate fields.
              </>
            ),
          },
          {
            id: 'marketing.channels.first',
            title: 'Start with channels before planning content',
            body: (
              <>
                Open <strong>Channels</strong> and add the places GoInvo
                publishes, such as Instagram, LinkedIn, email, the website, or
                partner sites. Calendar items use these channels to offer
                useful downstream choices.
              </>
            ),
          },
          {
            id: 'marketing.channels.types',
            title: 'Give each channel its own formats',
            body: (
              <>
                Content types should be individual managed entries, not a
                comma-separated list. Instagram can include carousel, reel,
                story, and post; email can include newsletter or announcement;
                the website can include article, case study, service page, or
                landing page.
              </>
            ),
          },
          {
            id: 'marketing.channels.deletion',
            title: 'Check usage before deleting',
            body: (
              <>
                Before deleting a channel or content type, review whether
                calendar items or campaigns already reference it. If content is
                attached, archive or reassign the channel instead of removing
                the vocabulary out from under existing work.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.campaigns',
        title: 'Plan campaigns by goal and audience',
        blurb: 'Use campaigns as strategy containers, not tiny content tasks.',
        minutes: 7,
        keywords: ['campaigns', 'goals', 'audience', 'keywords', 'intent', 'utm', 'measurement'],
        links: [{ path: '/marketing?view=campaigns', label: 'Open Campaigns' }],
        steps: [
          {
            id: 'marketing.campaigns.goal',
            title: 'Start with the outcome',
            body: (
              <>
                A campaign should name what should change: awareness for a
                topic, qualified conversations, service-page interest,
                audience growth, launch support, or adoption of a resource.
                Specific executions like case study release are better treated
                as playbooks inside that broader objective.
              </>
            ),
          },
          {
            id: 'marketing.campaigns.audience',
            title: 'Name the audience and intent',
            body: (
              <>
                Write who this is for and what they are trying to learn,
                compare, decide, or do. Fill the objective, topic cluster,
                visitor intent, and target query prompts so designers can make
                the right artifact without needing a marketing background.
              </>
            ),
          },
          {
            id: 'marketing.campaigns.measurement',
            title: 'Keep measurement consistent',
            body: (
              <>
                Choose one primary KPI and one stable UTM campaign name. Keep
                source, medium, campaign, content, and term naming consistent
                and lowercase so reports do not split the same effort across
                multiple rows.
              </>
            ),
          },
          {
            id: 'marketing.campaigns.relationships',
            title: 'Connect the rest of the suite',
            body: (
              <>
                Attach channels, funnels, analytics sources, and calendar
                items to the campaign. The campaign should become the shared
                folder for the goal, audience, messages, posts, landing pages,
                Quick Links, and results.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.funnels',
        title: 'Build reusable funnels',
        blurb: 'Map what someone should do after seeing a page, post, or link.',
        minutes: 5,
        keywords: ['funnels', 'stage map', 'cta', 'conversion', 'awareness', 'consideration'],
        links: [{ path: '/marketing?view=funnels', label: 'Open Funnels' }],
        steps: [
          {
            id: 'marketing.funnels.stage-map',
            title: 'Use funnels for stage maps',
            body: (
              <>
                Funnels define reusable stages, offers, CTAs, destination URLs,
                and metrics. A campaign can use a funnel so every calendar item
                has a clear next step instead of ending with a vague
                <em>learn more</em>.
              </>
            ),
          },
          {
            id: 'marketing.funnels.open-tabs',
            title: 'Open funnels like working files',
            body: (
              <>
                The All funnels view is the browser. Click{' '}
                <strong>Open funnel</strong> to add a funnel to the tab strip,
                then switch between open funnels without crowding the editor.
              </>
            ),
          },
          {
            id: 'marketing.funnels.templates',
            title: 'Create, then tune the working stage map',
            body: (
              <>
                <strong>Add funnel</strong> creates a working draft. Give it an
                audience and conversion goal, then add, edit, reorder, or remove
                stages and tune every CTA and destination to the actual campaign.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.templates',
        title: 'Maintain setup Templates',
        blurb: 'Keep reusable campaign and funnel starting points useful without turning them into rigid rules.',
        minutes: 4,
        keywords: ['templates', 'campaign template', 'funnel template', 'defaults', 'scaffolding'],
        links: [{ path: '/marketing?view=templates', label: 'Open Templates' }],
        steps: [
          {
            id: 'marketing.templates.scope',
            title: 'Template the repeated structure',
            body: (
              <>
                Save recurring campaign goals, funnel stages, CTAs, and setup
                prompts that genuinely reduce repeated work. Keep the template
                broad enough to fit more than one project.
              </>
            ),
          },
          {
            id: 'marketing.templates.review',
            title: 'Rewrite defaults for the actual work',
            body: (
              <>
                Preview the template before creating a record, then replace its
                prompts with the real audience, objective, evidence, destination,
                and success signal. Archive patterns that are no longer used.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.calendar',
        title: 'Schedule content on the calendar',
        blurb: 'Turn strategy into dated design work and publishing tasks.',
        minutes: 6,
        keywords: ['calendar', 'content calendar', 'publish date', 'post', 'templates', 'brief'],
        links: [{ path: '/marketing?view=calendar', label: 'Open Calendar' }],
        steps: [
          {
            id: 'marketing.calendar.add',
            title: 'Add work from the right calendar entry point',
            body: (
              <>
                Use a day cell&apos;s add control when the date is already known.
                The toolbar <strong>Add</strong> creates an undated working item
                that you can schedule after filling the brief. Set the owner,
                publish date and time, channel, content type, campaign, and
                optional template before handoff.
              </>
            ),
          },
          {
            id: 'marketing.calendar.brief',
            title: 'Fill the practical brief',
            body: (
              <>
                Each item should have an owner, brief, CTA, funnel stage, and
                connected analytics source when possible. A Working URL is for
                internal production; only a reviewed Published URL is safe for
                public links. Templates like insight
                carousel, case study promo, newsletter roundup, or service page
                nudge can prefill the first draft.
              </>
            ),
          },
          {
            id: 'marketing.calendar.links',
            title: 'Connect posts to Quick Links',
            body: (
              <>
                When a post points people to <em>link in bio</em>, add its
                reviewed Published URL, then attach or create a Quick Link from
                the calendar item. Scheduled status alone never exposes a
                Working URL on <code>/links</code>.
              </>
            ),
          },
          {
            id: 'marketing.calendar.preview-publish',
            title: 'Preview the saved version, then publish explicitly',
            body: (
              <>
                Preview identifies whether it shows saved content or unsaved
                editor changes. Save and refresh the preview before approving
                what will publish. Scheduled means planned; automatic publishing
                also requires the item&apos;s opt-in, valid platform credentials,
                required media and alt text, and a working scheduler connection.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.analytics',
        title: 'Connect analytics once',
        blurb: 'Attach measurement sources to campaigns, funnels, and channels.',
        minutes: 5,
        keywords: ['analytics', 'ga4', 'gtm', 'vercel', 'metrics', 'utm', 'dashboard'],
        links: [{ path: '/marketing?view=analytics', label: 'Open Analytics' }],
        steps: [
          {
            id: 'marketing.analytics.sources',
            title: 'Create shared sources',
            body: (
              <>
                Use <strong>Analytics</strong> for GA4, GTM, Vercel Analytics,
                dashboard links, reporting cadence, and key metric definitions.
                Sources should be reusable so campaigns and funnels do not need
                analytics setup from scratch. Mark a source Connected only after
                its provider-specific property, container, or project evidence
                has been supplied and verified.
              </>
            ),
          },
          {
            id: 'marketing.analytics.connections',
            title: 'Attach sources to marketing elements',
            body: (
              <>
                Connect only verified Connected sources to campaigns, funnels,
                and channels. Save any open source edits before changing a
                relationship. The
                dashboard view should make it easy to see which marketing
                elements are measured and which still need a source.
              </>
            ),
          },
          {
            id: 'marketing.analytics.vercel',
            title: 'Use Vercel data for site-level signals',
            body: (
              <>
                Vercel Analytics and Speed Insights are useful for lightweight
                website signals. Pair them with campaign UTMs or GA4 when you
                need channel attribution, source/medium reporting, or keyword
                and creative variation data.
              </>
            ),
          },
        ],
      },
      {
        id: 'marketing.quick-links',
        title: 'Manage Quick Links',
        blurb: 'Control the public /links page used by Instagram and social posts.',
        minutes: 4,
        keywords: ['quick links', 'link in bio', 'instagram', 'links', '/links', 'housing truths'],
        links: [
          { path: '/marketing?view=linkTree', label: 'Open Quick Links' },
        ],
        steps: [
          {
            id: 'marketing.quick-links.baseline',
            title: 'Keep durable links managed',
            body: (
              <>
                Use <strong>Quick Links</strong> to manage the public{' '}
                <code>/links</code> page. Durable links such as GoInvo and
                Housing Truths should exist as managed link records so Studio
                and the public page show the same list.
              </>
            ),
          },
          {
            id: 'marketing.quick-links.calendar',
            title: 'Create temporary links from calendar items',
            body: (
              <>
                Calendar items with a reviewed Published URL appear as
                candidates, so the link page can be updated from the content
                plan instead of maintained by memory. Internal Working URLs are
                never public candidates.
              </>
            ),
          },
          {
            id: 'marketing.quick-links.editor',
            title: 'Edit the public card details',
            body: (
              <>
                Each Quick Link can have a title, description, URL, cover
                image, status, ordering, campaign, and associated posts. A link
                appears only when the Quick Link itself is active and inside its
                visibility window. If every link is archived, the public page is
                intentionally empty rather than filled with hidden fallbacks.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 3. Authoring ---------------- */
  {
    id: 'authoring',
    title: 'Authoring content',
    blurb: 'Vision pieces, case studies, team members, categories, jobs, viz.',
    icon: EditIcon,
    articles: [
      {
        id: 'authoring.vision',
        title: 'Publish a new vision piece',
        blurb: 'Create, write, preview, and publish a feature article.',
        minutes: 12,
        keywords: ['feature', 'article', 'vision', 'write', 'new'],
        links: [{ path: '/structure/orderable-feature', label: 'Open the Vision Piece list' }],
        steps: [
          {
            id: 'authoring.vision.create',
            title: 'Create the document',
            body: (
              <>
                Open the Vision Piece list and click <strong>+ Create</strong>.
                Pick the template that fits — <em>Standard article</em> for
                prose-driven posts, <em>Research/report</em> for citation-heavy
                work, or <em>Visual/stat-heavy</em> for infographic-led pieces.
              </>
            ),
          },
          {
            id: 'authoring.vision.properties',
            title: 'Fill in Properties first',
            body: (
              <>
                Title, slug, hero/listing image, listing summary, fixed
                Vision categories, display date, and optional SEO title and
                description. The Properties tab also controls selected Work
                features, /vision Spotlight, and whether page metadata renders.
              </>
            ),
            tip: (
              <>
                <strong>Hero image:</strong> 1600×900 px. Drop a hotspot on
                the focal point so the image stays useful when cropped for
                cards or mobile.
              </>
            ),
          },
          {
            id: 'authoring.vision.body',
            title: 'Write the article in Main Content',
            body: (
              <>
                Body uses Portable Text. Use <em>Body paragraph</em> for prose,{' '}
                <em>Section heading (H2)</em> for breaks, and add Quote,
                Results, Image, Columns, Buttons, Data Table, or Background
                Section blocks where they make sense.
              </>
            ),
            tip: (
              <>
                Add a <strong>References</strong> block at the bottom if you
                cite sources, then link superscripts in the body to it.
              </>
            ),
          },
          {
            id: 'authoring.vision.extras',
            title: 'Add Extra Content',
            body: (
              <>
                Authors, contributors, special thanks, newsletter background,
                and About-GoInvo placement live under <em>Extra Content</em>.
                Skip anything that doesn&apos;t apply.
              </>
            ),
          },
          {
            id: 'authoring.vision.spotlight',
            title: 'Optional — feature it on listing surfaces',
            body: (
              <>
                Toggle <strong>Selected Feature</strong> to include the piece
                in selected/featured surfaces such as the /work feature cards.
                To feature it at the top of /vision, open{' '}
                <strong>Content → Spotlight</strong> and add it to the
                Spotlight list — the first item is shown large, the rest appear
                beside it, and you can drag to reorder.
              </>
            ),
          },
          {
            id: 'authoring.vision.preview',
            title: 'Preview the draft',
            body: (
              <>
                Open <em>Presentation</em> to view the draft on the real page.
                Iterate until the layout looks right — drafts never appear on
                the public site.
              </>
            ),
          },
          {
            id: 'authoring.vision.publish',
            title: 'Publish',
            body: (
              <>
                When the Publishing Checklist on the Properties tab is happy,
                click <strong>Publish</strong> in the document action bar.
              </>
            ),
          },
        ],
      },
      {
        id: 'authoring.case-study',
        title: 'Add a case study',
        blurb: 'Document a client project for the /work page.',
        minutes: 10,
        keywords: ['case study', 'client', 'work', 'portfolio'],
        links: [{ path: '/structure/orderable-caseStudy', label: 'Open the Case Study list' }],
        steps: [
          {
            id: 'authoring.case-study.create',
            title: 'Create',
            body: (
              <>
                Open the Case Study list and click <strong>+ Create</strong>.
                New case studies land at the top of the list flagged as
                unsorted — drag them into place after publishing.
              </>
            ),
          },
          {
            id: 'authoring.case-study.props',
            title: 'Fill in Properties (visual order)',
            body: (
              <>
                Title, slug, hero image (1600×900), client name, caption,
                time, display tags, categories. The fields appear in the
                Properties tab in the same order they render on the page.
              </>
            ),
          },
          {
            id: 'authoring.case-study.content',
            title: 'Write Main Content',
            body: (
              <>
                Standard structure: Problem → Solution → Results, then
                whatever case-specific sections fit. Use the Results block
                for stat rows and Image / Columns for visuals.
              </>
            ),
          },
          {
            id: 'authoring.case-study.categories',
            title: 'Assign categories',
            body: (
              <>
                Pick from the canonical category list. Main Categories
                (Healthcare, Enterprise, Government, AI) drive the /work filter
                chips; additional categories still display as tags and help
                internal taxonomy. Use Display Tags only as a fallback when no
                Category fits.
              </>
            ),
          },
          {
            id: 'authoring.case-study.publish',
            title: 'Publish + drag into order',
            body: (
              <>
                Publish, then drag the row into its final position in the
                orderable list. Click the list edit/pencil control and choose{' '}
                <strong>Save New Order Preset</strong> to persist the order.
              </>
            ),
          },
        ],
      },
      {
        id: 'authoring.team-member',
        title: 'Add a new team member',
        blurb: 'Bio, headshot, social links — for /about and the homepage marquee.',
        minutes: 6,
        keywords: ['team', 'staff', 'people', 'bio', 'about'],
        links: [{ path: '/structure/orderable-teamMember', label: 'Open the Team Member list' }],
        steps: [
          {
            id: 'authoring.team-member.create',
            title: 'Create the document',
            body: (
              <>
                Open the Team Member list and click <strong>+ Create</strong>.
              </>
            ),
          },
          {
            id: 'authoring.team-member.fields',
            title: 'Fill in name, role, bio, photo',
            body: (
              <>
                Bio is a restricted Portable Text — paragraphs only, with
                bold/italic and links. Photo: square, at least 400×400 px,
                with a hotspot on the face.
              </>
            ),
          },
          {
            id: 'authoring.team-member.socials',
            title: 'Optional socials',
            body: (
              <>
                LinkedIn, Twitter/X, Medium, personal website, email. Empty
                fields are hidden — only the ones you fill in render on the
                profile.
              </>
            ),
          },
          {
            id: 'authoring.team-member.publish',
            title: 'Publish + drag into order',
            body: (
              <>
                Publish, then drag the row into the desired position in the
                Team list and save the order preset if the list asks for it.
                The marquee on the homepage and the team grid on /about both
                honor this order.
              </>
            ),
          },
        ],
      },
      {
        id: 'authoring.health-viz',
        title: 'Add a health visualization',
        blurb: 'For the /vision/health-visualizations grid.',
        minutes: 5,
        keywords: ['health', 'viz', 'visualization', 'poster', 'pdf'],
        links: [{ path: '/structure/healthVisualization', label: 'Open Health Visualizations' }],
        steps: [
          {
            id: 'authoring.health-viz.create',
            title: 'Create',
            body: (
              <>
                Click <strong>+ Create</strong> and fill in title, slug,
                preview image (800×600+), caption, date, and the download
                URL. The date format is <code>MMM.YYYY</code>, e.g.{' '}
                <code>Oct.2021</code>.
              </>
            ),
          },
          {
            id: 'authoring.health-viz.links',
            title: 'Link the assets',
            body: (
              <>
                <strong>Download Link</strong> points at the PDF. Use a{' '}
                <strong>Learn More Link</strong> if there&apos;s a related
                feature article.
              </>
            ),
          },
        ],
      },
      {
        id: 'authoring.categories',
        title: 'Manage categories',
        blurb: 'Case-study categories, /work filter chips, and listing tags.',
        minutes: 3,
        keywords: ['category', 'tag', 'taxonomy', 'filter'],
        links: [{ path: '/structure/category', label: 'Open Categories' }],
        steps: [
          {
            id: 'authoring.categories.add',
            title: 'Add a new category',
            body: (
              <>
                Category documents are used by Case Studies. Only categories
                with <strong>Main Category</strong> enabled become /work filter
                chips, so add a new main category only when several case
                studies need it. Additional categories can be more specific
                without cluttering the chip row.
              </>
            ),
          },
          {
            id: 'authoring.categories.assign',
            title: 'Assign categories to documents',
            body: (
              <>
                Case Studies reference Category documents from their
                <em>Categories</em> field. Vision Pieces do not reference these
                documents; they use the fixed category choices in the Vision
                Piece Properties tab.
              </>
            ),
          },
        ],
      },
      {
        id: 'authoring.job',
        title: 'Post a job opening',
        blurb: 'Add a role to /about/careers.',
        minutes: 3,
        keywords: ['careers', 'jobs', 'hiring', 'open role'],
        links: [{ path: '/structure/job', label: 'Open the Job list' }],
        steps: [
          {
            id: 'authoring.job.create',
            title: 'Create the job document',
            body: (
              <>
                Fill in title, description, location, employment type, and
                <strong>Is Active</strong>. The careers page queries{' '}
                <code>activeJobsQuery</code>; uncheck Is Active to remove a
                role without deleting it.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 4. Publishing & workflow ---------------- */
  {
    id: 'publishing',
    title: 'Publishing & workflow',
    blurb: 'Drafts, previews, ordering, releases.',
    icon: PublishIcon,
    articles: [
      {
        id: 'publishing.lifecycle',
        title: 'Drafts → Preview → Publish',
        blurb: 'The standard lifecycle for any change.',
        minutes: 3,
        keywords: ['draft', 'publish', 'workflow', 'lifecycle'],
        steps: [
          {
            id: 'publishing.lifecycle.draft',
            title: 'Drafts save automatically',
            body: (
              <>
                Every edit is saved as a draft as you type. Drafts are
                visible in Studio and the Presentation preview, but never on
                the public site.
              </>
            ),
          },
          {
            id: 'publishing.lifecycle.preview',
            title: 'Preview before publishing',
            body: (
              <>
                Open <em>Presentation</em> at the top of the studio. The
                preview applies your draft on top of the live page so you can
                see the change in context.
              </>
            ),
          },
          {
            id: 'publishing.lifecycle.publish',
            title: 'Publish when ready',
            body: (
              <>
                Click <strong>Publish</strong> in the document action bar.
                The live site updates within a few seconds.
              </>
            ),
          },
          {
            id: 'publishing.lifecycle.discard',
            title: 'Discard a draft you don’t want',
            body: (
              <>
                Open the editor, use the document action menu, and choose{' '}
                <em>Discard changes</em>. Discard never deletes published
                content — only the in-progress draft.
              </>
            ),
          },
        ],
      },
      {
        id: 'publishing.ordering',
        title: 'Reorder lists',
        blurb: 'Drag-and-drop ordering for Case Study, Vision Piece, Team Member.',
        minutes: 3,
        keywords: ['order', 'sort', 'rearrange', 'drag', 'preset'],
        steps: [
          {
            id: 'publishing.ordering.drag',
            title: 'Drag the handle',
            body: (
              <>
                Grab the dotted-square handle on the left of any row and drop
                it into the desired position. Highlighted rows are new docs
                that need to be placed.
              </>
            ),
          },
          {
            id: 'publishing.ordering.save',
            title: 'Save the order preset',
            body: (
              <>
                Click the list edit/pencil control and choose{' '}
                <strong>Save New Order Preset</strong>. Until you save, the
                &quot;X pages still need to be ordered&quot; banner stays.
              </>
            ),
            tip: (
              <>
                The order persists to the public site automatically once the
                preset is saved.
              </>
            ),
          },
        ],
      },
      {
        id: 'publishing.releases',
        title: 'Working with releases',
        blurb: 'Group multiple changes and publish them together.',
        minutes: 4,
        keywords: ['release', 'batch', 'group', 'schedule'],
        steps: [
          {
            id: 'publishing.releases.what',
            title: 'What’s a release?',
            body: (
              <>
                The <strong>Drafts</strong> picker in the Studio top bar is
                the release-context picker. <em>Drafts</em> is the normal
                editing context for individual changes; named releases are the
                bundled contexts you create when several docs should launch
                together.
              </>
            ),
          },
          {
            id: 'publishing.releases.create',
            title: 'Create a new release for a campaign',
            body: (
              <>
                In the dropdown, click <strong>+ New release</strong> to
                start a parallel release for, say, a launch announcement.
                Edits made while that release is active stay isolated until
                you publish the release.
              </>
            ),
          },
          {
            id: 'publishing.releases.publish',
            title: 'Publish a release',
            body: (
              <>
                With the release selected, hit <strong>Publish release</strong>.
                Every doc in the release goes live atomically.
              </>
            ),
          },
        ],
      },
      {
        id: 'publishing.presentation',
        title: 'The Presentation tool',
        blurb: 'Live preview with click-to-edit on the page.',
        minutes: 3,
        keywords: ['preview', 'presentation', 'visual editor', 'live'],
        links: [{ path: '/presentation', label: 'Open Presentation' }],
        steps: [
          {
            id: 'publishing.presentation.open',
            title: 'Open Presentation',
            body: (
              <>
                Click <em>Presentation</em> at the top. The studio
                splits into editor (left) + live page (right) with your draft
                applied.
              </>
            ),
          },
          {
            id: 'publishing.presentation.click',
            title: 'Click anything on the page',
            body: (
              <>
                Hover over editable Sanity-rendered content to see overlays.
                Click into a heading, paragraph, or image and the editor jumps
                to that field. Static code-rendered pages and some custom
                blocks may preview correctly without click-to-edit overlays.
              </>
            ),
          },
          {
            id: 'publishing.presentation.share',
            title: 'Share a preview link',
            body: (
              <>
                Click the share icon at the top of the preview to copy a URL
                for teammate review. Depending on the preview environment, the
                teammate may still need Studio or Vercel access.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 5. Media & assets ---------------- */
  {
    id: 'media',
    title: 'Media & assets',
    blurb: 'Hero images, inline media, embeds.',
    icon: ImageIcon,
    articles: [
      {
        id: 'media.heroes',
        title: 'Hero images',
        blurb: 'Sizes, hotspots, and how the hero gets cropped.',
        minutes: 3,
        keywords: ['hero', 'image', 'cover', 'header'],
        steps: [
          {
            id: 'media.heroes.sizes',
            title: 'Recommended sizes',
            body: (
              <ul style={inlineList}>
                <li><strong>Feature hero:</strong> 1600 × 900 px</li>
                <li><strong>Case study hero:</strong> 1600 × 900 px</li>
                <li><strong>Health Visualization preview:</strong> 800 × 600 px or larger</li>
                <li><strong>Social share:</strong> 1200 × 630 px (optional)</li>
              </ul>
            ),
          },
          {
            id: 'media.heroes.hotspot',
            title: 'Always set a hotspot',
            body: (
              <>
                After uploading, click the image, then click the crosshair to
                place the hotspot on the focal point (a face, the center of
                an infographic). The site uses the hotspot when cropping for
                cards and mobile.
              </>
            ),
          },
        ],
      },
      {
        id: 'media.inline-images',
        title: 'Inline images',
        blurb: 'Images inside the article body — sizes, captions, alt text.',
        minutes: 3,
        keywords: ['inline image', 'caption', 'alt', 'accessibility'],
        steps: [
          {
            id: 'media.inline-images.add',
            title: 'Insert an image block',
            body: (
              <>
                In the Portable Text editor, use the block insert menu and
                choose <strong>Image</strong>. Upload a new asset or pick an
                existing one from the asset library.
              </>
            ),
          },
          {
            id: 'media.inline-images.alt',
            title: 'Alt text + caption',
            body: (
              <>
                Always add concise alt text. For diagrams, charts, and dense
                UI screens, fill in the <strong>Accessibility description</strong>{' '}
                field too — screen readers receive it via aria-describedby.
              </>
            ),
            tip: (
              <>
                Decorative images (pure ornament, no information): check
                &quot;Decorative image&quot; and the alt is rendered as empty.
              </>
            ),
          },
          {
            id: 'media.inline-images.size',
            title: 'Choose a size',
            body: (
              <>
                Small (25%), Medium (50%), Large (75%), Full width, or Full
                bleed (viewport-wide). Use alignment only when the image is
                narrower than full width. Most inline article images look
                right at Large or Full.
              </>
            ),
          },
        ],
      },
      {
        id: 'media.video',
        title: 'Embed a video',
        blurb: 'CloudFront video URLs and YouTube.',
        minutes: 2,
        keywords: ['video', 'embed', 'youtube', 'cloudfront'],
        steps: [
          {
            id: 'media.video.block',
            title: 'Add a Video Embed block',
            body: (
              <>
                In the Portable Text insert menu, choose{' '}
                <strong>Video Embed</strong>. Paste a CloudFront or YouTube
                URL, then set size if the video needs to break wider than the
                article column.
              </>
            ),
          },
          {
            id: 'media.video.poster',
            title: 'Add a poster image',
            body: (
              <>
                The poster appears before the video plays. Use it as a
                still-frame fallback so the article isn&apos;t a wall of black
                rectangles before videos load. Enable Auto-play only for
                ambient/demo videos; those play muted and looping.
              </>
            ),
          },
        ],
      },
      {
        id: 'media.iframe',
        title: 'Embed an iframe (Figma, Miro, Sheets)',
        blurb: 'Interactive prototypes and external embeds.',
        minutes: 2,
        keywords: ['figma', 'miro', 'iframe', 'embed', 'prototype', 'sheets'],
        steps: [
          {
            id: 'media.iframe.add',
            title: 'Add an Iframe Embed block',
            body: (
              <>
                Paste the embed URL. The block defaults to a 16:9 aspect
                ratio; switch to 9:16 for tall mobile prototypes or set a
                fixed height (px) for KnightLab Timelines and similar
                fixed-height embeds.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 6. Editorial reference ---------------- */
  {
    id: 'reference',
    title: 'Editorial reference',
    blurb: 'Content types, image sizes, slug rules.',
    icon: BookIcon,
    articles: [
      {
        id: 'reference.content-types',
        title: 'Content types and where they show',
        blurb: 'What every entry in the structure pane controls on the public site.',
        minutes: 3,
        keywords: ['schema', 'types', 'documents', 'cheat sheet'],
        steps: [
          {
            id: 'reference.content-types.table',
            title: 'The map',
            body: (
              <Table
                headers={['Type', 'Where it shows', 'Purpose']}
                rows={[
                  ['Case Study', '/work, /work/<slug>', 'Client project write-ups + curated homepage story cards.'],
                  ['Vision Piece', '/vision, /vision/<slug>', 'Vision articles, thought leadership, research. Some legacy/highly custom slugs are rendered by code overrides. (Schema name: feature.)'],
                  ['Team Member', '/about, homepage marquee', 'Bios, role, social links, headshot.'],
                  ['Category', '/work filter chips and case-study tags', 'Category documents are referenced by Case Studies. Only Main Categories appear as /work filter chips.'],
                  ['Job', '/about/careers', 'Open positions.'],
                  ['Health Visualization', '/vision/health-visualizations', 'Standalone visualization entries, e.g. Determinants of Health.'],
                  ['CMS Feedback', 'Internal — leave alone', 'Backing store for the "Send Feedback" tool.'],
                ]}
              />
            ),
          },
        ],
      },
      {
        id: 'reference.image-sizes',
        title: 'Image sizes cheat sheet',
        blurb: 'Recommended dimensions by surface.',
        minutes: 1,
        keywords: ['image', 'sizes', 'dimensions'],
        steps: [
          {
            id: 'reference.image-sizes.table',
            title: 'Sizes',
            body: (
              <Table
                headers={['Where', 'Recommended', 'Notes']}
                rows={[
                  ['Feature hero', '1600 × 900 px', 'Default hero / listing image.'],
                  ['Inline article', '800–1200 px wide', 'Depends on the in-block size setting.'],
                  ['Infographic / poster', '1600 px wide+', 'Use Full Image Cover when the whole frame matters.'],
                  ['Team headshot', '400 × 400 px+', 'Square. Set hotspot on the face.'],
                  ['Health Viz preview', '800 × 600 px+', 'Cropped to 16:10 on the listing.'],
                  ['Social share crop', '1200 × 630 px', 'Generated from the feature/article hero image or case-study image.'],
                ]}
              />
            ),
          },
        ],
      },
      {
        id: 'reference.slugs',
        title: 'Slug + URL rules',
        blurb: 'How URLs are derived and what to avoid.',
        minutes: 2,
        keywords: ['slug', 'url', 'permalink'],
        steps: [
          {
            id: 'reference.slugs.format',
            title: 'Format',
            body: (
              <>
                Lowercase, hyphen-separated, no trailing slash. Click{' '}
                <strong>Generate</strong> next to the slug field to derive it
                from the title — then trim it to something short and
                memorable.
              </>
            ),
          },
          {
            id: 'reference.slugs.never-change',
            title: 'Don’t change a published slug',
            body: (
              <>
                A change breaks every external link to the page. If you
                really must, ask the dev team to add a redirect from the old
                slug to the new one in <code>redirects.json</code>.
              </>
            ),
          },
        ],
      },
      {
        id: 'reference.publishing-checklist',
        title: 'Publishing checklist',
        blurb: 'Run through this before clicking Publish on a feature article.',
        minutes: 1,
        keywords: ['checklist', 'publish', 'review', 'qa'],
        steps: [
          {
            id: 'reference.publishing-checklist.list',
            title: 'The list',
            body: (
              <ul style={inlineList}>
                <li>Title and slug are set.</li>
                <li>Hero image and article summary are set.</li>
                <li>Body content is complete and in the right order.</li>
                <li>Authors, contributors, special thanks configured when needed.</li>
                <li>References present if citations are used.</li>
                <li>SEO title/description, listing summary, categories, and display date considered.</li>
                <li>Previewed in Presentation and looks right at desktop + mobile.</li>
              </ul>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 7. Troubleshooting ---------------- */
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    blurb: 'Common stumbles and how to fix them.',
    icon: WarningOutlineIcon,
    articles: [
      {
        id: 'troubleshooting.draft-missing',
        title: 'My draft doesn’t show on the live site',
        blurb: 'Drafts are private until publish — here’s where to look.',
        minutes: 1,
        keywords: ['draft', 'not live', 'missing', 'published'],
        steps: [
          {
            id: 'troubleshooting.draft-missing.check',
            title: 'Check the badge',
            body: (
              <>
                If the editor shows only an orange <strong>Draft</strong>{' '}
                badge (no green Published), the doc has never been published.
                Click <strong>Publish</strong> in the document action bar.
              </>
            ),
          },
          {
            id: 'troubleshooting.draft-missing.preview',
            title: 'Preview drafts in Presentation',
            body: (
              <>
                The public site only shows published content. To see drafts
                applied to the page, use <em>Presentation</em>.
              </>
            ),
          },
          {
            id: 'troubleshooting.draft-missing.static-override',
            title: 'Check for static Vision overrides',
            body: (
              <>
                Some legacy or highly custom Vision pages are rendered from
                code instead of the Sanity body. If Studio shows a static
                override warning badge on the Vision Piece, Sanity content is
                still useful for reference, but the visible page may need a code
                change too.
              </>
            ),
          },
        ],
      },
      {
        id: 'troubleshooting.unsorted-banner',
        title: '"X pages still need to be ordered"',
        blurb: 'The banner that won’t go away after you drag a row.',
        minutes: 1,
        keywords: ['order', 'preset', 'sort', 'banner'],
        steps: [
          {
            id: 'troubleshooting.unsorted-banner.save',
            title: 'Save the order preset',
            body: (
              <>
                Drag-and-drop alone isn&apos;t enough. After dragging, click the
                list edit/pencil control and choose{' '}
                <strong>Save New Order Preset</strong>. The banner clears once
                every highlighted row has been placed and saved.
              </>
            ),
          },
        ],
      },
      {
        id: 'troubleshooting.deleted',
        title: 'I deleted something — can I undo it?',
        blurb: 'Sanity’s history feature, in short.',
        minutes: 2,
        keywords: ['undo', 'restore', 'delete', 'history', 'revert'],
        steps: [
          {
            id: 'troubleshooting.deleted.history',
            title: 'Open the document’s history',
            body: (
              <>
                If the document still exists (you reverted a field, didn&apos;t
                delete the whole doc), open the document action menu and choose
                <strong>History</strong>. Pick a prior version and restore.
              </>
            ),
          },
          {
            id: 'troubleshooting.deleted.deleted-doc',
            title: 'If the document was deleted entirely',
            body: (
              <>
                Ask the dev team — Sanity keeps an audit log even for deleted
                documents and they can restore from a recent snapshot.
              </>
            ),
          },
        ],
      },
      {
        id: 'troubleshooting.code-help',
        title: 'When code is actually needed',
        blurb: 'How to know if a request belongs in Studio vs in code.',
        minutes: 2,
        keywords: ['developer', 'code', 'engineer', 'when to ask'],
        steps: [
          {
            id: 'troubleshooting.code-help.heuristic',
            title: 'Quick heuristic',
            body: (
              <>
                If the article can be built from prose, images, quotes,
                references, columns, buttons, results blocks, or data tables,
                it should stay in Sanity.
              </>
            ),
          },
          {
            id: 'troubleshooting.code-help.escalate',
            title: 'When to escalate',
            body: (
              <>
                Use code only for <em>interactive graphics</em>,{' '}
                <em>one-off experiences</em>, or <em>brand-new block types
                that don&apos;t exist yet</em>. If you hit one of those, ask
                the dev team for a new reusable block — that way the next
                article gets to use it too.
              </>
            ),
          },
        ],
      },
    ],
  },
]

const articleAliases: Record<string, string> = {
  'basics.marketing': 'marketing.overview',
  'marketing.workflow': 'marketing.designer-workflow-tutorials',
}

/* -----------------------------------------------------------------
 * Search filter
 * ----------------------------------------------------------------- */

function articleMatches(article: Article, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (article.title.toLowerCase().includes(q)) return true
  if (article.blurb.toLowerCase().includes(q)) return true
  if (article.keywords?.some((k) => k.toLowerCase().includes(q))) return true
  if (article.searchText?.toLowerCase().includes(q)) return true
  if (article.steps.some((s) => s.title.toLowerCase().includes(q))) return true
  return false
}

/* -----------------------------------------------------------------
 * Components
 * ----------------------------------------------------------------- */

function IntentLink({ spec }: { spec: IntentSpec }) {
  return (
    <a href={`/studio${spec.path}`} style={styles.intentButton}>
      {spec.label}
      <ChevronRightIcon style={{ marginLeft: 4 }} />
    </a>
  )
}

function Step({
  step,
  articleTitle,
  index,
  done,
  onToggle,
}: {
  step: StepDef
  articleTitle: string
  index: number
  done: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ ...styles.step, opacity: done ? 0.7 : 1 }}>
      <button
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark “${step.title}” in “${articleTitle}” as not done` : `Mark “${step.title}” in “${articleTitle}” as done`}
        style={styles.stepCheck}
        type="button"
      >
        {done ? (
          <CheckmarkCircleIcon style={{ color: '#22a06b', fontSize: 22 }} />
        ) : (
          <CircleIcon style={{ color: 'var(--card-muted-fg-color)', fontSize: 22 }} />
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.stepTitle}>
          <span style={styles.stepNumber}>{index + 1}</span>
          <span style={done ? styles.stepTitleDone : undefined}>{step.title}</span>
        </div>
        <div style={styles.stepBody}>{step.body}</div>
        {step.tip ? <div style={styles.stepTip}>{step.tip}</div> : null}
        {step.intent ? (
          <div style={{ marginTop: 12 }}>
            <IntentLink spec={step.intent} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ArticleCard({
  article,
  open,
  progress,
  onToggleOpen,
  onToggleStep,
}: {
  article: Article
  open: boolean
  progress: ProgressState
  onToggleOpen: () => void
  onToggleStep: (id: string) => void
}) {
  const total = article.steps.length
  const done = article.steps.filter((s) => progress[s.id]).length
  const pct = total === 0 ? 0 : (done / total) * 100
  const headerId = `article-${article.id}-header`
  const panelId = `article-${article.id}-panel`

  return (
    <div id={`article-${article.id}`} tabIndex={-1} style={{ ...styles.articleCard, ...(open ? styles.articleCardOpen : null) }}>
      <button
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        data-knowledge-article-header="true"
        onClick={onToggleOpen}
        style={styles.articleHeader}
        type="button"
      >
        <span style={styles.articleChevron}>
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={styles.articleTitle}>{article.title}</span>
          <span style={styles.articleBlurb}>{article.blurb}</span>
        </span>
        <span data-knowledge-article-meta="true" style={styles.articleMeta}>
          {article.minutes ? <span>{article.minutes} min</span> : null}
          <span style={styles.articleCount}>
            {done}/{total}
          </span>
          <span style={styles.miniBar}>
            <span style={{ ...styles.miniBarFill, width: `${pct}%` }} />
          </span>
        </span>
      </button>
      <div id={panelId} role="region" aria-labelledby={headerId} hidden={!open} style={styles.articleBody}>
          {article.links && article.links.length > 0 ? (
            <div style={styles.linkRow}>
              {article.links.map((link, i) => (
                <IntentLink key={i} spec={link} />
              ))}
            </div>
          ) : null}
          <div style={styles.steps}>
            {article.steps.map((step, i) => (
              <Step
                key={step.id}
                step={step}
                articleTitle={article.title}
                index={i}
                done={!!progress[step.id]}
                onToggle={() => onToggleStep(step.id)}
              />
            ))}
          </div>
      </div>
    </div>
  )
}

function CategorySection({
  category,
  query,
  openArticles,
  progress,
  onToggleArticle,
  onToggleStep,
}: {
  category: Category
  query: string
  openArticles: Set<string>
  progress: ProgressState
  onToggleArticle: (id: string) => void
  onToggleStep: (id: string) => void
}) {
  const filtered = category.articles.filter((a) => articleMatches(a, query))
  if (filtered.length === 0) return null
  const Icon = category.icon

  const total = category.articles.flatMap((a) => a.steps).length
  const done = category.articles
    .flatMap((a) => a.steps)
    .filter((s) => progress[s.id]).length

  return (
    <section style={styles.categorySection}>
      <header style={styles.categoryHeader}>
        <div style={styles.categoryIconWrap}>
          <Icon style={{ fontSize: 22 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={styles.categoryTitle}>{category.title}</h2>
          <p style={styles.categoryBlurb}>{category.blurb}</p>
        </div>
        <div style={styles.categoryProgress}>
          {done}/{total}
        </div>
      </header>
      <div style={styles.articleList}>
        {filtered.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            open={openArticles.has(article.id)}
            progress={progress}
            onToggleOpen={() => onToggleArticle(article.id)}
            onToggleStep={onToggleStep}
          />
        ))}
      </div>
    </section>
  )
}

/* -----------------------------------------------------------------
 * Main component
 * ----------------------------------------------------------------- */

function GettingStartedComponent() {
  const [progress, setProgress] = useState<ProgressState>({})
  const [openArticles, setOpenArticles] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  useEffect(() => {
    setProgress(loadProgress())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const requestedArticleId = new URLSearchParams(window.location.search).get('article')
    if (!requestedArticleId) return
    const articleId = articleAliases[requestedArticleId] || requestedArticleId

    const exists = categories.some((category) =>
      category.articles.some((article) => article.id === articleId),
    )
    if (!exists) return

    setQuery('')
    setOpenArticles((current) => new Set([...current, articleId]))
    window.setTimeout(() => {
      const articleElement = document.getElementById(`article-${articleId}`)
      articleElement?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      articleElement?.focus({ preventScroll: true })
    }, 100)
  }, [])

  const toggleArticle = (id: string) =>
    setOpenArticles((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleStep = (id: string) =>
    setProgress((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (!next[id]) delete next[id]
      saveProgress(next)
      return next
    })

  const resetProgress = () => {
    if (!window.confirm('Clear all checkmarks across the knowledge base?')) return
    saveProgress({})
    setProgress({})
  }

  const totals = useMemo(() => {
    const all = categories.flatMap((c) => c.articles).flatMap((a) => a.steps)
    const done = all.filter((s) => progress[s.id]).length
    const articles = categories.flatMap((c) => c.articles).length
    return { done, total: all.length, articles }
  }, [progress])

  const matchingArticles = useMemo(() => {
    if (!query) return null
    return categories
      .flatMap((c) => c.articles)
      .filter((a) => articleMatches(a, query)).length
  }, [query])

  return (
    <div data-knowledge-base="true" style={styles.root}>
      <style>{KNOWLEDGE_BASE_RESPONSIVE_CSS}</style>
      {/* Hero */}
      <header data-knowledge-hero="true" style={styles.hero}>
        <div style={styles.heroIcon}>
          <RocketIcon style={{ fontSize: 28 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={styles.heroTitle}>GoInvo CMS Knowledge Base</h1>
          <p style={styles.heroBlurb}>
            {totals.articles} articles across {categories.length} categories.
            Walk through any path step by step — your progress is saved
            locally to this browser.
          </p>
        </div>
        <div data-knowledge-progress="true" style={styles.heroProgress}>
          <div style={styles.heroProgressLabel}>
            {totals.done}<span style={{ opacity: 0.5 }}> / {totals.total}</span>
          </div>
          <div style={styles.heroProgressBar}>
            <div
              style={{
                ...styles.heroProgressFill,
                width: totals.total === 0 ? '0%' : `${(totals.done / totals.total) * 100}%`,
              }}
            />
          </div>
          {totals.done > 0 ? (
            <button
              onClick={resetProgress}
              style={styles.heroReset}
              type="button"
            >
              <ResetIcon /> Reset
            </button>
          ) : null}
        </div>
      </header>

      {/* Search */}
      <div style={styles.searchWrap}>
        <SearchIcon style={styles.searchIcon} />
        <input
          type="search"
          aria-label="Search the CMS knowledge base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles, e.g. “hero image”, “categories”, “reorder”…"
          style={styles.searchInput}
        />
        {query ? (
          <button
            onClick={() => setQuery('')}
            style={styles.searchClear}
            aria-label="Clear search"
            type="button"
          >
            <CloseIcon />
          </button>
        ) : null}
        {query ? (
          <span style={styles.searchCount}>
            {matchingArticles} {matchingArticles === 1 ? 'match' : 'matches'}
          </span>
        ) : null}
      </div>

      {/* Categories */}
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          query={query}
          openArticles={openArticles}
          progress={progress}
          onToggleArticle={toggleArticle}
          onToggleStep={toggleStep}
        />
      ))}

      {/* Empty state */}
      {query && matchingArticles === 0 ? (
        <div style={styles.emptyState}>
          <BulbOutlineIcon style={{ fontSize: 32, color: 'var(--card-muted-fg-color)' }} />
          <p style={{ margin: '12px 0 0' }}>
            Nothing matches &ldquo;{query}&rdquo;. Try a shorter keyword like
            &ldquo;hero&rdquo; or &ldquo;publish&rdquo;.
          </p>
        </div>
      ) : null}

      {/* Footer */}
      <footer style={styles.footerNote}>
        Missing something? Send a note via the <strong>Feedback</strong> tab
        at the top of the studio, or message the dev team directly.
      </footer>
    </div>
  )
}

/* -----------------------------------------------------------------
 * Reusable Table
 * ----------------------------------------------------------------- */

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={styles.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={styles.td}>
                  {j === 0 ? <strong>{cell}</strong> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------- */

const styles: Record<string, CSSProperties> = {
  root: {
    maxWidth: 960,
    margin: '0 auto',
    padding: '32px 24px 96px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: 'var(--card-fg-color)',
    lineHeight: 1.55,
  },
  hero: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    padding: '20px 24px',
                  background: 'linear-gradient(135deg, rgba(0,115,133,0.10), rgba(184,74,14,0.06))',
    border: '1px solid var(--card-border-color)',
    borderRadius: 12,
    marginBottom: 16,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: teal,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroTitle: { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
  heroBlurb: { margin: 0, color: 'var(--card-muted-fg-color)', fontSize: 14 },
  heroProgress: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 140,
  },
  heroProgressLabel: { fontSize: 22, fontWeight: 600 },
  heroProgressBar: {
    width: 120,
    height: 6,
    background: 'rgba(128,128,128,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    background: teal,
    transition: 'width 0.3s ease',
  },
  heroReset: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: 'none',
    color: 'var(--card-muted-fg-color)',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },

  searchWrap: {
    position: 'relative',
    marginBottom: 24,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--card-muted-fg-color)',
    fontSize: 18,
  },
  searchInput: {
    width: '100%',
    padding: '12px 44px 12px 42px',
    border: '1px solid var(--card-border-color)',
    borderRadius: 999,
    background: 'var(--card-bg-color)',
    color: 'var(--card-fg-color)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  },
  searchClear: {
    position: 'absolute',
    right: 90,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    color: 'var(--card-muted-fg-color)',
    cursor: 'pointer',
    padding: 4,
    fontSize: 16,
  },
  searchCount: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12,
    color: 'var(--card-muted-fg-color)',
  },

  categorySection: { marginBottom: 28 },
  categoryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottom: '1px solid var(--card-border-color)',
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'rgba(0,115,133,0.12)',
    color: teal,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  categoryTitle: { fontSize: 18, fontWeight: 600, margin: '0 0 2px' },
  categoryBlurb: { color: 'var(--card-muted-fg-color)', fontSize: 13, margin: 0 },
  categoryProgress: {
    fontSize: 12,
    color: 'var(--card-muted-fg-color)',
    fontVariantNumeric: 'tabular-nums',
  },

  articleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  articleCard: {
    border: '1px solid var(--card-border-color)',
    borderRadius: 10,
    background: 'var(--card-bg-color)',
    overflow: 'hidden',
    transition: 'border-color 0.15s ease',
  },
  articleCardOpen: {
    borderColor: teal,
  },
  articleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'inherit',
  },
  articleChevron: {
    color: 'var(--card-muted-fg-color)',
    flexShrink: 0,
  },
  articleTitle: { display: 'block', fontSize: 15, fontWeight: 600 },
  articleBlurb: {
    display: 'block',
    color: 'var(--card-muted-fg-color)',
    fontSize: 13,
    marginTop: 2,
  },
  articleMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12,
    color: 'var(--card-muted-fg-color)',
    flexShrink: 0,
  },
  articleCount: {
    fontVariantNumeric: 'tabular-nums',
    minWidth: 28,
    textAlign: 'right',
  },
  miniBar: {
    width: 48,
    height: 4,
    background: 'rgba(128,128,128,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
    display: 'inline-block',
  },
  miniBarFill: {
    display: 'block',
    height: '100%',
    background: teal,
    transition: 'width 0.3s ease',
  },
  articleBody: {
    padding: '4px 16px 16px',
    borderTop: '1px solid var(--card-border-color)',
  },
  linkRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    margin: '12px 0',
  },

  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  step: {
    display: 'flex',
    gap: 12,
    padding: 14,
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    background: 'rgba(128,128,128,0.04)',
    transition: 'opacity 0.15s ease',
  },
  stepCheck: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  stepTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  stepTitleDone: {
    textDecoration: 'line-through',
    color: 'var(--card-muted-fg-color)',
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    padding: '0 6px',
    fontSize: 11,
    fontWeight: 700,
    color: teal,
    background: 'rgba(0,115,133,0.12)',
    borderRadius: 999,
  },
  stepBody: { fontSize: 14, color: 'var(--card-fg-color)' },
  stepTip: {
    marginTop: 8,
    padding: '8px 12px',
    fontSize: 13,
    background: 'rgba(0,115,133,0.06)',
    borderLeft: `3px solid ${teal}`,
    borderRadius: '0 6px 6px 0',
    color: 'var(--card-fg-color)',
  },

  intentButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 12px',
    background: teal,
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px',
    color: 'var(--card-muted-fg-color)',
    fontSize: 14,
    border: '1px dashed var(--card-border-color)',
    borderRadius: 10,
    marginBottom: 28,
  },

  footerNote: {
    marginTop: 32,
    padding: '14px 18px',
    fontSize: 13,
    color: 'var(--card-muted-fg-color)',
    border: '1px solid var(--card-border-color)',
    borderRadius: 8,
    background: 'rgba(128,128,128,0.04)',
  },

  tableWrap: { overflowX: 'auto', marginTop: 8 },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    background: 'rgba(128,128,128,0.08)',
    borderBottom: '2px solid var(--card-border-color)',
    fontWeight: 600,
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid var(--card-border-color)',
    verticalAlign: 'top',
  },
}

/* -----------------------------------------------------------------
 * Plugin export
 * ----------------------------------------------------------------- */

const gettingStartedTool: Tool = {
  name: 'getting-started',
  title: 'Getting Started',
  icon: BookIcon,
  component: GettingStartedComponent,
}

export const gettingStartedPlugin = definePlugin({
  name: 'getting-started',
  tools: [gettingStartedTool],
})

// Mark unused-icon imports as referenced so the import list documents what
// the file uses without TypeScript stripping them; they're available if a
// future article wants them.
void [
  RobotIcon, ControlsIcon, UploadIcon, UsersIcon, TagsIcon, CaseIcon,
  EarthGlobeIcon, MasterDetailIcon, StackIcon, ChartUpwardIcon, RefreshIcon,
]
