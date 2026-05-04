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
        blurb: 'The four top tabs, the structure pane, and the editor pane.',
        minutes: 3,
        keywords: ['intro', 'overview', 'welcome', 'first time', 'navigation'],
        links: [{ path: '/structure', label: 'Open the Structure pane' }],
        steps: [
          {
            id: 'basics.tour.tabs',
            title: 'The four top tabs',
            body: (
              <>
                <strong>Structure</strong> for editing content.{' '}
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
            title: 'The "Drafts" dropdown (top right)',
            body: (
              <>
                That&apos;s Sanity&apos;s release-context picker, not a status
                filter. Most of the time leave it on <em>Drafts</em>; switching
                to <em>Published</em> shows the live version of every doc,
                read-only.
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
                Happy with it? Click the green <strong>Publish</strong> button
                at the bottom-right. Want to abandon it? Click the … menu and
                choose <em>Discard changes</em>.
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
                <li><kbd style={kbd}>Ctrl</kbd>/<kbd style={kbd}>⌘</kbd> + <kbd style={kbd}>S</kbd> — saves the current edit (autosave already runs, this just confirms)</li>
                <li><kbd style={kbd}>Ctrl</kbd>/<kbd style={kbd}>⌘</kbd> + <kbd style={kbd}>P</kbd> — Publish</li>
                <li><kbd style={kbd}>Ctrl</kbd>/<kbd style={kbd}>⌘</kbd> + <kbd style={kbd}>K</kbd> — open the global search</li>
                <li><kbd style={kbd}>Esc</kbd> — close the current pane</li>
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

  /* ---------------- 2. Authoring ---------------- */
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
                Title, slug, hero image, listing summary, categories, date,
                page meta. The Properties tab mirrors the order of the
                rendered page so you can fill it in top-to-bottom.
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
                Results, Image, or Columns blocks where they make sense.
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
            title: 'Optional — feature it on /vision',
            body: (
              <>
                Toggle <strong>Selected Feature</strong> to put the piece in
                the /vision Features grid and the /work feature cards. Toggle{' '}
                <strong>Spotlight on /vision</strong> to pin it to the top
                Spotlight slot (only one piece at a time).
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
                click the green <strong>Publish</strong> button at the
                bottom-right.
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
                Pick from the canonical category list — these drive the
                filter chips on /work. Use Display Tags only as a fallback
                when no Category fits.
              </>
            ),
          },
          {
            id: 'authoring.case-study.publish',
            title: 'Publish + drag into order',
            body: (
              <>
                Publish, then drag the row into its final position in the
                list. Click the document-list edit (pencil) icon at the top
                of the list and choose <strong>Save New Order Preset</strong>{' '}
                to persist.
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
                Team list (the marquee on the homepage and the team grid on
                /about both honor this order).
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
        blurb: 'The tags that drive /work filter chips and listings.',
        minutes: 3,
        keywords: ['category', 'tag', 'taxonomy', 'filter'],
        links: [{ path: '/structure/category', label: 'Open Categories' }],
        steps: [
          {
            id: 'authoring.categories.add',
            title: 'Add a new category',
            body: (
              <>
                Categories drive the filter chips on /work. Add one only when
                you have at least 2-3 case studies that fit it — singletons
                clutter the chip row.
              </>
            ),
          },
          {
            id: 'authoring.categories.assign',
            title: 'Assign categories to documents',
            body: (
              <>
                Categories are referenced from Case Study and Vision Piece
                documents. Open the doc, scroll to <em>Categories</em>, and
                pick one or more.
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
                Title, role description, qualifications, and location. The
                careers page queries <code>activeJobsQuery</code>; mark a job
                as inactive to remove it without deleting.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 3. Publishing & workflow ---------------- */
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
                Click the green <strong>Publish</strong> button at the
                bottom-right of the editor. The live site updates within a
                few seconds.
              </>
            ),
          },
          {
            id: 'publishing.lifecycle.discard',
            title: 'Discard a draft you don’t want',
            body: (
              <>
                Open the editor, click the … menu at the top-right, and
                choose <em>Discard changes</em>. Discard never deletes
                published content — only the in-progress draft.
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
                Click the document-list edit (pencil) icon at the top of the
                list and choose <strong>Save New Order Preset</strong>. Until
                you save, the &quot;X pages still need to be ordered&quot;
                banner stays.
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
                The <strong>Drafts</strong> dropdown at the top right is the
                release-context picker. By default you edit in the{' '}
                <em>Drafts</em> release — every doc you change there ends up
                in a single bundle that publishes together.
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
                Hover over any block to see edit overlays. Click into a heading,
                paragraph, or image and the editor jumps to that field — fast
                way to tweak content where it lives.
              </>
            ),
          },
          {
            id: 'publishing.presentation.share',
            title: 'Share a preview link',
            body: (
              <>
                Click the share icon at the top of the preview to copy a URL
                that lets a teammate review the draft without logging in.
              </>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 4. Media & assets ---------------- */
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
                In the Portable Text editor, click <strong>Image</strong> in
                the toolbar. Upload or pick from the asset library.
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
                bleed (viewport-wide). Most inline article images look right
                at Large or Full.
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
                In the Portable Text toolbar, choose <strong>Video Embed</strong>.
                Paste a CloudFront URL or YouTube URL.
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
                rectangles before videos load.
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

  /* ---------------- 5. Editorial reference ---------------- */
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
                  ['Vision Piece', '/vision, /vision/<slug>', 'Vision articles, thought leadership, research. (Schema name: feature.)'],
                  ['Team Member', '/about, homepage marquee', 'Bios, role, social links, headshot.'],
                  ['Category', '/work filter chips', '11 in-use tags referenced by Case Studies + Vision Pieces.'],
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
                  ['Social share', '1200 × 630 px', 'Optional SEO image.'],
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
                <li>SEO metadata, listing summary, categories, display date considered.</li>
                <li>Previewed in Presentation and looks right at desktop + mobile.</li>
              </ul>
            ),
          },
        ],
      },
    ],
  },

  /* ---------------- 6. Troubleshooting ---------------- */
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
                Click <strong>Publish</strong>.
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
                Drag-and-drop alone isn&apos;t enough. After dragging, click
                the document-list edit (pencil) icon at the top of the list
                and choose <strong>Save New Order Preset</strong>. The banner
                clears once every highlighted row has been placed and saved.
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
                delete the whole doc), click the … menu at the top-right of
                the editor and choose <strong>History</strong>. Pick a prior
                version and restore.
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

/* -----------------------------------------------------------------
 * Search filter
 * ----------------------------------------------------------------- */

function articleMatches(article: Article, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (article.title.toLowerCase().includes(q)) return true
  if (article.blurb.toLowerCase().includes(q)) return true
  if (article.keywords?.some((k) => k.toLowerCase().includes(q))) return true
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
  index,
  done,
  onToggle,
}: {
  step: StepDef
  index: number
  done: boolean
  onToggle: () => void
}) {
  return (
    <div style={{ ...styles.step, opacity: done ? 0.7 : 1 }}>
      <button
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark step ${index + 1} as not done` : `Mark step ${index + 1} as done`}
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

  return (
    <div style={{ ...styles.articleCard, ...(open ? styles.articleCardOpen : null) }}>
      <button onClick={onToggleOpen} style={styles.articleHeader} type="button">
        <span style={styles.articleChevron}>
          {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={styles.articleTitle}>{article.title}</span>
          <span style={styles.articleBlurb}>{article.blurb}</span>
        </span>
        <span style={styles.articleMeta}>
          {article.minutes ? <span>{article.minutes} min</span> : null}
          <span style={styles.articleCount}>
            {done}/{total}
          </span>
          <span style={styles.miniBar}>
            <span style={{ ...styles.miniBarFill, width: `${pct}%` }} />
          </span>
        </span>
      </button>
      {open ? (
        <div style={styles.articleBody}>
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
                index={i}
                done={!!progress[step.id]}
                onToggle={() => onToggleStep(step.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
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
    <div style={styles.root}>
      {/* Hero */}
      <header style={styles.hero}>
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
        <div style={styles.heroProgress}>
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
    background: 'linear-gradient(135deg, rgba(0,115,133,0.10), rgba(227,98,22,0.06))',
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
