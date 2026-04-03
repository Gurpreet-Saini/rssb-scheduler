"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download, ArrowUpDown, ArrowUp, ArrowDown, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GeneratedSchedule } from "@/lib/types";
import { toast } from "sonner";

interface ScheduleTableProps {
  schedule: GeneratedSchedule;
}

type SortField = "date" | "gharName" | "pathiA" | "pathiB" | "pathiC" | "pathiD";
type SortDirection = "asc" | "desc";

const slotColors: Record<string, string> = {
  A: "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
  B: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  C: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  D: "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
};

const categoryColors: Record<string, string> = {
  SP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SC: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  C: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (currentField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return direction === "asc"
    ? <ArrowUp className="h-3 w-3 text-amber-600" />
    : <ArrowDown className="h-3 w-3 text-amber-600" />;
}

export function ScheduleTable({ schedule }: ScheduleTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [placeFilter, setPlaceFilter] = useState<string>("all");

  const uniquePlaces = useMemo(
    () => [...new Set(schedule.entries.map((e) => e.gharName))].sort(),
    [schedule.entries]
  );

  const hasAnyBaalSatsang = useMemo(
    () => schedule.entries.some((e) => e.hasBaalSatsang),
    [schedule.entries]
  );

  const filteredEntries = useMemo(() => {
    if (placeFilter === "all") return schedule.entries;
    return schedule.entries.filter((e) => e.gharName === placeFilter);
  }, [schedule.entries, placeFilter]);

  const sortedEntries = useMemo(() => {
    const sorted = [...filteredEntries];
    sorted.sort((a, b) => {
      let valA: string, valB: string;
      switch (sortField) {
        case "date": valA = a.entry.date; valB = b.entry.date; break;
        case "gharName": valA = a.gharName; valB = b.gharName; break;
        case "pathiA": valA = a.pathiA; valB = b.pathiA; break;
        case "pathiB": valA = a.pathiB; valB = b.pathiB; break;
        case "pathiC": valA = a.pathiC; valB = b.pathiC; break;
        case "pathiD": valA = a.pathiD; valB = b.pathiD; break;
        default: return 0;
      }
      const cmp = valA.localeCompare(valB);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredEntries, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDirection("asc"); }
  }, [sortField]);

  const exportCSV = useCallback(() => {
    const header = hasAnyBaalSatsang
      ? "Date,Time,Place,Category,SK,Shabad,Bani,Book,Pathi-A,Pathi-B,Pathi-C,Pathi-D"
      : "Date,Time,Place,Category,SK,Shabad,Bani,Book,Pathi-A,Pathi-B,Pathi-C";
    const rows = [header];
    function csvEscape(s: string): string {
      if (s.includes(",") || s.includes('"')) {
        return '"' + s.replace(/"/g, '"') + '"';
      }
      return s;
    }
    for (const e of sortedEntries) {
      const base = [
        csvEscape(e.entry.date), csvEscape(e.entry.time), csvEscape(e.gharName), csvEscape(e.gharCategory),
        csvEscape(e.entry.nameOfSK), csvEscape(e.entry.shabad), csvEscape(e.entry.bani), csvEscape(e.entry.book),
        csvEscape(e.pathiA), csvEscape(e.pathiB), csvEscape(e.pathiC),
      ];
      if (hasAnyBaalSatsang) base.push(csvEscape(e.pathiD));
      rows.push(base.join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satsang_schedule_with_pathis.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported with all details");
  }, [sortedEntries, hasAnyBaalSatsang]);

  const pathiBadge = (value: string, slot: string) => {
    if (!value || value === "N/A") {
      return (
        <span className="text-muted-foreground text-xs italic">{value || "—"}</span>
      );
    }
    return (
      <Badge
        variant="outline"
        className={`text-[11px] font-medium px-2 py-0.5 border ${slotColors[slot] || "border-gray-300 dark:border-gray-700"}`}
      >
        {value}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold">
            Complete Schedule
            <Badge variant="secondary" className="ml-2 text-xs font-normal">
              {sortedEntries.length} entries
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 shrink-0" />
                <SelectValue placeholder="Filter place" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Places</SelectItem>
                {uniquePlaces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none text-xs" onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-1">Date <SortIcon field="date" currentField={sortField} direction={sortDirection} /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-xs" onClick={() => handleSort("gharName")}>
                  <div className="flex items-center gap-1">Place <SortIcon field="gharName" currentField={sortField} direction={sortDirection} /></div>
                </TableHead>
                <TableHead className="text-xs">SK</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Shabad</TableHead>
                <TableHead className="cursor-pointer select-none text-xs text-center" onClick={() => handleSort("pathiA")}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sky-600 font-semibold">A</span>
                    <SortIcon field="pathiA" currentField={sortField} direction={sortDirection} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-xs text-center" onClick={() => handleSort("pathiB")}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-emerald-600 font-semibold">B</span>
                    <SortIcon field="pathiB" currentField={sortField} direction={sortDirection} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-xs text-center" onClick={() => handleSort("pathiC")}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber-600 font-semibold">C</span>
                    <SortIcon field="pathiC" currentField={sortField} direction={sortDirection} />
                  </div>
                </TableHead>
                {hasAnyBaalSatsang && (
                  <TableHead className="cursor-pointer select-none text-xs text-center" onClick={() => handleSort("pathiD")}>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-purple-600 font-semibold">D</span>
                      <SortIcon field="pathiD" currentField={sortField} direction={sortDirection} />
                    </div>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((e, i) => {
                const isVCD = e.entry.nameOfSK === "VCD";
                const isBaal = e.hasBaalSatsang;
                return (
                  <TableRow
                    key={`${e.entry.date}-${e.gharName}-${i}`}
                    className={`
                      ${isVCD ? "opacity-60 bg-gray-50/50 dark:bg-gray-900/10" : ""}
                      ${isBaal && !isVCD ? "bg-purple-50/20 dark:bg-purple-950/10" : ""}
                    `}
                  >
                    <TableCell className="text-xs whitespace-nowrap py-2">
                      <span className="font-medium">{e.entry.date}</span>
                      <span className="text-muted-foreground text-[10px] ml-1">{e.entry.time}</span>
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <div className="flex items-center gap-1.5">
                        <Badge className={`${categoryColors[e.gharCategory] || ""} text-[9px] px-1 py-0 border-0 shrink-0`}>
                          {e.gharCategory}
                        </Badge>
                        <span className="truncate max-w-[100px]" title={e.gharName}>{e.gharName}</span>
                        {isBaal && <span className="text-[9px] text-purple-500">★</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      {isVCD ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed border-gray-300 text-gray-500">
                          VCD
                        </Badge>
                      ) : (
                        <span className="font-medium truncate max-w-[80px] block" title={e.entry.nameOfSK}>
                          {e.entry.nameOfSK}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2 hidden lg:table-cell">
                      <span className="line-clamp-1 text-muted-foreground" title={e.entry.shabad}>
                        {e.entry.shabad || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {pathiBadge(e.pathiA, "A")}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {pathiBadge(e.pathiB, "B")}
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {pathiBadge(e.pathiC, "C")}
                    </TableCell>
                    {hasAnyBaalSatsang && (
                      <TableCell className="text-center py-2">
                        {isBaal ? pathiBadge(e.pathiD, "D") : <span className="text-muted-foreground/30 text-xs">—</span>}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground border-t pt-3">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${slotColors.A}`}>A</Badge>
            Pathi-A (live only)
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${slotColors.B}`}>B</Badge>
            Pathi-B
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${slotColors.C}`}>C</Badge>
            Pathi-C
          </div>
          {hasAnyBaalSatsang && (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-[9px] px-1 py-0 ${slotColors.D}`}>D</Badge>
              Pathi-D (Baal Satsang)
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 border border-dashed border-gray-300 rounded" />
            VCD Session
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
