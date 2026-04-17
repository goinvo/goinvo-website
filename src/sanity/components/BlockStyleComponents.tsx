import React from 'react'

const sansFont = 'var(--font-sans, "Open Sans", Arial, Helvetica, sans-serif)'
const serifFont = 'var(--font-serif, "adobe-jenson-pro", Georgia, "Times New Roman", serif)'
const bodyTextColor = '#24434d'
const mutedTextColor = '#787473'

function ArticleTextBlock({
  as: Tag = 'p',
  children,
  style,
}: {
  as?: 'p' | 'h2' | 'h3' | 'h4' | 'blockquote'
  children: React.ReactNode
  style: React.CSSProperties
}) {
  return <Tag style={style}>{children}</Tag>
}

export function BodyParagraphStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      style={{
        margin: 0,
        fontFamily: sansFont,
        fontSize: '1rem',
        lineHeight: 1.625,
        color: bodyTextColor,
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function BodyParagraphSpaciousStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      style={{
        margin: 0,
        fontFamily: sansFont,
        fontSize: '1rem',
        lineHeight: 1.625,
        color: bodyTextColor,
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function LargeSerifParagraphStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      style={{
        margin: 0,
        fontFamily: serifFont,
        fontSize: '1.5rem',
        fontWeight: 300,
        lineHeight: 1.42,
        color: '#111111',
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function SectionHeadingStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="h2"
      style={{
        margin: 0,
        fontFamily: serifFont,
        fontSize: '1.5rem',
        fontWeight: 300,
        lineHeight: 1.42,
        color: '#111111',
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function LargeSectionHeadingStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="h2"
      style={{
        margin: 0,
        fontFamily: serifFont,
        fontSize: '2rem',
        fontWeight: 300,
        lineHeight: 1.18,
        color: '#111111',
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function SectionTitleStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="h2"
      style={{
        margin: 0,
        textAlign: 'center',
        fontFamily: serifFont,
        fontSize: '1.5rem',
        fontWeight: 300,
        lineHeight: 1.42,
        color: '#111111',
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function SubheadingStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="h3"
      style={{
        margin: 0,
        fontFamily: sansFont,
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.57,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: mutedTextColor,
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function SmallHeadingStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="h4"
      style={{
        margin: 0,
        fontFamily: sansFont,
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: '#111111',
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function BlockQuoteStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      as="blockquote"
      style={{
        margin: 0,
        paddingLeft: '1.5rem',
        borderLeft: '4px solid #E36216',
        fontFamily: sansFont,
        fontSize: '1rem',
        lineHeight: 1.625,
        fontStyle: 'italic',
        color: mutedTextColor,
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}

export function CalloutStyle({ children }: { children: React.ReactNode }) {
  return (
    <ArticleTextBlock
      style={{
        margin: 0,
        padding: '1rem 1.25rem',
        borderLeft: '4px solid #E36216',
        background: '#faf6f4',
        fontFamily: sansFont,
        fontSize: '1rem',
        lineHeight: 1.625,
        color: bodyTextColor,
      }}
    >
      {children}
    </ArticleTextBlock>
  )
}
