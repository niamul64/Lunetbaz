"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton, TBody, THead, Table, Td, Th, Tr } from "@/components/ui/display";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { PageMeta } from "@/types";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  meta?: PageMeta;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

/** Table with built-in loading, empty, error and pagination states. */
export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, empty, meta, onPageChange, onRowClick, className }: DataTableProps<T>) {
  if (error && !rows)
    return (
      <ErrorState
        message={errorMessage(error)}
        action={
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      />
    );

  return (
    <div className={className}>
      <Table>
        <THead>
          <tr>
            {columns.map((c) => (
              <Th key={c.key} className={cn(c.hideOnMobile && "hidden md:table-cell", c.className)}>
                {c.header}
              </Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {loading && !rows
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <Td key={c.key} className={cn(c.hideOnMobile && "hidden md:table-cell")}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </Td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => (
                <Tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((c) => (
                    <Td key={c.key} className={cn(c.hideOnMobile && "hidden md:table-cell", c.className)}>
                      {c.cell(row)}
                    </Td>
                  ))}
                </Tr>
              ))}
        </TBody>
      </Table>
      {rows && rows.length === 0 && <EmptyState title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} />}
      {meta && onPageChange && meta.totalPages > 1 && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}

export function Pagination({ meta, onPageChange }: { meta: PageMeta; onPageChange: (page: number) => void }) {
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.page * meta.pageSize, meta.total);
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm" aria-label="Pagination">
      <p className="text-muted-foreground">
        {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2 tabular-nums">
          {meta.page} / {meta.totalPages}
        </span>
        <Button variant="outline" size="icon-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
