import type { Metadata } from 'next'
import { cloudfrontImage } from '@/lib/utils'
import { JsonLd } from '@/components/seo/JsonLd'

const heroImage = '/images/services/doh-preview.jpg'
const ogImage = cloudfrontImage(heroImage)
const posterImage = cloudfrontImage('/images/features/determinants-of-health/determinants-of-health-poster.jpg')
const esUrl = 'https://www.goinvo.com/vision/determinantes-de-la-salud'

const hreflang = {
  en: '/vision/determinants-of-health',
  es: '/vision/determinantes-de-la-salud',
  'x-default': '/vision/determinants-of-health',
}

export const metadata: Metadata = {
  title: 'Determinantes de la Salud Visualizados',
  description:
    'El 89% de tu salud ocurre fuera de la clínica. Explora los 5 determinantes de la salud (comportamiento, circunstancias sociales, genética, atención médica y medio ambiente) en la visualización de código abierto y basada en investigación de GoInvo.',
  alternates: {
    canonical: '/vision/determinantes-de-la-salud',
    languages: hreflang,
  },
  openGraph: {
    type: 'article',
    url: esUrl,
    title: 'Determinantes de la Salud Visualizados',
    description:
      'El 89% de tu salud ocurre fuera de la clínica. Explora los 5 determinantes de la salud en una visualización de código abierto.',
    images: [{ url: ogImage, alt: 'Visualización de los Determinantes de la Salud por GoInvo' }],
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Determinantes de la Salud Visualizados',
    description: 'El 89% de tu salud ocurre fuera de la clínica. Explora los 5 determinantes de la salud.',
    images: [ogImage],
  },
}

// Las respuestas reflejan el contenido visible para que los datos estructurados FAQPage sean válidos.
const faqs = [
  {
    q: '¿Cuáles son los 5 determinantes de la salud?',
    a: 'GoInvo los agrupa en cinco categorías, con su contribución estimada a la salud general: comportamiento individual (alrededor del 36%), circunstancias sociales (24%), genética y biología (22%), atención médica (11%) y medio ambiente (7%).',
  },
  {
    q: '¿Qué son los determinantes sociales de la salud?',
    a: 'Los determinantes sociales de la salud son las condiciones no médicas en las que las personas nacen, viven, trabajan y envejecen —como la educación, los ingresos, el empleo, la vivienda y la comunidad— que moldean los resultados de salud. Representan aproximadamente una cuarta parte de la salud general.',
  },
  {
    q: '¿Cuánta de nuestra salud depende de la atención médica?',
    a: 'La atención médica representa solo alrededor del 11% de los resultados de salud en el análisis de GoInvo. El otro 89% está determinado por el comportamiento, las circunstancias sociales, la genética y el medio ambiente, fuera del entorno clínico.',
  },
  {
    q: '¿Cuánta salud ocurre fuera del consultorio médico?',
    a: 'Alrededor del 89% de la salud ocurre fuera del espacio clínico, impulsada por nuestra genética, comportamiento, medio ambiente y circunstancias sociales.',
  },
]

const determinantesJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Article',
      '@id': `${esUrl}#article`,
      headline: 'Determinantes de la Salud',
      inLanguage: 'es-ES',
      description:
        'Una visualización de código abierto de los cinco determinantes de la salud (comportamiento, circunstancias sociales, genética, atención médica y medio ambiente) y la investigación detrás de su impacto estimado.',
      image: { '@id': `${esUrl}#poster` },
      author: [
        { '@type': 'Person', name: 'Juhan Sonin' },
        { '@type': 'Person', name: 'Edwin Choi' },
      ],
      publisher: { '@type': 'Organization', name: 'GoInvo', url: 'https://www.goinvo.com' },
      about: 'Determinantes sociales de la salud',
      mainEntityOfPage: esUrl,
    },
    {
      '@type': 'ImageObject',
      '@id': `${esUrl}#poster`,
      contentUrl: posterImage,
      url: posterImage,
      name: 'Visualización de los Determinantes de la Salud',
      caption:
        'Los Determinantes de la Salud: comportamiento individual (alrededor del 36%), circunstancias sociales (24%), genética (22%), atención médica (11%) y medio ambiente (7%).',
      description:
        'Un diagrama de código abierto que visualiza los cinco determinantes de la salud y su contribución estimada a los resultados de salud.',
      creditText: 'GoInvo',
      creator: { '@type': 'Organization', name: 'GoInvo' },
    },
    {
      '@type': 'FAQPage',
      '@id': `${esUrl}#faq`,
      inLanguage: 'es-ES',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
}

export default function DeterminantesDeLaSaludPage() {
  return (
    <div lang="es">
      <JsonLd data={determinantesJsonLd} />
      <div className="max-width max-width--md content-padding">
        <h1 className="header--xl margin-top--double">Determinantes de la Salud</h1>
        <p className="text--gray">
          El 89% de la salud ocurre fuera del espacio clínico, a través de nuestra genética, comportamiento, medio
          ambiente y circunstancias sociales. Esta es la visualización de código abierto de GoInvo de los cinco
          determinantes de la salud.
        </p>

        <h2 className="header--lg margin-top--double margin-bottom--half">¿Cuáles son los 5 determinantes de la salud?</h2>
        <p className="text--gray">
          Los investigadores agrupan los muchos factores que moldean nuestra salud en cinco grandes determinantes. Según
          la revisión de GoInvo de las fuentes principales (la Organización Mundial de la Salud, la Kaiser Family
          Foundation, el Institute of Medicine y otras), esta es su contribución estimada a la salud general:
        </p>
        <ul className="ul text--gray">
          <li>
            <strong className="text--black">Comportamiento individual</strong>, alrededor del 36% (dieta, actividad
            física, tabaquismo y otras decisiones diarias)
          </li>
          <li>
            <strong className="text--black">Circunstancias sociales</strong>, alrededor del 24% (educación, ingresos,
            empleo y comunidad)
          </li>
          <li>
            <strong className="text--black">Genética y biología</strong>, alrededor del 22% (rasgos heredados y factores
            biológicos)
          </li>
          <li>
            <strong className="text--black">Atención médica</strong>, alrededor del 11%
          </li>
          <li>
            <strong className="text--black">Medio ambiente</strong>, alrededor del 7%
          </li>
        </ul>
        <p className="text--gray">
          En otras palabras, alrededor del 89% de nuestros resultados de salud se forman fuera del consultorio médico.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="width--100 margin-top--double"
          src={posterImage}
          alt="Diagrama de los Determinantes de la Salud: los cinco determinantes — comportamiento individual (alrededor del 36%), circunstancias sociales (24%), genética (22%), atención médica (11%) y medio ambiente (7%)"
        />

        <h2 className="header--lg margin-top--double margin-bottom--half">Preguntas frecuentes</h2>
        {faqs.map((item) => (
          <div key={item.q} className="margin-bottom--half">
            <h3 className="header--sm">{item.q}</h3>
            <p className="text--gray">{item.a}</p>
          </div>
        ))}

        <p className="text--gray margin-top--double margin-bottom--double">
          <a href="/vision/determinants-of-health">Read the full open-source visualization in English →</a>
        </p>
      </div>
    </div>
  )
}
