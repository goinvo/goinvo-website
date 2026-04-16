import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DataTableColumn {
  label: ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface DataTableRow {
  key?: string
  cells: ReactNode[]
}

interface DataTableProps {
  rows: DataTableRow[]
  columns?: DataTableColumn[]
  sectionTitle?: ReactNode
  stripedRows?: boolean
  fullWidth?: boolean
  tone?: 'default' | 'gray'
  density?: 'compact' | 'comfortable'
  className?: string
}

function alignmentClassName(align: 'left' | 'center' | 'right' | undefined) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

export function DataTable({
  rows,
  columns,
  sectionTitle,
  stripedRows = true,
  fullWidth = false,
  tone = 'gray',
  density = 'compact',
  className,
}: DataTableProps) {
  if (!rows.length) return null

  const cellClassName = cn(
    'align-top pr-[5px] leading-[26px]',
    density === 'comfortable' ? 'py-[10px]' : 'py-px'
  )

  const shouldRenderColumnHeaders = Boolean(
    columns?.some((column) =>
      typeof column.label === 'string'
        ? column.label.trim().length > 0
        : column.label != null
    )
  )

  const table = (
    <table
      className={cn(
        'w-full border-separate [border-spacing:2px] text-base',
        tone === 'gray' ? 'text-gray' : 'text-black',
        className
      )}
    >
      <tbody>
        {sectionTitle && (
          <tr>
            <td
              colSpan={Math.max(columns?.length || 0, rows[0]?.cells.length || 1)}
              className={cellClassName}
            >
              {sectionTitle}
            </td>
          </tr>
        )}
        {columns && columns.length > 0 && shouldRenderColumnHeaders && (
          <tr>
            {columns.map((column, index) => (
              <td
                key={`${String(column.label)}-${index}`}
                width={column.width}
                className={cn(
                  cellClassName,
                  alignmentClassName(column.align),
                  index === columns.length - 1 && column.align === 'right' && 'pr-0'
                )}
              >
                {column.label}
              </td>
            ))}
          </tr>
        )}
        {rows.map((row, rowIndex) => (
          <tr key={row.key || `row-${rowIndex}`} className={stripedRows && rowIndex % 2 === 0 ? 'bg-[#f9f9f9]' : undefined}>
            {row.cells.map((cell, cellIndex) => {
              const column = columns?.[cellIndex]
              const align = column?.align || (cellIndex === row.cells.length - 1 ? 'left' : 'left')

              return (
                <td
                  key={`${row.key || rowIndex}-${cellIndex}`}
                  width={column?.width}
                  className={cn(
                    cellClassName,
                    alignmentClassName(align),
                    cellIndex === row.cells.length - 1 && align === 'right' && 'pr-0'
                  )}
                >
                  {cell}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )

  if (fullWidth) {
    return (
      <div className="relative left-1/2 right-1/2 my-8 w-screen -ml-[50vw] -mr-[50vw] overflow-x-auto">
        <div className="min-w-[720px] px-5">{table}</div>
      </div>
    )
  }

  return <div className="my-8 overflow-x-auto">{table}</div>
}
