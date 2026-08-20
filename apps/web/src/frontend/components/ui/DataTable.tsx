"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "./EmptyState";
import { RowActions, type RowAction } from "./RowActions";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Keep it presentational — sorting uses `sortValue`. */
  cell: (row: T) => React.ReactNode;
  /** Sort/search key. Omit to make the column non-sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** Hide below the `sm` breakpoint. */
  hideOnMobile?: boolean;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  /** Fields concatenated for the search box. */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  rowActions?: (row: T) => RowAction[];
  /** Enables checkboxes + the bulk action bar. */
  bulkActions?: (ids: string[], clear: () => void) => React.ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyEmoji?: string;
  emptyAction?: React.ReactNode;
  /** Extra controls rendered next to the search box (e.g. "Add" button). */
  toolbar?: React.ReactNode;
  /** CSV export of the current (filtered) rows. */
  exportName?: string;
  className?: string;
  dense?: boolean;
}

export function DataTable<T>({
  rows,
  columns,
  rowId,
  searchable,
  searchPlaceholder = "Search…",
  filters = [],
  rowActions,
  bulkActions,
  onRowClick,
  pageSize = 10,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyEmoji = "🗂️",
  emptyAction,
  toolbar,
  exportName,
  className,
  dense = false,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let out = rows;

    if (query.trim() && searchable) {
      const q = query.trim().toLowerCase();
      out = out.filter((r) => searchable(r).toLowerCase().includes(q));
    }

    for (const f of filters) {
      const value = filterState[f.key];
      if (value && value !== "all") out = out.filter((r) => f.predicate(r, value));
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : `${av}`.localeCompare(`${bv}`);
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }

    return out;
  }, [rows, query, filterState, sort, filters, columns, searchable]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const allOnPageSelected = paged.length > 0 && paged.every((r) => selected.includes(rowId(r)));
  const activeFilterCount = Object.values(filterState).filter((v) => v && v !== "all").length;

  function toggleSort(key: string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function exportCsv() {
    const header = columns.map((c) => c.header).join(",");
    const body = filtered
      .map((row) =>
        columns
          .map((c) => {
            const raw = c.sortValue ? c.sortValue(row) : "";
            return `"${`${raw}`.replace(/"/g, '""')}"`;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportName ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-0 flex-1 sm:max-w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="h-9 pl-8"
                aria-label="Search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {filters.map((f) => (
            <select
              key={f.key}
              value={filterState[f.key] ?? "all"}
              onChange={(e) => {
                setFilterState((s) => ({ ...s, [f.key]: e.target.value }));
                setPage(0);
              }}
              aria-label={f.label}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="all">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {f.label}: {o.label}
                </option>
              ))}
            </select>
          ))}

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilterState({})}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {exportName && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download /> Export
            </Button>
          )}
          {toolbar}
        </div>
      </div>

      {/* Bulk bar */}
      {bulkActions && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ck-red/20 bg-ck-red/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {bulkActions(selected, () => setSelected([]))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            Cancel
          </Button>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {filtered.length === 0 ? (
          <EmptyState
            emoji={emptyEmoji}
            title={query || activeFilterCount ? "No matches" : emptyTitle}
            description={
              query || activeFilterCount
                ? "Try a different search term or clear the filters."
                : emptyDescription
            }
            action={query || activeFilterCount ? undefined : emptyAction}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs tracking-wide text-muted-foreground uppercase">
                  {bulkActions && (
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={(checked) => {
                          const ids = paged.map(rowId);
                          setSelected((prev) =>
                            checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)),
                          );
                        }}
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className={cn(
                        "px-3 py-2.5 font-medium",
                        c.hideOnMobile && "hidden sm:table-cell",
                        c.headerClassName,
                      )}
                    >
                      {c.sortValue ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                        >
                          {c.header}
                          {sort?.key === c.key &&
                            (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                  {rowActions && <th className="w-12 px-3 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y">
                {paged.map((row) => {
                  const id = rowId(row);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "transition hover:bg-muted/40",
                        onRowClick && "cursor-pointer",
                        selected.includes(id) && "bg-ck-red/5",
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {bulkActions && (
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selected.includes(id)}
                            onCheckedChange={(checked) =>
                              setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
                            }
                            aria-label="Select row"
                          />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            dense ? "px-3 py-2" : "px-3 py-3",
                            c.hideOnMobile && "hidden sm:table-cell",
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowActions actions={rowActions(row)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {safePage * pageSize + 1}–{Math.min(filtered.length, (safePage + 1) * pageSize)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
