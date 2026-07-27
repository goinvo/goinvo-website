import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { CalendlyEmbed } from '@/components/forms/CalendlyEmbed'
import { SmoothScrollLink } from '@/components/ui/SmoothScrollLink'
import './services.css'

export const metadata: Metadata = {
  alternates: { canonical: '/services' },
  title: 'UX Design Services in Boston',
  description:
    'Our UX design process is tailored to your project. Contact GoInvo today to get started in designing a beautiful UX for your product!',
}

const IMG = '/images/experiments/home-2026'

const OFFERINGS = [
  {
    k: 'Expert Review',
    bullets: ['Independent assessment', 'Product audits', 'Risk identification', 'Smoothing design'],
    img: `${IMG}/hgraphipad.jpg`,
  },
  {
    k: 'Product Vision',
    bullets: ['Workflow redesign', 'Future state', 'Product strategy', 'Executive alignment'],
    img: `${IMG}/precisionautismhero.jpg`,
  },
  {
    k: 'Software Design',
    bullets: ['Ship product', 'Research & discovery', 'Market validation'],
    img: `${IMG}/ipsosherodark.jpg`,
  },
]

const REASONS = [
  { t: 'De-risk the project', d: 'We keep work moving through org changes, tight timelines, and shifting priorities so good ideas don’t die on the whiteboard.' },
  { t: 'Find the right problems', d: 'Through research, system mapping, and synthesis, we uncover the real needs that guide smarter investment.' },
  { t: 'Move fast and test often', d: 'We prototype quickly and test with real users and data, reducing risk before it becomes expensive.' },
  { t: 'Deliver & ship', d: 'We integrate with your team to ship better tools, improve performance, and keep strategy evolving.' },
]

const TIERS = [
  {
    name: 'Design Diagnostic',
    lead: 'A fixed-scope read on where your product stands and what to do next.',
    rows: ['4–8 weeks', 'Two senior designers', 'Fixed scope, fixed outputs'],
    price: '$50K–$90K',
    cta: 'Explore the Design Diagnostic',
    href: '/services/design-diagnostic',
  },
  {
    name: 'Product Launch',
    lead: 'Design and launch working software, end to end.',
    rows: ['2–4 months', 'Full design team', 'Concept through shipped product'],
    price: '$75K–$250K',
    cta: 'Talk about a launch',
    href: '#book',
    featured: true,
  },
  {
    name: 'Embedded Partnership',
    lead: 'We become your long-term product team.',
    rows: ['6–24 months', 'Dedicated embedded team', 'Custom engagement'],
    price: 'Custom',
    cta: 'Discuss a partnership',
    href: '#book',
  },
]

const SECTORS = [
  {
    k: 'Healthcare',
    sub: 'People’s lives depend on it.',
    d: 'We design software that improves care, reduces friction, and drives better outcomes, from clinical decision support to policy-driven health data systems. Twenty years navigating clinical complexity, policy constraints, and stakeholder needs.',
    bullets: ['Clinical decision support design', 'EHR integrations & patient workflows', 'Public health dashboards', 'Data visualization for policy and advocacy'],
    link: 'Explore our healthcare work',
    href: '/work?category=healthcare',
    img: `${IMG}/hgraphipad.jpg`,
  },
  {
    k: 'Government',
    sub: 'Public trust depends on it.',
    d: 'We design public services that are more modern, usable, equitable, and human. We partner with federal, state, and local agencies to transform the services that matter, from benefits applications to tools for policy makers.',
    bullets: ['Public benefits service design', 'Inclusive research & accessibility audits', 'Prototyping for civic tech and policy', 'Legacy system UX modernization'],
    link: 'Explore our government work',
    href: '/work?category=government',
    img: `${IMG}/snapcover.jpg`,
  },
  {
    k: 'Enterprise',
    sub: 'Business operations depend on it.',
    d: 'We streamline the internal tools and systems that power big organizations, for better alignment, efficiency, and insight. We improve internal platforms, streamline complex workflows, and align business and user goals.',
    bullets: ['Internal platforms & dashboards', 'Enterprise UX audits & redesigns', 'Workflow optimization & team alignment', 'Strategic design for regulated environments'],
    link: 'Explore our enterprise work',
    href: '/work?category=enterprise',
    img: `${IMG}/coderyte1.jpg`,
  },
  {
    k: 'AI',
    sub: 'Human judgment depends on it.',
    d: 'We design AI-powered tools that connect humans and machines so they work together seamlessly. We create human-centered interactions that make intelligent tools clear, explainable, and usable, aligned with human needs from day one.',
    bullets: ['UX for ML-powered products', 'Human-AI interaction design', 'Explainability & trust-building interfaces', 'Ethical frameworks & transparency in design'],
    link: 'Explore our AI work',
    href: '/work?category=AI',
    img: `${IMG}/ipsosherodark.jpg`,
  },
]

const STATS = [
  { v: '20yrs', cap: 'designing complex software, one studio, deep specialism.' },
  { v: '60+', cap: 'shipped products across regulated enterprises and agencies.' },
  { v: '91%', cap: 'of clients return for more engagements.' },
  { v: 'Millions', cap: 'of people use the software we’ve designed.' },
]

// Render a numeric stat with sup-styled "+/%/yrs" trailing modifiers. Letters/
// symbols after the digits become small, top-shouldered superscripts.
function renderStat(value: string, fontSize: number) {
  const supSize = Math.round(fontSize * 0.34)
  const supTop = Math.round(fontSize * 0.06)
  const m = value.trim().match(/^(\d[\d,.]*)(.*)$/)
  if (!m) return <span>{value}</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span style={{ lineHeight: 0.9 }}>{m[1]}</span>
      {m[2] && (
        <span style={{ fontSize: supSize, lineHeight: 1, marginLeft: 2, alignSelf: 'flex-start', position: 'relative', top: supTop, color: 'inherit' }}>
          {m[2]}
        </span>
      )}
    </span>
  )
}

export default function ServicesPage() {
  return (
    <div className="gi-root">
      {/* ─── Hero ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', background: 'var(--ink)', color: 'var(--paper)', overflow: 'hidden' }}>
        <div className="gi-ken-burns" style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          {/* LCP image: served through next/image (AVIF/WebP, responsive, and
              preloaded via priority) instead of an unoptimized CSS background. */}
          <Image
            src={`${IMG}/facto2.jpg`}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(95deg, rgba(20,18,17,0.94) 0%, rgba(20,18,17,0.66) 48%, rgba(20,18,17,0.2) 100%)' }} />
        <div className="gi-hero-inner gi-sec" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '112px 56px 96px', minHeight: 640 }}>
          <h1 className="gi-display-2 gi-reveal" style={{ color: 'var(--paper)', marginTop: 0, maxWidth: '16ch', '--d': 0 } as React.CSSProperties}>
            Disrupt from within. Reinvent the product. Change the market.
          </h1>
          <p className="gi-body-lg gi-reveal" style={{ color: 'rgba(255,255,255,0.78)', marginTop: 28, maxWidth: '58ch', '--d': 2 } as React.CSSProperties}>
            We help you move fast, reduce risk, and deliver better systems across healthcare, government, enterprise, and AI. Tell us about your project and where GoInvo can help.
          </p>
          <div className="gi-reveal" style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 44, flexWrap: 'wrap', '--d': 3 } as React.CSSProperties}>
            <SmoothScrollLink href="#book" className="gi-btn gi-btn-primary">Schedule a chat <span>→</span></SmoothScrollLink>
            <a href="mailto:info@goinvo.com" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600, fontSize: 15, textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.4)', paddingBottom: 2 }}>
              Or email info@goinvo.com
            </a>
          </div>
        </div>
      </section>

      {/* ─── Proof strip ────────────────────────────────────── */}
      {/* Uses the .gi-section box (max-width 1280 with 56px padding → 1168 content)
          so the stats align with the What-we-do / Sectors content, not the wider
          full-bleed width. */}
      <section className="gi-section gi-sec" style={{ paddingTop: 64, paddingBottom: 24, background: 'var(--paper)' }}>
        <div className="gi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--ink)', paddingTop: 22 }}>
              <div className="gi-stat-number" style={{ fontSize: 64, display: 'inline-flex', alignItems: 'baseline' }}>
                {renderStat(s.v, 64)}
              </div>
              <div className="gi-stat-label">{s.cap}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── What we do: offerings + why clients hire us ────── */}
      <section className="gi-section gi-sec">
        <div style={{ marginBottom: 28 }}>
          <div className="gi-eyebrow accent">What we do</div>
        </div>

        <div className="gi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 72 }}>
          {OFFERINGS.map((o, i) => (
            <div key={o.k} className="gi-offer" style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: 'var(--ink)' }}>
              <Image
                src={o.img}
                alt={o.k}
                fill
                sizes="(max-width: 900px) 100vw, 420px"
                className="gi-offer-img"
                style={{ objectFit: 'cover', opacity: 0.5 }}
              />
              <div className="gi-offer-scrim" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(20,18,17,0.94) 0%, rgba(20,18,17,0.58) 58%, rgba(20,18,17,0.25) 100%)' }} />
              <div className="gi-offer-body" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '36px 32px' }}>
                <div className="gi-eyebrow" style={{ color: 'var(--accent)', marginBottom: 12 }}>{String(i + 1).padStart(2, '0')}</div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 500, color: 'var(--paper)', lineHeight: 1.02, marginBottom: 14 }}>{o.k}</h3>
                <div className="gi-offer-rule" style={{ marginBottom: 18, width: 48 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {o.bullets.map((b) => (
                    <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.4, color: 'rgba(255,255,255,0.85)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto', position: 'relative', top: 5 }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Why clients hire us */}
        <div className="gi-split" style={{ display: 'grid', gridTemplateColumns: '1fr 2.4fr', gap: 96, alignItems: 'start' }}>
          <div>
            <div className="gi-eyebrow accent">Why clients hire us</div>
            <h2 className="gi-h2" style={{ marginTop: 16, maxWidth: '16ch' }}>
              What you get is beautiful software. What you buy is certainty.
            </h2>
          </div>
          <div className="gi-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }}>
            {REASONS.map((r, i) => (
              <div
                key={r.t}
                style={{
                  padding: '26px 0',
                  borderTop: '1px solid var(--rule)',
                  borderBottom: i >= REASONS.length - 2 ? '1px solid var(--rule)' : 'none',
                }}
              >
                <h3 className="gi-h3" style={{ fontSize: 19, marginBottom: 8 }}>{r.t}</h3>
                <p className="gi-small" style={{ margin: 0 }}>{r.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Engagement types ───────────────────────────────── */}
      <section className="gi-sec" style={{ background: 'var(--paper-warm)', padding: '96px 56px' }}>
        {/* Full-bleed warm band, but inner content capped at 1168 to align with
            the other sections (not the wider 1280). */}
        <div style={{ maxWidth: 1168, margin: '0 auto' }}>
          <div className="gi-row-between" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 56 }}>
            <div>
              <div className="gi-eyebrow accent">Engagement types</div>
              <h2 className="gi-h1" style={{ marginTop: 16, maxWidth: '20ch' }}>Ways to work with us.</h2>
            </div>
          </div>
          <div className="gi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.featured ? 'var(--ink)' : '#fff',
                  color: tier.featured ? 'var(--paper)' : 'var(--ink)',
                  border: tier.featured ? '1px solid var(--ink)' : '1px solid var(--rule-soft)',
                  padding: '36px 32px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {tier.featured && <div className="gi-eyebrow" style={{ color: 'var(--accent)', marginBottom: 14 }}>Most common</div>}
                <h3 className="gi-h2" style={{ fontSize: 26, color: tier.featured ? 'var(--paper)' : 'var(--ink)' }}>{tier.name}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.5, color: tier.featured ? 'rgba(255,255,255,0.72)' : 'var(--ink-2)', margin: '12px 0 24px', minHeight: 66 }}>{tier.lead}</p>
                <div style={{ borderTop: tier.featured ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--rule)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  {tier.rows.map((r) => (
                    <div key={r} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: tier.featured ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto', position: 'relative', top: 7 }} />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: tier.featured ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--rule)' }}>
                  <div className="gi-eyebrow" style={{ color: tier.featured ? 'rgba(255,255,255,0.55)' : 'var(--ink-3)', marginBottom: 6 }}>Typical investment</div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 500, color: tier.featured ? 'var(--paper)' : 'var(--ink)', marginBottom: 22 }}>{tier.price}</div>
                  {tier.href.startsWith('#') ? (
                    <SmoothScrollLink href={tier.href} className="gi-btn-text" style={{ color: tier.featured ? 'var(--paper)' : 'var(--ink)' }}>{tier.cta} <span className="arr">→</span></SmoothScrollLink>
                  ) : (
                    <Link href={tier.href} className="gi-btn-text" style={{ color: tier.featured ? 'var(--paper)' : 'var(--ink)' }}>{tier.cta} <span className="arr">→</span></Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Certifications */}
          <div style={{ marginTop: 48, padding: '28px 32px', background: '#fff', border: '1px solid var(--rule-soft)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ maxWidth: '52ch' }}>
              <div className="gi-eyebrow accent" style={{ marginBottom: 8 }}>Certified &amp; contracted</div>
              <p className="gi-small" style={{ margin: 0 }}>Prequalified for IT professional services as a trusted vendor for state and federal agencies.</p>
            </div>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <div className="gi-eyebrow">State of MA</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, marginTop: 6 }}>ITS81</div>
              </div>
              <div>
                <div className="gi-eyebrow">Federal</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 500, marginTop: 6 }}>GSA 47QTCA26D001W</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Sectors ────────────────────────────────────────── */}
      <section className="gi-section gi-sec">
        <div className="gi-eyebrow accent" style={{ marginBottom: 16 }}>Where we work</div>
        <h2 className="gi-h1" style={{ marginBottom: 64, maxWidth: '24ch' }}>Four places where software can&rsquo;t afford to fail.</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {SECTORS.map((s, i) => (
            <div
              key={s.k}
              className="gi-sector"
              style={{
                display: 'grid',
                gridTemplateColumns: i % 2 === 0 ? '6fr 5fr' : '5fr 6fr',
                gap: 64,
                alignItems: 'center',
                padding: '56px 0',
                borderTop: '1px solid var(--rule)',
                borderBottom: i === SECTORS.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 className="gi-h2" style={{ fontSize: 38, lineHeight: 1.05 }}>{s.k}</h3>
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, lineHeight: 1.2, color: 'var(--accent)', marginTop: 6 }}>{s.sub}</div>
                </div>
                <p className="gi-body" style={{ marginBottom: 24, maxWidth: '52ch' }}>{s.d}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px', marginBottom: 28 }}>
                  {s.bullets.map((b) => (
                    <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--ink-2)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto', position: 'relative', top: 7 }} />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <Link href={s.href} className="gi-btn-text">{s.link} <span className="arr">→</span></Link>
              </div>
              <div className="gi-sector-img" style={{ order: i % 2 === 0 ? 2 : 1, position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                <Image
                  src={s.img}
                  alt={`Design for ${s.k}`}
                  fill
                  sizes="(max-width: 900px) 100vw, 620px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonial ────────────────────────────────────── */}
      <section className="gi-sec" style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '112px 56px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 40, lineHeight: 1.25, fontWeight: 500, letterSpacing: '-0.012em', color: 'var(--paper)', margin: 0 }}>
            &ldquo;With Invo, design wasn&rsquo;t just design. It impacted our IP portfolio. It changed our business.&rdquo;
          </p>
          <div style={{ marginTop: 32, fontSize: 15 }}>
            <div style={{ fontWeight: 700 }}>Serban Georgescu, MD</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Director of Clinical Development, InfoBionic</div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA + Calendly ───────────────────────────── */}
      <section id="book" className="gi-sec" style={{ background: 'var(--accent)', color: '#fff', padding: '112px 56px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <h2 className="gi-display-3" style={{ color: '#fff', marginBottom: 24, maxWidth: '22ch', marginInline: 'auto' }}>
            Choose a time to talk about your project.
          </h2>
          <p className="gi-body-lg" style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '60ch', margin: '0 auto 48px' }}>
            Thirty minutes with a principal, not a salesperson. We&rsquo;ll talk about your problem, what shipping it would take, and whether we&rsquo;re the right firm. No deck, no obligation.
          </p>
          <div style={{ background: '#fff', borderRadius: 2, overflow: 'hidden', boxShadow: '0 30px 80px -24px rgba(0,0,0,0.35)', maxWidth: 920, margin: '0 auto' }}>
            <CalendlyEmbed
              formLocation="services-page"
              formName="services_call"
              primaryColor="b84a0e"
              hideEventTypeDetails
              hideGdprBanner
            />
          </div>
          <p style={{ marginTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>
            Prefer email? <a href="mailto:info@goinvo.com" style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.5)', textDecoration: 'none', paddingBottom: 1 }}>info@goinvo.com</a>
          </p>
        </div>
      </section>
    </div>
  )
}
