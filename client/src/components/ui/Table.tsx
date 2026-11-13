import {
  type ReactNode,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
  type FC,
} from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
  className?: string
  containerClassName?: string
}

export const Table: FC<TableProps> = ({
  children,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div
      className={`w-full overflow-x-auto border border-slate-200/90 rounded-xl bg-white shadow-2xs ${containerClassName}`}
    >
      <table className={`w-full text-left text-xs sm:text-sm border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
}

export const TableHeader: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <thead
      className={`bg-slate-50/90 border-b border-slate-200/90 text-slate-500 ${className}`}
    >
      {children}
    </thead>
  )
}

export const TableBody: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>
}

export const TableRow: FC<
  HTMLAttributes<HTMLTableRowElement> & { isSelected?: boolean; isClickable?: boolean }
> = ({ children, className = '', isSelected = false, isClickable = false, ...props }) => {
  return (
    <tr
      className={`transition-colors duration-100 ${
        isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/70'
      } ${isClickable ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
}

export interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  numeric?: boolean
  className?: string
}

export const TableHead: FC<TableHeadProps> = ({
  children,
  numeric = false,
  className = '',
  ...props
}) => {
  return (
    <th
      className={`py-3 px-3.5 sm:px-4 text-xs font-semibold text-slate-600 select-none ${
        numeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  )
}

export interface SortableTableHeadProps extends TableHeadProps {
  sortKey: string
  currentSortKey?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string) => void
}

export const SortableTableHead: FC<SortableTableHeadProps> = ({
  children,
  sortKey,
  currentSortKey,
  sortOrder,
  onSort,
  numeric = false,
  className = '',
  ...props
}) => {
  const isSorted = currentSortKey === sortKey

  return (
    <th
      onClick={() => onSort?.(sortKey)}
      className={`py-3 px-3.5 sm:px-4 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition select-none ${
        numeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...props}
    >
      <div className={`inline-flex items-center gap-1.5 ${numeric ? 'justify-end' : 'justify-start'}`}>
        <span>{children}</span>
        {isSorted ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-[#059669]" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-[#059669]" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
        )}
      </div>
    </th>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  numeric?: boolean
  className?: string
}

export const TableCell: FC<TableCellProps> = ({
  children,
  numeric = false,
  className = '',
  ...props
}) => {
  return (
    <td
      className={`py-3 px-3.5 sm:px-4 text-slate-700 text-xs sm:text-sm align-middle ${
        numeric ? 'text-right font-tabular' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  )
}
