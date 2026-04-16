import { definePlugin, type Tool } from 'sanity'
import { BookIcon } from '@sanity/icons'

function GettingStartedComponent() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--card-fg-color)', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Getting Started</h1>
      <p style={{ fontSize: 16, color: 'var(--card-muted-fg-color)', marginBottom: 40 }}>
        A practical guide for editors creating and publishing GoInvo articles in Sanity.
      </p>

      <Section title="1. Navigating the Studio">
        <p>The Studio has three tabs at the top of the screen:</p>
        <ul>
          <li><strong>Structure</strong> - create and edit all content</li>
          <li><strong>Presentation</strong> - preview draft changes on the website</li>
          <li><strong>Getting Started</strong> - this guide</li>
        </ul>
        <p>
          In <strong>Structure</strong>, the left sidebar lists all content types. Click a type to see existing documents, or click <strong>+ Create</strong> to add a new one.
        </p>
      </Section>

      <Section title="2. Content Types at a Glance">
        <Table
          headers={['Type', 'Purpose']}
          rows={[
            ['Feature', 'Vision articles, thought leadership, research pieces, and editorial content'],
            ['Case Study', 'Client project write-ups shown on /work'],
            ['Vision Project', 'Internal or experimental vision projects'],
            ['Category', 'Tags for filtering case studies and features'],
            ['Team Member', 'Staff and alumni bios on /about'],
            ['Job', 'Open positions on /about/careers'],
            ['Homepage Header', 'Rotating hero slides on the homepage'],
            ['Page', 'Generic site pages'],
            ['Site Settings', 'Global footer, social, and contact settings'],
          ]}
        />

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Creating a Feature Article</h4>
        <ol>
          <li>In <strong>Structure</strong>, click <strong>Feature</strong> then <strong>+ Create</strong>.</li>
          <li>Choose the template that fits best: <strong>Standard article</strong>, <strong>Research/report article</strong>, or <strong>Visual/stat-heavy article</strong>.</li>
          <li>Fill in the <strong>Basics</strong> tab first: title, slug, categories, date, and client if needed.</li>
          <li>Use <strong>Hero &amp; Meta</strong> for the hero image, image positioning, listing summary, and page meta row.</li>
          <li>Write the article in the <strong>Body</strong> tab using Portable Text blocks.</li>
          <li>Use the <strong>People</strong> tab for authors, contributors, newsletter background, and About GoInvo settings.</li>
          <li>Review the <strong>Page Settings</strong> checklist, then preview the draft in <strong>Presentation</strong>.</li>
          <li>Click <strong>Publish</strong> when everything looks correct.</li>
        </ol>

        <Callout>
          <strong>Check the authoring status card first.</strong> New articles should be <strong>Guided CMS</strong>. If a page is marked <strong>Code-assisted CMS</strong> or <strong>Static override</strong>, the card explains what Studio can and cannot control.
        </Callout>
      </Section>

      <Section title="3. Drafts, Preview, and Publish">
        <p>Every document starts as a <strong>draft</strong>. Drafts are visible in Studio and preview, but not on the live site.</p>
        <ol>
          <li>Create or edit a document - it saves automatically as a draft.</li>
          <li>Open <strong>Presentation</strong> to review the draft on the site before publishing.</li>
          <li>Use the <strong>Draft Preview Reviewed</strong> checkbox in the Feature editor once you have checked the page.</li>
          <li>Click the green <strong>Publish</strong> button when the article is ready.</li>
        </ol>

        <Callout>
          <strong>Preview is part of the workflow.</strong> For feature articles, the expectation is: draft first, preview second, publish last.
        </Callout>
      </Section>

      <Section title="4. Writing the Article Body">
        <p>
          Feature articles use Portable Text for the main body. The goal is to keep authoring explicit: if you want a quote, results row, references list, or image, add that block directly where it should appear.
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Supported text styles</h4>
        <ul>
          <li><strong>Body paragraph</strong> - standard article paragraph</li>
          <li><strong>Body paragraph (extra space below)</strong> - paragraph with a little more breathing room</li>
          <li><strong>Large serif paragraph</strong> - lead-in or emphasis paragraph</li>
          <li><strong>Section heading (H2)</strong> and <strong>Section heading (large H2)</strong> - main section breaks</li>
          <li><strong>Subheading (H3)</strong> and <strong>Small heading (H4)</strong> - sub-sections</li>
          <li><strong>Quote</strong> and <strong>Callout</strong> - styled emphasis blocks</li>
        </ul>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Common content blocks</h4>
        <Table
          headers={['Block', 'Best use']}
          rows={[
            ['Image', 'Inline visuals with size, caption, border, and alignment controls'],
            ['Columns', 'Two, three, or four column layouts for comparisons or mixed media'],
            ['Quote', 'Pull quotes with author, role, and optional background'],
            ['Results', 'Curated stats presets: Standard stats row, Stat band, or Stacked stats'],
            ['Data Table', 'Paste CSV or TSV data to render striped editorial tables with optional headers'],
            ['References', 'Source links when citations are used in the article'],
            ['Video Embed', 'Embedded video with optional poster and caption'],
            ['Divider', 'Section separator'],
          ]}
        />

        <Callout>
          <strong>Results blocks are explicit now.</strong> Pick the preset you want in the block itself. There is no slug-based stat injection for normal article authoring.
        </Callout>
      </Section>

      <Section title="5. Images and Hero Media">
        <Table
          headers={['Content', 'Recommended size', 'Notes']}
          rows={[
            ['Feature hero', '1600 x 900 px', 'Default hero and listing image size'],
            ['Inline article image', '800-1200 px wide', 'Depends on the image size setting in the body'],
            ['Large infographic or poster', '1600 px wide or larger', 'Use Full Image Cover only when the full image must remain visible'],
            ['Social share image', '1200 x 630 px', 'Optional SEO image size'],
          ]}
        />
        <p>
          Use the image hotspot to mark the focal point. That helps the site keep the important part of the image visible on smaller screens and in cropped listings.
        </p>
      </Section>

      <Section title="6. People, Newsletter, and Page Settings">
        <p>
          Feature articles split page-level controls into clear tabs:
        </p>
        <ul>
          <li><strong>People</strong> controls authors, contributors, special thanks, newsletter background, and About GoInvo placement.</li>
          <li><strong>Page Settings</strong> holds listing behavior, the preview checkbox, and the article acceptance checklist.</li>
          <li><strong>SEO</strong> is where you write the meta description for search engines.</li>
        </ul>
        <p>
          If a section is not relevant yet, leave it blank. The editor will hide some advanced controls until they are needed.
        </p>
      </Section>

      <Section title="7. Publishing Checklist for Editors">
        <ul>
          <li>Title and slug are set.</li>
          <li>Hero image and article summary are set.</li>
          <li>Body content is complete and in the right order.</li>
          <li>Authors, contributors, or special thanks are configured when needed.</li>
          <li>References are present if citations are used.</li>
          <li>Draft preview has been reviewed before publish.</li>
        </ul>
      </Section>

      <Section title="8. When Code Is Actually Needed">
        <p>
          The normal workflow for articles should stay inside Sanity. Use code only for rare cases such as interactive graphics, one-off experiences, or brand-new block types that do not exist yet.
        </p>
        <p>
          If you hit one of those cases, ask for a new reusable block or variant instead of a page-specific workaround. That keeps the editor experience clean for future articles too.
        </p>

        <Callout>
          <strong>Good default:</strong> if the article can be built from prose, images, quotes, references, columns, buttons, results blocks, or data tables, it should stay in Sanity.
        </Callout>
      </Section>

      <Section title="9. Best Practices">
        <ul>
          <li>Preview every draft before publishing.</li>
          <li>Write alt text for meaningful images.</li>
          <li>Keep slugs short and descriptive.</li>
          <li>Use templates and presets before asking for custom code.</li>
          <li>Prefer explicit blocks and settings over layout tricks inside paragraph text.</li>
        </ul>
      </Section>

      <div style={{ marginTop: 48, padding: '16px 20px', background: 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))', borderRadius: 8, fontSize: 14, color: 'var(--card-muted-fg-color)' }}>
        Questions? Reach out to the development team or check the{' '}
        <a href="https://www.sanity.io/docs" target="_blank" rel="noopener noreferrer" style={{ color: '#007385' }}>
          Sanity documentation
        </a>.
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--card-border-color)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 12, marginBottom: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', background: 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))', borderBottom: '2px solid var(--card-border-color)', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid var(--card-border-color)' }}>
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

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ margin: '16px 0', padding: '12px 16px', background: 'var(--card-badge-default-bg-color, rgba(128,128,128,0.1))', borderLeft: '4px solid #007385', borderRadius: '0 6px 6px 0', fontSize: 14 }}>
      {children}
    </div>
  )
}

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
