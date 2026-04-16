export type DataTableDelimiter = 'auto' | 'csv' | 'tsv'

export function detectDataTableDelimiter(source: string, delimiter: DataTableDelimiter): ',' | '\t' {
  if (delimiter === 'csv') return ','
  if (delimiter === 'tsv') return '\t'

  const firstLine = source.split(/\r?\n/, 1)[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length

  return tabCount > commaCount ? '\t' : ','
}

function parseDelimitedLine(line: string, separator: ',' | '\t') {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      const nextCharacter = line[index + 1]
      if (inQuotes && nextCharacter === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === separator && !inQuotes) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += character
  }

  cells.push(current.trim())

  return cells
}

export function parseDataTableSource(source: string | undefined, delimiter: DataTableDelimiter = 'auto') {
  if (!source?.trim()) return [] as string[][]

  const separator = detectDataTableDelimiter(source, delimiter)
  return source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseDelimitedLine(line, separator))
}
