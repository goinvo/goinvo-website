import { unzipSync } from 'fflate'

import {
  contactIdentityKeys,
  normalizeOutreachEmail,
  normalizeOutreachPhone,
  normalizeOutreachUrl,
  type ParsedIntakeContact,
} from '@/lib/marketing/outreach'
import {
  OUTREACH_SEGMENT_OPTIONS,
  OUTREACH_WARMTH_OPTIONS,
} from '@/lib/marketing/outreachEnums'
import {
  OUTREACH_INTAKE_FIELD_LIMITS,
  OUTREACH_INTAKE_LIMITS,
} from '@/lib/marketing/outreachIntake'

/**
 * Browser-safe, no-network limits for contact spreadsheet previews. The
 * authoritative intake API re-validates the resulting contacts before save.
 */
export const CONTACT_SPREADSHEET_IMPORT_LIMITS = Object.freeze({
  fileBytes: 5 * 1024 * 1024,
  archiveEntries: 256,
  archiveSelectedBytes: 16 * 1024 * 1024,
  archiveEntryBytes: 8 * 1024 * 1024,
  worksheets: 20,
  sourceRows: 1_000,
  contacts: OUTREACH_INTAKE_LIMITS.contacts,
  columns: 64,
  cellCharacters: OUTREACH_INTAKE_LIMITS.lineCharacters,
  headerSearchRows: 12,
  warnings: 100,
})

export type ContactSpreadsheetFormat = 'csv' | 'xlsx'

export type ContactSpreadsheetField =
  | 'name'
  | 'firstName'
  | 'lastName'
  | 'organization'
  | 'role'
  | 'segment'
  | 'owner'
  | 'warmth'
  | 'email'
  | 'phone'
  | 'linkedinUrl'
  | 'howWeKnow'

export type ContactSpreadsheetWarningCode =
  | 'cell_truncated'
  | 'columns_ignored'
  | 'duplicate_column'
  | 'duplicate_contact'
  | 'formula_cached_value_used'
  | 'formula_text_ignored'
  | 'invalid_email'
  | 'invalid_linkedin_url'
  | 'invalid_phone'
  | 'invalid_segment'
  | 'invalid_warmth'
  | 'multiple_sheets'
  | 'name_missing'
  | 'rows_ignored'
  | 'sheet_selected'
  | 'warnings_omitted'

export interface ContactSpreadsheetWarning {
  code: ContactSpreadsheetWarningCode
  message: string
  row?: number
  column?: number
  sheet?: string
}

export interface ContactSpreadsheetColumn {
  column: number
  header: string
  field: ContactSpreadsheetField | null
}

export interface ImportedSpreadsheetContact extends ParsedIntakeContact {
  /** Deterministic provenance id for React keys and stale-import protection. */
  sourceId: string
  /** One-based source row in the selected worksheet or CSV. */
  sourceRow: number
  sourceSheet?: string
  duplicateKind?: 'existing' | 'file'
  duplicateOfRow?: number
  duplicateKeyType?: 'email' | 'phone' | 'linkedin' | 'name-and-organization'
  invalidFields?: Array<'email' | 'phone' | 'linkedinUrl'>
}

export interface ContactSpreadsheetImportResult {
  fileName: string
  format: ContactSpreadsheetFormat
  sheetName?: string
  headerRow: number
  columns: ContactSpreadsheetColumn[]
  contacts: ImportedSpreadsheetContact[]
  warnings: ContactSpreadsheetWarning[]
  stats: {
    sourceRows: number
    importedRows: number
    skippedRows: number
    duplicateRows: number
    formulaCells: number
  }
}

export interface ContactSpreadsheetInput {
  fileName: string
  bytes: ArrayBuffer | Uint8Array
  mimeType?: string
}

export interface ContactSpreadsheetImportOptions {
  /** Identity keys returned by contactIdentityKeys for contacts already saved. */
  existingIdentityKeys?: ReadonlySet<string>
  /** May lower, but never raise, the authoritative 200-contact batch cap. */
  maxContacts?: number
}

export type ContactSpreadsheetImportErrorCode =
  | 'archive_too_large'
  | 'empty_file'
  | 'file_too_large'
  | 'legacy_xls_unsupported'
  | 'malformed_file'
  | 'missing_contact_header'
  | 'unsupported_format'
  | 'unsafe_workbook_content'

export class ContactSpreadsheetImportError extends Error {
  constructor(
    readonly code: ContactSpreadsheetImportErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ContactSpreadsheetImportError'
  }
}

type FormulaDisposition = 'none' | 'cached' | 'ignored'

type RawCell = {
  value: string
  formula: FormulaDisposition
  truncated?: boolean
}

type RawRow = {
  sourceRow: number
  cells: RawCell[]
}

type RawSheet = {
  name?: string
  rows: RawRow[]
  rowsIgnored: boolean
  columnsIgnored: boolean
}

type HeaderMatch = {
  rowIndex: number
  rowNumber: number
  score: number
  mapped: Map<number, ContactSpreadsheetField>
  columns: ContactSpreadsheetColumn[]
  duplicateColumns: number[]
}

const EMPTY_CELL: RawCell = { value: '', formula: 'none' }
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]
const XML_ATTRIBUTE = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const FORMULA_TEXT = /^[\s\u0000-\u001f]*[=@]/
const FORMULA_OPERATOR_TEXT = /^[\s\u0000-\u001f]*[+-](?!\d[\d().\s-]{5,}$)/
const PLACEHOLDER_VALUE = /^(?:n\/?a|na|none|null|nil|unknown|not available|tbd|-+|\?+)$/i

const HEADER_ALIASES: Readonly<Record<ContactSpreadsheetField, readonly string[]>> = {
  name: [
    'name',
    'full name',
    'contact name',
    'person name',
    'person',
    'contact',
    'lead name',
    'connection name',
  ],
  firstName: ['first name', 'firstname', 'given name', 'givenname', 'forename'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'familyname'],
  organization: [
    'organization',
    'organisation',
    'org',
    'company',
    'company name',
    'account',
    'account name',
    'employer',
    'workplace',
  ],
  role: ['role', 'title', 'job title', 'position', 'position title'],
  segment: ['segment', 'audience', 'audience segment', 'lead type', 'contact type', 'market'],
  owner: [
    'owner',
    'relationship owner',
    'contact owner',
    'connection owner',
    'goinvo owner',
    'team member',
  ],
  warmth: ['warmth', 'relationship warmth', 'relationship strength', 'temperature'],
  email: ['email', 'e mail', 'email address', 'work email', 'business email'],
  phone: ['phone', 'phone number', 'telephone', 'mobile', 'mobile number', 'cell', 'cell phone'],
  linkedinUrl: [
    'linkedin',
    'linkedin url',
    'linkedin profile',
    'linkedin profile url',
    'profile url',
  ],
  howWeKnow: [
    'how we know',
    'how we know them',
    'how do we know them',
    'relationship',
    'relationship context',
    'connection',
    'connection context',
    'shared history',
    'history',
    'context',
    'notes',
  ],
}

const ALIAS_TO_FIELD = new Map<string, ContactSpreadsheetField>()
for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[
  ContactSpreadsheetField,
  readonly string[],
]>) {
  for (const alias of aliases) ALIAS_TO_FIELD.set(alias, field)
}

class WarningCollector {
  private readonly collected: ContactSpreadsheetWarning[] = []
  private omitted = 0

  add(warning: ContactSpreadsheetWarning) {
    if (this.collected.length < CONTACT_SPREADSHEET_IMPORT_LIMITS.warnings) {
      this.collected.push(warning)
    } else {
      this.omitted += 1
    }
  }

  finish() {
    if (this.omitted > 0) {
      this.collected.push({
        code: 'warnings_omitted',
        message: `${this.omitted.toLocaleString()} additional import warning${this.omitted === 1 ? '' : 's'} omitted.`,
      })
    }
    return this.collected
  }
}

function asBytes(value: ArrayBuffer | Uint8Array) {
  return value instanceof Uint8Array ? value : new Uint8Array(value)
}

function startsWithBytes(bytes: Uint8Array, prefix: readonly number[]) {
  return prefix.every((value, index) => bytes[index] === value)
}

function compact(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
}

function canonicalHeader(value: string) {
  return compact(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_/\\.-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferHeaderField(value: string): ContactSpreadsheetField | null {
  const header = canonicalHeader(value)
  const exact = ALIAS_TO_FIELD.get(header)
  if (exact) return exact
  if (/\blinkedin\b/.test(header)) return 'linkedinUrl'
  if (/\b(?:e ?mail)\b/.test(header)) return 'email'
  if (/\b(?:phone|mobile|telephone|cell)\b/.test(header)) return 'phone'
  if (/\bfirst\b.*\bname\b|\bgiven\b.*\bname\b/.test(header)) return 'firstName'
  if (/\b(?:last|family)\b.*\bname\b|\bsurname\b/.test(header)) return 'lastName'
  if (/\b(?:company|organization|organisation|employer|account)\b/.test(header)) return 'organization'
  if (/\b(?:job|position)\b.*\btitle\b/.test(header)) return 'role'
  if (/\b(?:relationship|connection)\b.*\bowner\b/.test(header)) return 'owner'
  if (/\b(?:relationship|connection)\b.*\b(?:context|history|notes?)\b/.test(header)) return 'howWeKnow'
  return null
}

/**
 * Lightweight header recognition for pasted delimited text. Reuse the same
 * aliases as the full importer so clipboard routing cannot disagree with file
 * import. Requiring two distinct fields avoids treating a data row that happens
 * to contain a word such as "Company" as a header.
 */
export function isContactSpreadsheetHeader(cells: readonly string[]) {
  const fields = new Set(cells.map(inferHeaderField).filter((field): field is ContactSpreadsheetField => Boolean(field)))
  return fields.size >= 2 && (fields.has('name') || fields.has('firstName') || fields.has('lastName'))
}

function hasUsableName(mapped: ReadonlyMap<number, ContactSpreadsheetField>) {
  const fields = new Set(mapped.values())
  return fields.has('name') || fields.has('firstName') || fields.has('lastName')
}

function findHeader(rows: readonly RawRow[]): HeaderMatch | null {
  let best: HeaderMatch | null = null
  const searchRows = rows.slice(0, CONTACT_SPREADSHEET_IMPORT_LIMITS.headerSearchRows)
  for (let rowIndex = 0; rowIndex < searchRows.length; rowIndex += 1) {
    const row = searchRows[rowIndex]
    const mapped = new Map<number, ContactSpreadsheetField>()
    const usedFields = new Set<ContactSpreadsheetField>()
    const columns: ContactSpreadsheetColumn[] = []
    const duplicateColumns: number[] = []
    for (let column = 0; column < row.cells.length; column += 1) {
      const header = compact(row.cells[column]?.value || '')
      const field = inferHeaderField(header)
      const duplicate = field ? usedFields.has(field) : false
      if (field && !duplicate) {
        mapped.set(column, field)
        usedFields.add(field)
      } else if (duplicate) {
        duplicateColumns.push(column)
      }
      columns.push({ column: column + 1, header, field: field && !duplicate ? field : null })
    }
    if (!hasUsableName(mapped)) continue
    const score = usedFields.size * 100 + (usedFields.has('name') ? 25 : 0) - rowIndex
    if (!best || score > best.score) {
      best = { rowIndex, rowNumber: row.sourceRow, score, mapped, columns, duplicateColumns }
    }
  }
  return best
}

function isFormulaText(value: string) {
  return FORMULA_TEXT.test(value) || FORMULA_OPERATOR_TEXT.test(value)
}

function rawCell(value = '', formula: FormulaDisposition = 'none', truncated = false): RawCell {
  return { value, formula, truncated: truncated || undefined }
}

function parseDelimitedRows(text: string, delimiter: string, maxRows: number): RawSheet {
  const rows: RawRow[] = []
  let cells: RawCell[] = []
  let cell = ''
  let inQuotes = false
  let cellTruncated = false
  let rowsIgnored = false
  let columnsIgnored = false
  let sourceRow = 1

  const append = (character: string) => {
    if (cell.length < CONTACT_SPREADSHEET_IMPORT_LIMITS.cellCharacters) cell += character
    else cellTruncated = true
  }
  const finishCell = () => {
    if (cells.length < CONTACT_SPREADSHEET_IMPORT_LIMITS.columns) {
      const value = cell.replace(/^\ufeff/, '')
      cells.push(rawCell(isFormulaText(value) ? '' : value, isFormulaText(value) ? 'ignored' : 'none', cellTruncated))
    } else {
      columnsIgnored = true
    }
    cell = ''
    cellTruncated = false
  }
  const finishRow = () => {
    finishCell()
    if (rows.length < maxRows) rows.push({ sourceRow, cells })
    else rowsIgnored = true
    cells = []
    sourceRow += 1
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          append('"')
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        append(character)
      }
      continue
    }
    if (character === '"' && cell.length === 0) {
      inQuotes = true
    } else if (character === delimiter) {
      finishCell()
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      finishRow()
      if (rowsIgnored) break
    } else {
      append(character)
    }
  }
  if (!rowsIgnored && (cell.length > 0 || cells.length > 0)) finishRow()
  return { rows, rowsIgnored, columnsIgnored }
}

function decodeDelimitedText(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length - 2)
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      swapped[index - 2] = bytes[index + 1]
      swapped[index - 1] = bytes[index]
    }
    return new TextDecoder('utf-16le').decode(swapped)
  }
  return new TextDecoder('utf-8').decode(bytes).replace(/^\ufeff/, '')
}

function parseDelimitedFile(bytes: Uint8Array): RawSheet {
  const text = decodeDelimitedText(bytes)
  if (!text.trim()) {
    throw new ContactSpreadsheetImportError('empty_file', 'The spreadsheet is empty.')
  }
  const delimiters = [',', '\t', ';', '|']
  let selected = delimiters[0]
  let selectedRank = Number.NEGATIVE_INFINITY
  for (const delimiter of delimiters) {
    const sample = parseDelimitedRows(text, delimiter, 25)
    const header = findHeader(sample.rows)
    const nonEmptyWidths = sample.rows
      .map((row) => row.cells.filter((cell) => compact(cell.value)).length)
      .filter(Boolean)
    const width = nonEmptyWidths.length ? Math.max(...nonEmptyWidths) : 0
    const rank = (header?.score || 0) * 1_000 + width
    if (rank > selectedRank) {
      selected = delimiter
      selectedRank = rank
    }
  }
  return parseDelimitedRows(text, selected, CONTACT_SPREADSHEET_IMPORT_LIMITS.sourceRows)
}

function xmlDecode(value: string) {
  return value
    .replace(/_x([0-9a-f]{4})_/gi, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
}

function attributes(value: string) {
  const result: Record<string, string> = {}
  XML_ATTRIBUTE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = XML_ATTRIBUTE.exec(value))) result[match[1]] = xmlDecode(match[2] ?? match[3] ?? '')
  return result
}

function xmlText(value: string) {
  const parts: string[] = []
  const textPattern = /<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>|<(?:[\w.-]+:)?t\b[^>]*\/>/gi
  let match: RegExpExecArray | null
  while ((match = textPattern.exec(value))) parts.push(xmlDecode(match[1] || ''))
  return parts.join('')
}

function parseSharedStrings(xml: string) {
  const values: string[] = []
  const itemPattern = /<(?:[\w.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?si>/gi
  let match: RegExpExecArray | null
  while ((match = itemPattern.exec(xml))) values.push(xmlText(match[1]))
  return values
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Za-z]+/)?.[0]
  if (!letters) return null
  let result = 0
  for (const letter of letters.toUpperCase()) result = result * 26 + letter.charCodeAt(0) - 64
  return result - 1
}

function parseWorksheet(xml: string, sharedStrings: readonly string[], name?: string): RawSheet {
  const rows: RawRow[] = []
  let rowsIgnored = false
  let columnsIgnored = false
  let fallbackRow = 1
  const rowPattern = /<(?:[\w.-]+:)?row\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?row>/gi
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowPattern.exec(xml))) {
    const rowAttrs = attributes(rowMatch[1])
    const parsedRow = Number.parseInt(rowAttrs.r || '', 10)
    const sourceRow = Number.isSafeInteger(parsedRow) && parsedRow > 0 ? parsedRow : fallbackRow
    fallbackRow = sourceRow + 1
    if (rows.length >= CONTACT_SPREADSHEET_IMPORT_LIMITS.sourceRows) {
      rowsIgnored = true
      break
    }
    const cells: RawCell[] = []
    let fallbackColumn = 0
    const cellPattern = /<(?:[\w.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?c>|<(?:[\w.-]+:)?c\b([^>]*)\/>/gi
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellPattern.exec(rowMatch[2]))) {
      const cellAttrs = attributes(cellMatch[1] || cellMatch[3] || '')
      const indexedColumn = columnIndex(cellAttrs.r || '')
      const column = indexedColumn ?? fallbackColumn
      fallbackColumn = column + 1
      if (column < 0 || column >= CONTACT_SPREADSHEET_IMPORT_LIMITS.columns) {
        columnsIgnored = true
        continue
      }
      while (cells.length < column) cells.push(EMPTY_CELL)
      const body = cellMatch[2] || ''
      const formula = /<(?:[\w.-]+:)?f\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?f>|<(?:[\w.-]+:)?f\b[^>]*\/>/i.test(body)
      const valueMatch = body.match(/<(?:[\w.-]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?v>/i)
      let value = ''
      if (cellAttrs.t === 'inlineStr') value = xmlText(body)
      else if (cellAttrs.t === 's') {
        const sharedIndex = Number.parseInt(xmlDecode(valueMatch?.[1] || ''), 10)
        value = Number.isSafeInteger(sharedIndex) && sharedIndex >= 0 ? sharedStrings[sharedIndex] || '' : ''
      } else if (cellAttrs.t === 'b') value = valueMatch?.[1] === '1' ? 'TRUE' : 'FALSE'
      else if (cellAttrs.t !== 'e') value = xmlDecode(valueMatch?.[1] || '')
      let truncated = false
      if (value.length > CONTACT_SPREADSHEET_IMPORT_LIMITS.cellCharacters) {
        value = value.slice(0, CONTACT_SPREADSHEET_IMPORT_LIMITS.cellCharacters)
        truncated = true
      }
      const formulaDisposition = formula
        ? value
          ? 'cached'
          : 'ignored'
        : isFormulaText(value)
          ? 'ignored'
          : 'none'
      cells[column] = rawCell(formulaDisposition === 'ignored' ? '' : value, formulaDisposition, truncated)
    }
    rows.push({ sourceRow, cells })
  }
  return { name, rows, rowsIgnored, columnsIgnored }
}

function normalizeArchivePath(value: string) {
  const result: string[] = []
  for (const part of value.replace(/\\/g, '/').replace(/^\/+/, '').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (result.length === 0) return null
      result.pop()
    } else {
      result.push(part)
    }
  }
  return result.join('/')
}

function resolveWorkbookTarget(target: string) {
  const decoded = xmlDecode(target).replace(/^\/+/, '')
  return normalizeArchivePath(decoded.startsWith('xl/') ? decoded : `xl/${decoded}`)
}

function decodeXmlEntry(entries: ReadonlyMap<string, Uint8Array>, name: string) {
  const value = entries.get(name.toLowerCase())
  return value ? new TextDecoder('utf-8').decode(value) : ''
}

function parseXlsxFile(bytes: Uint8Array): RawSheet[] {
  let entryCount = 0
  let selectedBytes = 0
  let worksheetCount = 0
  let unzipped: Record<string, Uint8Array>
  try {
    unzipped = unzipSync(bytes, {
      filter(file) {
        entryCount += 1
        if (entryCount > CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveEntries) {
          throw new ContactSpreadsheetImportError(
            'archive_too_large',
            `This workbook contains more than ${CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveEntries} archive entries.`,
          )
        }
        const path = normalizeArchivePath(file.name)?.toLowerCase() || ''
        if (
          path.includes('vbaproject') ||
          path.startsWith('xl/macrosheets/') ||
          path.startsWith('xl/externallinks/')
        ) {
          throw new ContactSpreadsheetImportError(
            'unsafe_workbook_content',
            'This workbook contains macros or external workbook links. Save a values-only .xlsx or CSV copy and import that copy.',
          )
        }
        const selected =
          path === 'xl/workbook.xml' ||
          path === 'xl/_rels/workbook.xml.rels' ||
          path === 'xl/sharedstrings.xml' ||
          /^xl\/worksheets\/[^/]+\.xml$/.test(path)
        if (!selected) return false
        if (/^xl\/worksheets\/[^/]+\.xml$/.test(path)) worksheetCount += 1
        if (worksheetCount > CONTACT_SPREADSHEET_IMPORT_LIMITS.worksheets) {
          throw new ContactSpreadsheetImportError(
            'archive_too_large',
            `This workbook contains more than ${CONTACT_SPREADSHEET_IMPORT_LIMITS.worksheets} worksheets.`,
          )
        }
        if (file.originalSize > CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveEntryBytes) {
          throw new ContactSpreadsheetImportError(
            'archive_too_large',
            `Workbook entry ${file.name} is too large to preview safely.`,
          )
        }
        selectedBytes += file.originalSize
        if (selectedBytes > CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveSelectedBytes) {
          throw new ContactSpreadsheetImportError(
            'archive_too_large',
            'The workbook expands beyond the safe preview limit.',
          )
        }
        return true
      },
    })
  } catch (error) {
    if (error instanceof ContactSpreadsheetImportError) throw error
    throw new ContactSpreadsheetImportError(
      'malformed_file',
      'This .xlsx file is damaged, encrypted, or uses an unsupported compression format.',
    )
  }

  const entries = new Map<string, Uint8Array>()
  let actualSelectedBytes = 0
  for (const [name, value] of Object.entries(unzipped)) {
    if (value.byteLength > CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveEntryBytes) {
      throw new ContactSpreadsheetImportError(
        'archive_too_large',
        `Workbook entry ${name} expanded beyond the safe preview limit.`,
      )
    }
    actualSelectedBytes += value.byteLength
    if (actualSelectedBytes > CONTACT_SPREADSHEET_IMPORT_LIMITS.archiveSelectedBytes) {
      throw new ContactSpreadsheetImportError(
        'archive_too_large',
        'The workbook expands beyond the safe preview limit.',
      )
    }
    const normalized = normalizeArchivePath(name)
    if (normalized) entries.set(normalized.toLowerCase(), value)
  }
  const workbookXml = decodeXmlEntry(entries, 'xl/workbook.xml')
  if (!workbookXml) {
    throw new ContactSpreadsheetImportError('malformed_file', 'This .xlsx file has no readable workbook definition.')
  }
  const sharedStrings = parseSharedStrings(decodeXmlEntry(entries, 'xl/sharedstrings.xml'))
  const relationshipXml = decodeXmlEntry(entries, 'xl/_rels/workbook.xml.rels')
  const relationshipTargets = new Map<string, string>()
  const relationshipPattern = /<(?:[\w.-]+:)?Relationship\b([^>]*)\/?\s*>/gi
  let relationshipMatch: RegExpExecArray | null
  while ((relationshipMatch = relationshipPattern.exec(relationshipXml))) {
    const attrs = attributes(relationshipMatch[1])
    if (!attrs.Id || !attrs.Target || attrs.TargetMode?.toLowerCase() === 'external') continue
    const target = resolveWorkbookTarget(attrs.Target)
    if (target) relationshipTargets.set(attrs.Id, target.toLowerCase())
  }

  const definitions: Array<{ name: string; path: string; hidden: boolean }> = []
  const sheetPattern = /<(?:[\w.-]+:)?sheet\b([^>]*)\/?\s*>/gi
  let sheetMatch: RegExpExecArray | null
  while ((sheetMatch = sheetPattern.exec(workbookXml))) {
    const attrs = attributes(sheetMatch[1])
    const path = relationshipTargets.get(attrs['r:id'] || '')
    if (!path || !entries.has(path)) continue
    definitions.push({ name: compact(attrs.name || 'Worksheet'), path, hidden: Boolean(attrs.state && attrs.state !== 'visible') })
  }
  if (definitions.length === 0) {
    for (const path of [...entries.keys()].filter((name) => /^xl\/worksheets\/[^/]+\.xml$/.test(name)).sort()) {
      definitions.push({ name: `Worksheet ${definitions.length + 1}`, path, hidden: false })
    }
  }
  if (definitions.length === 0) {
    throw new ContactSpreadsheetImportError('malformed_file', 'This .xlsx file contains no readable worksheets.')
  }
  const visible = definitions.filter((definition) => !definition.hidden)
  const selectedDefinitions = visible.length ? visible : definitions
  return selectedDefinitions.map((definition) =>
    parseWorksheet(decodeXmlEntry(entries, definition.path), sharedStrings, definition.name),
  )
}

function detectFormat(input: ContactSpreadsheetInput, bytes: Uint8Array): ContactSpreadsheetFormat {
  const name = input.fileName.trim().toLowerCase()
  const mime = (input.mimeType || '').toLowerCase()
  if (name.endsWith('.xls') || startsWithBytes(bytes, XLS_MAGIC)) {
    throw new ContactSpreadsheetImportError(
      'legacy_xls_unsupported',
      'Legacy .xls files cannot be previewed safely. In Excel, choose Save As and select .xlsx or CSV, then import that copy.',
    )
  }
  if (name.endsWith('.xlsm') || name.endsWith('.xltm')) {
    throw new ContactSpreadsheetImportError(
      'unsupported_format',
      'Macro-enabled workbooks are not accepted. Save a macro-free .xlsx or CSV copy and import that file.',
    )
  }
  if (name.endsWith('.xlsx') || mime === XLSX_MIME || startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'xlsx'
  if (
    name.endsWith('.csv') ||
    name.endsWith('.tsv') ||
    name.endsWith('.txt') ||
    mime.includes('csv') ||
    mime.startsWith('text/')
  ) return 'csv'
  throw new ContactSpreadsheetImportError(
    'unsupported_format',
    'Choose a .xlsx or .csv contact file. Legacy .xls and macro-enabled workbooks must be saved as .xlsx first.',
  )
}

function mappedValue(row: RawRow, header: HeaderMatch, field: ContactSpreadsheetField) {
  for (const [column, mappedField] of header.mapped) {
    if (mappedField === field) return compact(row.cells[column]?.value || '')
  }
  return ''
}

function countImportableContactRows(sheet: RawSheet, header: HeaderMatch) {
  let count = 0
  for (const row of sheet.rows.slice(header.rowIndex + 1)) {
    const explicitName = mappedValue(row, header, 'name')
    const firstName = mappedValue(row, header, 'firstName')
    const lastName = mappedValue(row, header, 'lastName')
    if (!explicitName && !compact(`${firstName} ${lastName}`)) continue
    count += 1
    // Selection should not spend work distinguishing rows the bounded import
    // cannot include in one batch.
    if (count >= CONTACT_SPREADSHEET_IMPORT_LIMITS.contacts) break
  }
  return count
}

function mapOption(
  value: string,
  options: readonly { title: string; value: string }[],
) {
  const canonical = canonicalHeader(value)
  if (!canonical) return ''
  return options.find(
    (option) => canonicalHeader(option.value) === canonical || canonicalHeader(option.title.split('—')[0]) === canonical,
  )?.value || ''
}

function cleanField(
  value: string | undefined,
  field: keyof typeof OUTREACH_INTAKE_FIELD_LIMITS,
  warningCollector: WarningCollector,
  context: Pick<ContactSpreadsheetWarning, 'row' | 'sheet'>,
) {
  value ||= ''
  const limit = OUTREACH_INTAKE_FIELD_LIMITS[field]
  if (value.length <= limit) return value || undefined
  warningCollector.add({
    code: 'cell_truncated',
    message: `${field} was shortened to ${limit.toLocaleString()} characters.`,
    ...context,
  })
  return value.slice(0, limit)
}

function stableSourceId(sheet: string | undefined, row: number, values: readonly string[]) {
  const input = `${sheet || 'csv'}\u0000${row}\u0000${values.join('\u0000')}`
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `spreadsheet-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function validatedEmail(value: string) {
  if (!value || PLACEHOLDER_VALUE.test(value)) return value ? null : undefined
  return normalizeOutreachEmail(value) || null
}

function validatedPhone(value: string) {
  if (!value || PLACEHOLDER_VALUE.test(value)) return value ? null : undefined
  return normalizeOutreachPhone(value) || null
}

function duplicateKeyType(key: string): ImportedSpreadsheetContact['duplicateKeyType'] {
  if (key.startsWith('email:')) return 'email'
  if (key.startsWith('phone:')) return 'phone'
  if (key.startsWith('linkedin:')) return 'linkedin'
  return 'name-and-organization'
}

function addDuplicateMetadata(
  contacts: ImportedSpreadsheetContact[],
  existingIdentityKeys: ReadonlySet<string>,
  warnings: WarningCollector,
) {
  const seen = new Map<string, number>()
  const seenWeakOnly = new Set<string>()
  for (const contact of contacts) {
    const keys = contactIdentityKeys(contact)
    const weakKey = keys[0]
    const strongKeys = keys.slice(1)
    const fileCandidates = strongKeys.length
      ? [...strongKeys, ...(weakKey && seenWeakOnly.has(weakKey) ? [weakKey] : [])]
      : weakKey
        ? [weakKey]
        : []
    const existingCandidates = [...strongKeys, ...(weakKey ? [weakKey] : [])]
    const existingMatch = existingCandidates.find((key) => existingIdentityKeys.has(key))
    const fileMatch = fileCandidates.find((key) => seen.has(key))
    const matchedKey = existingMatch || fileMatch
    if (matchedKey) {
      const duplicateOfRow = fileMatch ? seen.get(fileMatch) : undefined
      contact.duplicate = true
      contact.duplicateKind = existingMatch ? 'existing' : 'file'
      contact.duplicateOfRow = duplicateOfRow
      contact.duplicateKeyType = duplicateKeyType(matchedKey)
      contact.duplicateReason = existingMatch
        ? `matches an existing contact by ${contact.duplicateKeyType}`
        : `repeats row ${duplicateOfRow} by ${contact.duplicateKeyType}`
      warnings.add({
        code: 'duplicate_contact',
        message: `${contact.name} ${contact.duplicateReason}. It will be skipped unless corrected.`,
        row: contact.sourceRow,
        sheet: contact.sourceSheet,
      })
    }
    for (const key of keys) if (!seen.has(key)) seen.set(key, contact.sourceRow)
    if (strongKeys.length === 0 && weakKey) seenWeakOnly.add(weakKey)
  }
}

function buildContacts(
  sheet: RawSheet,
  header: HeaderMatch,
  warningCollector: WarningCollector,
  maxContacts: number,
) {
  const contacts: ImportedSpreadsheetContact[] = []
  let skippedRows = 0
  let formulaCells = 0
  for (const duplicateColumn of header.duplicateColumns) {
    warningCollector.add({
      code: 'duplicate_column',
      message: `Column ${duplicateColumn + 1} repeats an already mapped contact field and was ignored.`,
      row: header.rowNumber,
      column: duplicateColumn + 1,
      sheet: sheet.name,
    })
  }
  const dataRows = sheet.rows.slice(header.rowIndex + 1)
  for (const row of dataRows) {
    const mappedCells = [...header.mapped.keys()].map((column) => ({ column, cell: row.cells[column] || EMPTY_CELL }))
    if (mappedCells.every(({ cell }) => !compact(cell.value))) continue
    for (const { column, cell } of mappedCells) {
      if (cell.truncated) {
        warningCollector.add({
          code: 'cell_truncated',
          message: `Cell content was shortened to ${CONTACT_SPREADSHEET_IMPORT_LIMITS.cellCharacters.toLocaleString()} characters.`,
          row: row.sourceRow,
          column: column + 1,
          sheet: sheet.name,
        })
      }
      if (cell.formula !== 'none') formulaCells += 1
      if (cell.formula === 'cached') {
        warningCollector.add({
          code: 'formula_cached_value_used',
          message: 'A formula was not executed; its saved display value was used.',
          row: row.sourceRow,
          column: column + 1,
          sheet: sheet.name,
        })
      } else if (cell.formula === 'ignored') {
        warningCollector.add({
          code: 'formula_text_ignored',
          message: 'Formula-like text was ignored instead of being executed.',
          row: row.sourceRow,
          column: column + 1,
          sheet: sheet.name,
        })
      }
    }
    const explicitName = mappedValue(row, header, 'name')
    const firstName = mappedValue(row, header, 'firstName')
    const lastName = mappedValue(row, header, 'lastName')
    const name = explicitName || compact(`${firstName} ${lastName}`)
    if (!name) {
      skippedRows += 1
      warningCollector.add({
        code: 'name_missing',
        message: 'This row was skipped because it has no contact name.',
        row: row.sourceRow,
        sheet: sheet.name,
      })
      continue
    }
    if (contacts.length >= maxContacts) {
      skippedRows += 1
      continue
    }
    const context = { row: row.sourceRow, sheet: sheet.name }
    const invalidFields: ImportedSpreadsheetContact['invalidFields'] = []
    const rawLinkedinUrl = mappedValue(row, header, 'linkedinUrl')
    const linkedinUrl = normalizeOutreachUrl(rawLinkedinUrl, { linkedinOnly: true })
    if (rawLinkedinUrl && !linkedinUrl) {
      invalidFields.push('linkedinUrl')
      warningCollector.add({
        code: 'invalid_linkedin_url',
        message: 'The LinkedIn value was ignored because it is not a linkedin.com URL.',
        ...context,
      })
    }
    const rawSegment = mappedValue(row, header, 'segment')
    const segment = mapOption(rawSegment, OUTREACH_SEGMENT_OPTIONS)
    if (rawSegment && !segment) {
      warningCollector.add({
        code: 'invalid_segment',
        message: `“${rawSegment.slice(0, 80)}” is not a known segment and was left blank.`,
        ...context,
      })
    }
    const rawWarmth = mappedValue(row, header, 'warmth')
    const warmth = mapOption(rawWarmth, OUTREACH_WARMTH_OPTIONS)
    if (rawWarmth && !warmth) {
      warningCollector.add({
        code: 'invalid_warmth',
        message: `“${rawWarmth.slice(0, 80)}” is not a known warmth and was left blank.`,
        ...context,
      })
    }
    const organization = cleanField(mappedValue(row, header, 'organization'), 'organization', warningCollector, context)
    const role = cleanField(mappedValue(row, header, 'role'), 'role', warningCollector, context)
    const owner = cleanField(mappedValue(row, header, 'owner'), 'owner', warningCollector, context)
    const rawEmail = mappedValue(row, header, 'email')
    const rawPhone = mappedValue(row, header, 'phone')
    const emailValidation = validatedEmail(rawEmail)
    const phoneValidation = validatedPhone(rawPhone)
    if (emailValidation === null) {
      invalidFields.push('email')
      warningCollector.add({
        code: 'invalid_email',
        message: `“${rawEmail.slice(0, 80)}” was ignored because it is not a usable email address.`,
        ...context,
      })
    }
    if (phoneValidation === null) {
      invalidFields.push('phone')
      warningCollector.add({
        code: 'invalid_phone',
        message: `“${rawPhone.slice(0, 80)}” was ignored because it is not a usable phone number.`,
        ...context,
      })
    }
    const email = cleanField(emailValidation || '', 'email', warningCollector, context)
    const phone = cleanField(phoneValidation || '', 'phone', warningCollector, context)
    const howWeKnow = cleanField(mappedValue(row, header, 'howWeKnow'), 'howWeKnow', warningCollector, context)
    const cleanedName = cleanField(name, 'name', warningCollector, context) || 'Unnamed contact'
    const sourceLine = cleanField(
      [cleanedName, organization, role, howWeKnow].filter(Boolean).join(' — '),
      'sourceLine',
      warningCollector,
      context,
    )
    contacts.push({
      name: cleanedName,
      organization,
      role,
      segment: segment || undefined,
      owner,
      warmth: warmth || undefined,
      email,
      phone,
      linkedinUrl: cleanField(linkedinUrl, 'linkedinUrl', warningCollector, context),
      howWeKnow,
      sourceLine,
      sourceId: stableSourceId(sheet.name, row.sourceRow, [
        cleanedName,
        organization || '',
        email || '',
        phone || '',
        linkedinUrl || '',
      ]),
      sourceRow: row.sourceRow,
      sourceSheet: sheet.name,
      invalidFields: invalidFields.length ? invalidFields : undefined,
    })
  }
  if (dataRows.filter((row) => [...header.mapped.keys()].some((column) => compact(row.cells[column]?.value || ''))).length > maxContacts) {
    warningCollector.add({
      code: 'rows_ignored',
      message: `Only the first ${maxContacts.toLocaleString()} named contacts were included. Save the remainder as another import batch.`,
      sheet: sheet.name,
    })
  }
  return { contacts, skippedRows, formulaCells }
}

/**
 * Convert an untrusted local .xlsx/.csv file into a bounded review preview.
 * This function never evaluates formulas and performs no network I/O.
 */
export function parseContactSpreadsheet(
  input: ContactSpreadsheetInput,
  options: ContactSpreadsheetImportOptions = {},
): ContactSpreadsheetImportResult {
  const bytes = asBytes(input.bytes)
  if (!input.fileName.trim()) {
    throw new ContactSpreadsheetImportError('unsupported_format', 'The contact file needs a filename with .xlsx or .csv.')
  }
  if (bytes.byteLength === 0) {
    throw new ContactSpreadsheetImportError('empty_file', 'The spreadsheet is empty.')
  }
  if (bytes.byteLength > CONTACT_SPREADSHEET_IMPORT_LIMITS.fileBytes) {
    throw new ContactSpreadsheetImportError(
      'file_too_large',
      `Keep contact spreadsheets under ${(CONTACT_SPREADSHEET_IMPORT_LIMITS.fileBytes / 1024 / 1024).toLocaleString()} MB.`,
    )
  }
  const format = detectFormat(input, bytes)
  const sheets = format === 'xlsx' ? parseXlsxFile(bytes) : [parseDelimitedFile(bytes)]
  const candidates = sheets
    .map((sheet) => {
      const header = findHeader(sheet.rows)
      return { sheet, header, importableRows: header ? countImportableContactRows(sheet, header) : 0 }
    })
    .filter(
      (candidate): candidate is { sheet: RawSheet; header: HeaderMatch; importableRows: number } =>
        Boolean(candidate.header),
    )
    .sort((left, right) => {
      const populatedDifference = right.importableRows - left.importableRows
      if (populatedDifference) return populatedDifference
      const scoreDifference = right.header.score - left.header.score
      if (scoreDifference) return scoreDifference
      const contactsNameDifference = Number(/contacts?|connections?|network/i.test(right.sheet.name || ''))
        - Number(/contacts?|connections?|network/i.test(left.sheet.name || ''))
      if (contactsNameDifference) return contactsNameDifference
      return right.sheet.rows.length - left.sheet.rows.length
    })
  if (candidates.length === 0) {
    throw new ContactSpreadsheetImportError(
      'missing_contact_header',
      'No contact header row was found. Include Name (or First Name / Last Name); Company, Email, Phone, LinkedIn, Title, and How We Know are recognized automatically.',
    )
  }
  const { sheet, header, importableRows } = candidates[0]
  const warningCollector = new WarningCollector()
  if (sheets.length > 1) {
    warningCollector.add({
      code: 'multiple_sheets',
      message: `Checked ${sheets.length} worksheets for contact columns.`,
    })
    warningCollector.add({
      code: 'sheet_selected',
      message: `Selected “${sheet.name}” after comparing importable named contacts (${importableRows.toLocaleString()}) and matching contact columns.`,
      sheet: sheet.name,
    })
  }
  if (sheet.rowsIgnored) {
    warningCollector.add({
      code: 'rows_ignored',
      message: `Only the first ${CONTACT_SPREADSHEET_IMPORT_LIMITS.sourceRows.toLocaleString()} source rows were inspected.`,
      sheet: sheet.name,
    })
  }
  if (sheet.columnsIgnored) {
    warningCollector.add({
      code: 'columns_ignored',
      message: `Columns after ${CONTACT_SPREADSHEET_IMPORT_LIMITS.columns.toLocaleString()} were ignored.`,
      sheet: sheet.name,
    })
  }
  const requestedMax = Number.isFinite(options.maxContacts)
    ? Math.max(1, Math.floor(options.maxContacts || 1))
    : CONTACT_SPREADSHEET_IMPORT_LIMITS.contacts
  const maxContacts = Math.min(CONTACT_SPREADSHEET_IMPORT_LIMITS.contacts, requestedMax)
  const built = buildContacts(sheet, header, warningCollector, maxContacts)
  addDuplicateMetadata(built.contacts, options.existingIdentityKeys || new Set(), warningCollector)
  const warnings = warningCollector.finish()
  return {
    fileName: input.fileName,
    format,
    sheetName: sheet.name,
    headerRow: header.rowNumber,
    columns: header.columns.filter((column) => column.header || column.field),
    contacts: built.contacts,
    warnings,
    stats: {
      sourceRows: Math.max(0, sheet.rows.length - header.rowIndex - 1),
      importedRows: built.contacts.length,
      skippedRows: built.skippedRows,
      duplicateRows: built.contacts.filter((contact) => contact.duplicate).length,
      formulaCells: built.formulaCells,
    },
  }
}
