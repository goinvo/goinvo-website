import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { readFileSync } from 'node:fs'

import {
  CONTACT_SPREADSHEET_IMPORT_LIMITS,
  parseContactSpreadsheet,
} from '@/lib/marketing/contactSpreadsheetImport'

const csvBytes = (value: string) => new TextEncoder().encode(value)

function utf16LeBytes(value: string) {
  const bytes = new Uint8Array(2 + value.length * 2)
  bytes[0] = 0xff
  bytes[1] = 0xfe
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    bytes[2 + index * 2] = code & 0xff
    bytes[3 + index * 2] = code >>> 8
  }
  return bytes
}

function minimalWorkbook(files: Record<string, string>) {
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, value]) => [name, strToU8(value)])),
  )
}

function xlsxFixture() {
  return minimalWorkbook({
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
      <workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets>
          <sheet name="Read me" sheetId="1" r:id="rId1"/>
          <sheet name="Boss Connections" sheetId="2" r:id="rId2"/>
        </sheets>
      </workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
      <Relationships>
        <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        <Relationship Id="rId2" Target="worksheets/sheet2.xml"/>
      </Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet><sheetData>
      <row r="1"><c r="A1" t="inlineStr"><is><t>Instructions</t></is></c></row>
      <row r="2"><c r="A2" t="inlineStr"><is><t>Do not import this sheet.</t></is></c></row>
    </sheetData></worksheet>`,
    'xl/worksheets/sheet2.xml': `<worksheet><sheetData>
      <row r="1"><c r="A1" t="inlineStr"><is><t>GoInvo relationship export</t></is></c></row>
      <row r="2">
        <c r="A2" t="inlineStr"><is><t>First Name</t></is></c>
        <c r="B2" t="inlineStr"><is><t>Last Name</t></is></c>
        <c r="C2" t="inlineStr"><is><t>Employer</t></is></c>
        <c r="D2" t="inlineStr"><is><t>Business Email</t></is></c>
        <c r="E2" t="inlineStr"><is><t>Job Title</t></is></c>
      </row>
      <row r="3">
        <c r="A3" t="inlineStr"><is><t>Ada</t></is></c>
        <c r="B3" t="inlineStr"><is><t>Lovelace</t></is></c>
        <c r="C3" t="inlineStr"><is><t>Analytical Engines</t></is></c>
        <c r="D3" t="inlineStr"><is><t>ada@example.com</t></is></c>
        <c r="E3" t="str"><f>CONCAT(&quot;Chief&quot;,&quot; Scientist&quot;)</f><v>Chief Scientist</v></c>
      </row>
    </sheetData></worksheet>`,
  })
}

function populatedSheetSelectionFixture() {
  return minimalWorkbook({
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?>
      <workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets>
          <sheet name="Contacts Template" sheetId="1" r:id="rId1"/>
          <sheet name="Current Network" sheetId="2" r:id="rId2"/>
          <sheet name="Contacts" sheetId="3" r:id="rId3"/>
        </sheets>
      </workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?>
      <Relationships>
        <Relationship Id="rId1" Target="worksheets/sheet1.xml"/>
        <Relationship Id="rId2" Target="worksheets/sheet2.xml"/>
        <Relationship Id="rId3" Target="worksheets/sheet3.xml"/>
      </Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet><sheetData>
      <row r="1">
        <c r="A1" t="inlineStr"><is><t>Name</t></is></c>
        <c r="B1" t="inlineStr"><is><t>Company</t></is></c>
        <c r="C1" t="inlineStr"><is><t>Title</t></is></c>
        <c r="D1" t="inlineStr"><is><t>Email</t></is></c>
        <c r="E1" t="inlineStr"><is><t>Phone</t></is></c>
        <c r="F1" t="inlineStr"><is><t>LinkedIn</t></is></c>
        <c r="G1" t="inlineStr"><is><t>How We Know</t></is></c>
        <c r="H1" t="inlineStr"><is><t>Owner</t></is></c>
        <c r="I1" t="inlineStr"><is><t>Segment</t></is></c>
        <c r="J1" t="inlineStr"><is><t>Warmth</t></is></c>
      </row>
    </sheetData></worksheet>`,
    'xl/worksheets/sheet2.xml': `<worksheet><sheetData>
      <row r="1">
        <c r="A1" t="inlineStr"><is><t>Name</t></is></c>
        <c r="B1" t="inlineStr"><is><t>Company</t></is></c>
        <c r="C1" t="inlineStr"><is><t>Email</t></is></c>
      </row>
      <row r="2">
        <c r="A2" t="inlineStr"><is><t>Grace Hopper</t></is></c>
        <c r="B2" t="inlineStr"><is><t>US Navy</t></is></c>
        <c r="C2" t="inlineStr"><is><t>grace@example.com</t></is></c>
      </row>
    </sheetData></worksheet>`,
    'xl/worksheets/sheet3.xml': `<worksheet><sheetData>
      <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row>
      <row r="2"><c r="A2" t="inlineStr"><is><t>Katherine Johnson</t></is></c></row>
    </sheetData></worksheet>`,
  })
}

describe('contact spreadsheet import', () => {
  it('recognizes the actual downloadable GoInvo template', () => {
    const result = parseContactSpreadsheet({
      fileName: 'goinvo-outreach-contact-template.xlsx',
      bytes: readFileSync('public/downloads/goinvo-outreach-contact-template.xlsx'),
    })

    expect(result.sheetName).toBe('Contacts')
    expect(result.headerRow).toBe(4)
    expect(result.contacts).toHaveLength(0)
    expect(result.columns.filter((column) => column.field).map((column) => column.field)).toEqual([
      'name',
      'organization',
      'role',
      'email',
      'phone',
      'linkedinUrl',
      'howWeKnow',
      'owner',
      'segment',
      'warmth',
    ])
  })

  it('maps flexible CSV headers, quoted delimiters, and first/last names without a model call', () => {
    const result = parseContactSpreadsheet({
      fileName: 'boss-network.csv',
      bytes: csvBytes(
        [
          'Exported by LinkedIn',
          'Given Name,Surname,Company Name,Position Title,Work Email,Mobile Number,Relationship Context',
          'Ada,Lovelace,Analytical Engines,"Founder, Research",ada@example.com,+1 (617) 555-0100,"Met at a conference, 2024"',
        ].join('\r\n'),
      ),
    })

    expect(result).toMatchObject({ format: 'csv', headerRow: 2 })
    expect(result.contacts).toEqual([
      expect.objectContaining({
        name: 'Ada Lovelace',
        organization: 'Analytical Engines',
        role: 'Founder, Research',
        email: 'ada@example.com',
        phone: '+1 (617) 555-0100',
        howWeKnow: 'Met at a conference, 2024',
        sourceRow: 3,
      }),
    ])
    expect(result.stats.importedRows).toBe(1)
  })

  it('detects tabs and semicolons instead of turning a whole row into one giant name', () => {
    const tabbed = parseContactSpreadsheet({
      fileName: 'connections.tsv',
      bytes: csvBytes('Contact\tOrganization\tE-mail\nGrace Hopper\tUS Navy\tgrace@example.com'),
    })
    expect(tabbed.contacts[0]).toMatchObject({
      name: 'Grace Hopper',
      organization: 'US Navy',
      email: 'grace@example.com',
    })

    const semicolon = parseContactSpreadsheet({
      fileName: 'connections.csv',
      bytes: csvBytes('Full Name;Organisation;LinkedIn Profile\nLin Chen;Acme;linkedin.com/in/lin-chen'),
    })
    expect(semicolon.contacts[0]).toMatchObject({
      name: 'Lin Chen',
      organization: 'Acme',
      linkedinUrl: 'https://linkedin.com/in/lin-chen',
    })
  })

  it('handles Excel-style UTF-16 BOM exports and quoted newlines as one source row', () => {
    const result = parseContactSpreadsheet({
      fileName: 'excel-export.csv',
      bytes: utf16LeBytes('Name\tCompany\tNotes\r\nAda Lovelace\tAcme\t"Met at HIMSS\r\nand worked together"'),
    })
    expect(result.contacts).toHaveLength(1)
    expect(result.contacts[0]).toMatchObject({
      name: 'Ada Lovelace',
      organization: 'Acme',
      howWeKnow: 'Met at HIMSS and worked together',
      sourceRow: 2,
    })
  })

  it('treats CSV formula text as inert and never copies it into a contact field', () => {
    const result = parseContactSpreadsheet({
      fileName: 'untrusted.csv',
      bytes: csvBytes('Name,Company,How We Know\nAda,Acme,"=HYPERLINK(\"\"https://bad.example\"\",\"\"click\"\")"'),
    })
    expect(result.contacts[0]).toMatchObject({ name: 'Ada', organization: 'Acme' })
    expect(result.contacts[0].howWeKnow).toBeUndefined()
    expect(result.stats.formulaCells).toBe(1)
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'formula_text_ignored', row: 2, column: 3 }),
    )
  })

  it('adds actionable duplicate provenance for in-file and existing identities', () => {
    const existingKeys = new Set(['email:existing@example.com'])
    const result = parseContactSpreadsheet(
      {
        fileName: 'duplicates.csv',
        bytes: csvBytes([
          'Name,Company,Email',
          'Ada One,Acme,ada@example.com',
          'Ada Renamed,Elsewhere,ada@example.com',
          'Existing Person,Acme,existing@example.com',
        ].join('\n')),
      },
      { existingIdentityKeys: existingKeys },
    )
    expect(result.contacts[1]).toMatchObject({
      duplicate: true,
      duplicateKind: 'file',
      duplicateOfRow: 2,
      duplicateKeyType: 'email',
    })
    expect(result.contacts[2]).toMatchObject({
      duplicate: true,
      duplicateKind: 'existing',
      duplicateKeyType: 'email',
    })
    expect(result.stats.duplicateRows).toBe(2)
  })

  it('does not let placeholder or malformed contact details become strong duplicate identities', () => {
    const result = parseContactSpreadsheet({
      fileName: 'placeholders.csv',
      bytes: csvBytes([
        'Name,Company,Email,Phone',
        'Alex One,First Org,N/A,unknown',
        'Alex Two,Second Org,N/A,1.2E+10',
        'Alex One,First Org,not-an-email,123',
      ].join('\n')),
    })
    expect(result.contacts[0]).toMatchObject({
      name: 'Alex One',
      email: undefined,
      phone: undefined,
      invalidFields: ['email', 'phone'],
    })
    expect(result.contacts[1].duplicate).toBeUndefined()
    expect(result.contacts[2]).toMatchObject({
      duplicate: true,
      duplicateKind: 'file',
      duplicateKeyType: 'name-and-organization',
    })
    expect(new Set(result.contacts.map((contact) => contact.sourceId)).size).toBe(3)
  })

  it('flags ambiguous weak/strong repeats regardless of spreadsheet row order', () => {
    const result = parseContactSpreadsheet({
      fileName: 'mixed-identities.csv',
      bytes: csvBytes([
        'Name,Company,Email',
        'Alex Kim,Acme Health,alex@example.com',
        'Alex Kim,Acme Health,',
        'Jordan Lee,Signal Health,',
        'Jordan Lee,Signal Health,jordan@example.com',
      ].join('\n')),
    })

    expect(result.contacts[1]).toMatchObject({
      duplicate: true,
      duplicateKind: 'file',
      duplicateOfRow: 2,
      duplicateKeyType: 'name-and-organization',
    })
    expect(result.contacts[3]).toMatchObject({
      duplicate: true,
      duplicateKind: 'file',
      duplicateOfRow: 4,
      duplicateKeyType: 'name-and-organization',
    })
  })

  it('reads a bounded real XLSX archive, selects the contact sheet, and only uses cached formula values', () => {
    const result = parseContactSpreadsheet({
      fileName: 'boss-network.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      bytes: xlsxFixture(),
    })
    expect(result).toMatchObject({ format: 'xlsx', sheetName: 'Boss Connections', headerRow: 2 })
    expect(result.contacts[0]).toMatchObject({
      name: 'Ada Lovelace',
      organization: 'Analytical Engines',
      email: 'ada@example.com',
      role: 'Chief Scientist',
      sourceRow: 3,
      sourceSheet: 'Boss Connections',
    })
    expect(result.stats.formulaCells).toBe(1)
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'formula_cached_value_used' }))
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'sheet_selected' }))
  })

  it('selects populated contact data over an empty template with more mapped columns', () => {
    const result = parseContactSpreadsheet({
      fileName: 'template-and-network.xlsx',
      bytes: populatedSheetSelectionFixture(),
    })

    expect(result.sheetName).toBe('Current Network')
    expect(result.contacts).toEqual([
      expect.objectContaining({
        name: 'Grace Hopper',
        organization: 'US Navy',
        email: 'grace@example.com',
      }),
    ])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: 'sheet_selected',
        sheet: 'Current Network',
        message: expect.stringContaining('importable named contacts (1)'),
      }),
    )
  })

  it('ignores formula-looking stored strings in XLSX and rejects external-workbook content', () => {
    const formulaText = minimalWorkbook({
      'xl/workbook.xml': '<workbook xmlns:r="r"><sheets><sheet name="Contacts" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/worksheets/sheet1.xml': `<worksheet><sheetData>
        <row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>Notes</t></is></c></row>
        <row r="2"><c r="A2" t="inlineStr"><is><t>Ada</t></is></c><c r="B2" t="inlineStr"><is><t>=WEBSERVICE(&quot;https://bad.example&quot;)</t></is></c></row>
      </sheetData></worksheet>`,
    })
    const result = parseContactSpreadsheet({ fileName: 'formula-text.xlsx', bytes: formulaText })
    expect(result.contacts[0].howWeKnow).toBeUndefined()
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'formula_text_ignored' }))

    const external = minimalWorkbook({
      'xl/workbook.xml': '<workbook/>',
      'xl/externalLinks/externalLink1.xml': '<externalLink/>',
    })
    expect(() => parseContactSpreadsheet({ fileName: 'external.xlsx', bytes: external })).toThrowError(
      expect.objectContaining({ code: 'unsafe_workbook_content' }),
    )
  })

  it('caps contact rows and cell content with visible warnings', () => {
    const rows = ['Name,Company']
    for (let index = 0; index < CONTACT_SPREADSHEET_IMPORT_LIMITS.contacts + 5; index += 1) {
      rows.push(`Person ${index},${index === 0 ? 'x'.repeat(CONTACT_SPREADSHEET_IMPORT_LIMITS.cellCharacters + 50) : `Org ${index}`}`)
    }
    const result = parseContactSpreadsheet({ fileName: 'large.csv', bytes: csvBytes(rows.join('\n')) })
    expect(result.contacts).toHaveLength(CONTACT_SPREADSHEET_IMPORT_LIMITS.contacts)
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'cell_truncated', row: 2 }))
    expect(result.warnings).toContainEqual(expect.objectContaining({ code: 'rows_ignored' }))
  })

  it('fails closed for legacy XLS, missing headers, macro workbooks, and oversized input', () => {
    const legacy = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    expect(() => parseContactSpreadsheet({ fileName: 'old.xls', bytes: legacy })).toThrowError(
      expect.objectContaining({ code: 'legacy_xls_unsupported' }),
    )
    expect(() =>
      parseContactSpreadsheet({ fileName: 'mystery.csv', bytes: csvBytes('Unknown,Stuff\nAda,Acme') }),
    ).toThrowError(expect.objectContaining({ code: 'missing_contact_header' }))
    expect(() => parseContactSpreadsheet({ fileName: 'macros.xlsm', bytes: xlsxFixture() })).toThrowError(
      expect.objectContaining({ code: 'unsupported_format' }),
    )
    expect(() =>
      parseContactSpreadsheet({
        fileName: 'too-large.csv',
        bytes: new Uint8Array(CONTACT_SPREADSHEET_IMPORT_LIMITS.fileBytes + 1),
      }),
    ).toThrowError(expect.objectContaining({ code: 'file_too_large' }))
  })

  it('reports duplicate headers instead of silently allowing the later column to win', () => {
    const result = parseContactSpreadsheet({
      fileName: 'ambiguous.csv',
      bytes: csvBytes('Name,Full Name,Company\nAda,Wrong Override,Acme'),
    })
    expect(result.contacts[0].name).toBe('Ada')
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'duplicate_column', row: 1, column: 2 }),
    )
  })
})
