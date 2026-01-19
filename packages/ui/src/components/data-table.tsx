"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./button"
import { Spinner } from "./spinner"
import { cn } from "../lib/utils"

// Legacy Column interface for backwards compatibility
export interface Column<T> {
  accessor: keyof T | ((row: T) => unknown)
  header: string
  cell?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data available",
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col, idx) => ({
        id: typeof col.accessor === "string" ? col.accessor : `col_${idx}`,
        accessorFn: (row: T) =>
          typeof col.accessor === "function"
            ? col.accessor(row)
            : row[col.accessor],
        header: ({ column }) => {
          if (col.sortable === false) {
            return <span>{col.header}</span>
          }
          return (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {col.header}
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ getValue, row }) => {
          const value = getValue()
          if (col.cell) {
            return col.cell(value, row.original)
          }
          return value as React.ReactNode
        },
        enableSorting: col.sortable !== false,
      })),
    [columns]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: onPageChange ? undefined : getPaginationRowModel(),
    manualPagination: !!onPageChange,
    pageCount: total ? Math.ceil(total / pageSize) : undefined,
  })

  const isPaginated = onPageChange !== undefined
  const totalPages = total ? Math.ceil(total / pageSize) : table.getPageCount()

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Spinner size="lg" />
        <p className="text-muted-foreground text-sm">Loading data...</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border bg-muted/50"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-semibold text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-border transition-colors",
                  "hover:bg-muted/50"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isPaginated || totalPages > 1) && (
        <div className="flex items-center justify-center gap-2 mt-4 py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              isPaginated ? onPageChange(page - 1) : table.previousPage()
            }
            disabled={isPaginated ? page <= 1 : !table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page{" "}
            {isPaginated ? page : table.getState().pagination.pageIndex + 1} of{" "}
            {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              isPaginated ? onPageChange(page + 1) : table.nextPage()
            }
            disabled={
              isPaginated ? page >= totalPages : !table.getCanNextPage()
            }
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
