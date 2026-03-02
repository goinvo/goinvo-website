import { definePlugin, type Tool } from 'sanity'
import { BookIcon } from '@sanity/icons'

function GettingStartedComponent() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a2e', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Getting Started</h1>
      <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 40 }}>
        A guide for designers and editors working in the GoInvo CMS.
      </p>

      <Section title="1. Navigating the Studio">
        <p>
          The Studio has three tabs at the top of the screen:
        </p>
        <ul>
          <li><strong>Structure</strong> — where you create and edit all content (case studies, team members, pages, etc.)</li>
          <li><strong>Presentation</strong> — live preview of the site with your draft changes</li>
          <li><strong>Getting Started</strong> — this guide</li>
        </ul>
        <p>
          In <strong>Structure</strong>, the left sidebar lists all content types. Click a type to see existing documents, or click <strong>+ Create</strong> to add a new one.
        </p>
      </Section>

      <Section title="2. Content Types at a Glance">
        <Table
          headers={['Type', 'Purpose']}
          rows={[
            ['Case Study', 'Client project write-ups shown on /work'],
            ['Feature', 'Vision pieces, thought leadership, open-source projects'],
            ['Vision Project', 'Internal/experimental vision projects'],
            ['Category', 'Tags for filtering case studies and features'],
            ['Team Member', 'Staff and alumni bios on /about'],
            ['Job', 'Open positions on /about/careers'],
            ['Homepage Header', 'Rotating hero slides on the homepage'],
            ['Page', 'Generic content pages'],
            ['Site Settings', 'Global config: title, social links, footer, contact info'],
          ]}
        />
      </Section>

      <Section title="3. Drafts & Publishing">
        <p>
          Every document starts as a <strong>draft</strong>. Drafts are only visible in the Studio — visitors to the live site never see them.
        </p>
        <h4 style={{ marginTop: 20, marginBottom: 8 }}>The publishing workflow:</h4>
        <ol>
          <li>Create or edit a document — it automatically saves as a draft</li>
          <li>Use the <strong>Presentation</strong> tab to preview how it looks on the site</li>
          <li>When ready, click the green <strong>Publish</strong> button in the bottom-right corner</li>
          <li>The document is now live on the website</li>
        </ol>

        <Callout>
          <strong>Draft indicator:</strong> A document with unpublished changes shows an orange dot next to its title in the sidebar. A published document with no pending changes shows a green dot.
        </Callout>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Unpublishing:</h4>
        <p>
          Click the <strong>⋯</strong> menu next to the Publish button and select <strong>Unpublish</strong>. This removes the document from the live site but keeps it as a draft in the Studio. You can re-publish it later.
        </p>
      </Section>

      <Section title="4. The Rich Text Editor">
        <p>
          Case studies, features, and pages use a rich text editor (Portable Text) for their main content. Here is what is available:
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Text styles</h4>
        <ul>
          <li><strong>Normal</strong> — body paragraph</li>
          <li><strong>H2, H3, H4</strong> — section headings (H2 for main sections, H3 for sub-sections)</li>
          <li><strong>Quote</strong> — block quote styling</li>
        </ul>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Formatting</h4>
        <ul>
          <li><strong>Bold</strong>, <em>Italic</em>, Underline via the toolbar</li>
          <li><strong>Links</strong> — select text, click the link icon, enter a URL. Check &quot;Open in new tab&quot; for external links.</li>
        </ul>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>Special blocks</h4>
        <p>Click the <strong>+ Insert</strong> button in the editor toolbar to add:</p>
        <Table
          headers={['Block', 'What it does']}
          rows={[
            ['Image', 'Inline image with alt text, caption, and size control (small / medium / large / full width)'],
            ['Columns', '2- or 3-column layout with text and images'],
            ['Quote', 'Styled quote with author name and role'],
            ['Results', 'Stats banner — number + description pairs (e.g. "40%" / "reduction in errors")'],
            ['References', 'Numbered list of source links'],
            ['Video Embed', 'Embedded video with optional poster image and caption'],
            ['Divider', 'Horizontal rule (default or thick)'],
          ]}
        />
      </Section>

      <Section title="5. Image Guidelines">
        <Table
          headers={['Content', 'Recommended Size', 'Notes']}
          rows={[
            ['Case Study hero', '1600 × 900 px', 'Landscape, high quality'],
            ['Feature / Vision', '1600 × 900 px', 'Same as case studies'],
            ['Homepage Header', '1920 × 800 px', 'Extra wide for hero carousel'],
            ['Team Member photo', '400 × 400 px min', 'Square headshot'],
            ['Inline content', '800–1200 px wide', 'Depends on size setting'],
            ['Social share (SEO)', '1200 × 630 px', 'Open Graph standard'],
          ]}
        />
        <Callout>
          All images support <strong>hotspot cropping</strong>. Click the crop icon on any image field to set the focal point, so the important part of the image is always visible regardless of the crop.
        </Callout>
      </Section>

      <Section title="6. Ordering Content">
        <p>
          Many content types have a <strong>Sort Order</strong> (or <strong>Order</strong>) field:
        </p>
        <ul>
          <li>Lower numbers appear <strong>first</strong> in listings</li>
          <li>Items without an order number appear last</li>
          <li>Use increments of 10 (10, 20, 30…) to leave room for future insertions</li>
        </ul>
        <p>Applies to: Case Studies, Features, Team Members, Homepage Headers.</p>
      </Section>

      <Section title="7. SEO">
        <p>
          Pages and case studies can have SEO overrides:
        </p>
        <ul>
          <li><strong>SEO Title</strong> — overrides the browser tab title and search engine results</li>
          <li><strong>Meta Description</strong> — short summary for search engines (keep under 160 characters)</li>
          <li><strong>Social Share Image</strong> — image shown when the page is shared on social media (1200 × 630 px)</li>
        </ul>
        <p>If no overrides are set, the page title and site description are used as defaults.</p>
      </Section>

      <Section title="8. Adding Custom Components with Claude Code">
        <p>
          If you need something the rich text editor doesn&apos;t support — a custom layout, interactive element, new page section, or a new Sanity block type — you can use <strong>Claude Code</strong> to build it directly, no developer handoff needed.
        </p>

        <h4 style={{ marginTop: 20, marginBottom: 8 }}>What is Claude Code?</h4>
        <p>
          Claude Code is an AI coding assistant that runs in your terminal. It can read the project files, understand the codebase, write code, and run the dev server — all from a conversation in plain English.
        </p>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>Setup (one-time)</h4>
        <ol>
          <li>Open a terminal (Terminal on Mac, or Windows Terminal / Git Bash on Windows)</li>
          <li>
            Install Claude Code:
            <Code>{'npm install -g @anthropic-ai/claude-code'}</Code>
          </li>
          <li>
            Navigate to the project folder:
            <Code>{'cd path/to/goinvo-website'}</Code>
          </li>
          <li>
            Launch Claude Code:
            <Code>{'claude'}</Code>
          </li>
          <li>On first run, it will ask you to log in with your Anthropic account</li>
        </ol>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>How to ask for what you need</h4>
        <p>
          Once Claude Code is running, describe what you want in plain English. Be specific about the design and behavior. Here are example prompts:
        </p>

        <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ExamplePrompt>
            Add a new &quot;Accordion&quot; block to the rich text editor. Each item should have a question (text field) and an answer (rich text). On the front end, clicking a question expands/collapses the answer with a smooth animation.
          </ExamplePrompt>
          <ExamplePrompt>
            Create a full-width CTA banner block for the rich text editor with fields for: background color (choose from teal, orange, or dark), heading, body text, button label, and button link. Style it to match the rest of the site.
          </ExamplePrompt>
          <ExamplePrompt>
            Add a new &quot;Before / After&quot; image comparison block. It should have two image fields and a draggable slider to reveal one image over the other.
          </ExamplePrompt>
          <ExamplePrompt>
            I need a &quot;Team Spotlight&quot; section on the About page that pulls in 3 featured team members and displays them in a card grid with photo, name, role, and a short quote.
          </ExamplePrompt>
        </div>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>Tips for better results</h4>
        <ul>
          <li><strong>Be specific about fields</strong> — list exactly what content editors should be able to fill in</li>
          <li><strong>Describe the visual design</strong> — mention colors, layout, spacing, or reference an existing section of the site (&quot;style it like the Results block&quot;)</li>
          <li><strong>Share a Figma link</strong> — paste a Figma URL and Claude Code can pull in the design directly</li>
          <li><strong>Iterate</strong> — if the first result isn&apos;t right, just say what to change (&quot;make the heading larger&quot;, &quot;add a border&quot;, &quot;switch to a 3-column layout&quot;)</li>
          <li><strong>Ask it to run the dev server</strong> — say &quot;start the dev server&quot; and Claude Code will run it so you can preview changes at <code>localhost:3000</code></li>
        </ul>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>What Claude Code will do behind the scenes</h4>
        <p>
          You don&apos;t need to understand these details, but for reference, Claude Code typically:
        </p>
        <ol>
          <li>Adds a new block type to the Sanity schema so it appears in the rich text editor</li>
          <li>Creates a React component that renders the block on the front end</li>
          <li>Wires it into the Portable Text renderer so Sanity content maps to the component</li>
          <li>Optionally adds a preview in the Studio so you can see a representation while editing</li>
        </ol>

        <Callout>
          <strong>Don&apos;t worry about breaking things.</strong> Claude Code works with Git, so all changes can be reviewed and reverted. Ask it to &quot;show me what you changed&quot; or &quot;undo that last change&quot; at any time.
        </Callout>

        <h4 style={{ marginTop: 24, marginBottom: 8 }}>After making changes</h4>
        <ol>
          <li>Preview the changes at <code>localhost:3000</code> and in the Studio at <code>localhost:3000/studio</code></li>
          <li>If everything looks good, ask Claude Code: <strong>&quot;commit these changes&quot;</strong></li>
          <li>Then ask: <strong>&quot;push to GitHub&quot;</strong> — this will trigger a deployment to the live site</li>
        </ol>
      </Section>

      <Section title="9. Tips & Best Practices">
        <ul>
          <li>Always <strong>preview before publishing</strong> using the Presentation tab</li>
          <li>Write <strong>alt text</strong> for every image — it helps accessibility and SEO</li>
          <li>Keep <strong>slugs short and descriptive</strong> (e.g. <code>inspired-ehrs</code> not <code>inspired-ehrs-project-case-study-2024</code>)</li>
          <li>Use the <strong>Hide</strong> toggle instead of deleting content you might need later</li>
          <li>When in doubt, save as a draft and ask a team member to review before publishing</li>
        </ul>
      </Section>

      <div style={{ marginTop: 48, padding: '16px 20px', background: '#f3f4f6', borderRadius: 8, fontSize: 14, color: '#6b7280' }}>
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
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
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
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb', fontWeight: 600 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
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
    <div style={{ margin: '16px 0', padding: '12px 16px', background: '#f0fdfa', borderLeft: '4px solid #007385', borderRadius: '0 6px 6px 0', fontSize: 14 }}>
      {children}
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code style={{ display: 'block', margin: '6px 0', padding: '6px 10px', background: '#f3f4f6', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' }}>
      {children}
    </code>
  )
}

function ExamplePrompt({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 14, fontStyle: 'italic', color: '#374151' }}>
      &ldquo;{children}&rdquo;
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
