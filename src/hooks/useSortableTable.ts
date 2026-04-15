import { useState, useMemo, useCallback } from "react";

type SortDirection = "asc" | "desc";

export function useSortableTable<T = any>(defaultKey?: string, defaultDir: SortDirection = "asc") {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDir);

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDirection(d => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortDirection("asc");
      }
      return key;
    });
  }, []);

  const sortData = useCallback(
    (data: T[], accessor?: (item: T, key: string) => any): T[] => {
      if (!sortKey) return data;
      const sorted = [...data].sort((a, b) => {
        const valA = accessor ? accessor(a, sortKey) : (a as any)[sortKey];
        const valB = accessor ? accessor(b, sortKey) : (b as any)[sortKey];

        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;

        // Numbers
        if (typeof valA === "number" && typeof valB === "number") {
          return valA - valB;
        }

        // Dates (ISO strings)
        const dateA = typeof valA === "string" && /^\d{4}-\d{2}-\d{2}/.test(valA) ? new Date(valA).getTime() : null;
        const dateB = typeof valB === "string" && /^\d{4}-\d{2}-\d{2}/.test(valB) ? new Date(valB).getTime() : null;
        if (dateA && dateB) return dateA - dateB;

        // Text
        return String(valA).localeCompare(String(valB), "cs-CZ", { sensitivity: "base" });
      });
      return sortDirection === "desc" ? sorted.reverse() : sorted;
    },
    [sortKey, sortDirection]
  );

  return { sortKey, sortDirection, handleSort, sortData };
}
