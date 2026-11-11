'use client'

import { useState } from 'react'
import { citationPlainText, type CitationSegment } from '@/lib/chat/citation'
import type { ChatCard, ChatChip } from '@/lib/chat/presets'

/**
 * An instant reply in the chat: a greeting with suggestions, the citation-format question,
 * a formatted citation, or a license table with the rows the visitor asked about first.
 * Chips send their message as the visitor's reply; they only show on the latest message,
 * because the server reads a format as an answer only right after it asked.
 *
 * A card locks after ONE press of its own, never because some other request is open: the
 * 3s poll can draw a card while the reply that produced it is still in flight, and a
 * press on a button disabled for that reason was silently lost (.audit/race2.mjs).
 */
export function ChatPresetCard({
  card,
  live,
  onChip,
}: {
  card: ChatCard
  live: boolean
  onChip: (message: string) => void
}) {
  const [pressed, setPressed] = useState<string | null>(null)
  const chips = 'chips' in card ? card.chips : []
  return (
    <div data-chat-card={card.kind} className="space-y-2">
      <p className="mb-0 whitespace-pre-wrap break-words">{card.lead}</p>
      {card.kind === 'citation' && <CitationBlock format={card.format} segments={card.segments} note={card.note} />}
      {card.kind === 'license' && <LicenseTable card={card} />}
      {live && chips.length > 0 && (
        <Chips
          label={card.kind === 'citation' ? 'Other formats' : undefined}
          chips={chips}
          pressed={pressed}
          onChip={(chip) => {
            setPressed(chip.label)
            onChip(chip.message)
          }}
        />
      )}
    </div>
  )
}

function Chips({ label, chips, pressed, onChip }: { label?: string; chips: ChatChip[]; pressed: string | null; onChip: (chip: ChatChip) => void }) {
  return (
    <div className="pt-1" data-chat-chips>
      {label && <p className="mb-1 text-xs leading-5 text-gray">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            data-chat-chip={chip.label}
            data-pressed={pressed === chip.label || undefined}
            disabled={pressed !== null}
            aria-pressed={pressed === chip.label}
            onClick={() => onChip(chip)}
            className="min-h-8 cursor-pointer rounded-full border border-secondary bg-white px-3 text-xs font-semibold leading-5 text-secondary transition-colors hover:bg-secondary hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-default disabled:opacity-55 data-[pressed]:bg-secondary data-[pressed]:text-white data-[pressed]:opacity-100"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function CitationBlock({ format, segments, note }: { format: string; segments: CitationSegment[]; note: string }) {
  const [copied, setCopied] = useState(false)
  const code = format === 'bibtex'

  const copy = async () => {
    const plain = citationPlainText(segments)
    // Rich text keeps the italics when pasted into a document; plain text everywhere else.
    const html = segments.map((segment) => (segment.italic ? `<i>${escapeHtml(segment.text)}</i>` : escapeHtml(segment.text))).join('')
    try {
      if (!code && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plain)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-1.5">
      {code ? (
        <pre data-chat-citation className="m-0 overflow-x-auto whitespace-pre-wrap break-words border-l-2 border-secondary bg-gray-lightest px-2 py-1.5 font-mono text-[11px] leading-4">
          {citationPlainText(segments)}
        </pre>
      ) : (
        <p data-chat-citation className="m-0 break-words border-l-2 border-secondary bg-gray-lightest px-2 py-1.5 text-[13px] leading-5">
          {segments.map((segment, index) => (segment.italic ? <i key={index}>{segment.text}</i> : <span key={index}>{segment.text}</span>))}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="mb-0 text-xs leading-4 text-gray">{note}</p>
        <button
          type="button"
          onClick={copy}
          data-chat-copy
          className="shrink-0 cursor-pointer rounded-none border border-gray-medium bg-white px-2 py-1 text-xs font-semibold leading-4 text-black transition-colors hover:border-secondary hover:text-secondary"
        >
          <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    </div>
  )
}

const MARK = {
  yes: { symbol: '✓', className: 'text-[#1d7a4f]' },
  no: { symbol: '✕', className: 'text-red' },
  must: { symbol: '!', className: 'text-primary' },
} as const

function LicenseTable({ card }: { card: Extract<ChatCard, { kind: 'license' }> }) {
  const asked = card.rows.some((row) => row.relevant)
  return (
    <div className="space-y-1.5">
      <table data-chat-license className="w-full border-collapse text-left text-xs leading-4">
        <thead>
          <tr className="border-b border-gray-medium">
            <th scope="col" className="py-1.5 pr-2 font-semibold text-gray">
              You want to
            </th>
            {card.columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                data-relevant={column.relevant || undefined}
                className={`px-1.5 py-1.5 align-bottom font-semibold ${column.relevant ? 'bg-secondary/15 text-black' : 'text-gray'}`}
              >
                <a href={column.url} target="_blank" rel="noreferrer" className="underline decoration-gray-medium underline-offset-2 hover:decoration-current">
                  {column.heading}
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.rows.map((row, index) => (
            <tr
              key={row.id}
              data-row={row.id}
              data-relevant={row.relevant || undefined}
              className={`border-b border-gray-medium/60 ${row.relevant ? 'bg-secondary/10' : ''} ${asked && !row.relevant && card.rows[index - 1]?.relevant ? 'border-t-2 border-t-secondary/40' : ''}`}
            >
              <th scope="row" className={`py-1.5 pr-2 align-top ${row.relevant ? 'border-l-2 border-secondary pl-1.5 font-semibold text-black' : 'font-normal text-black'}`}>
                {row.relevant && <span className="sr-only">You asked about this: </span>}
                {row.label}
              </th>
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-1.5 py-1.5 align-top ${card.columns[cellIndex]?.relevant ? 'bg-secondary/10' : ''} ${row.relevant ? 'font-semibold' : ''}`}
                >
                  <span aria-hidden="true" className={`mr-1 font-bold ${MARK[cell.mark].className}`}>
                    {MARK[cell.mark].symbol}
                  </span>
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mb-0 text-xs leading-4 text-gray">
        Source:{' '}
        {card.source.url ? (
          <a href={card.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {card.source.label}
          </a>
        ) : (
          card.source.label
        )}
        . A plain-language summary, not legal advice.
      </p>
    </div>
  )
}
