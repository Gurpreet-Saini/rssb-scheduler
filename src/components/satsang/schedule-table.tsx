"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download, Filter, ChevronDown, ChevronRight,
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

const categoryColors: Record<string, string> = {
  SP: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  SC: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  C: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const categoryLabels: Record<string, string> = {
  SP: "Special",
  SC: "Sub-Center",
  C: "Center",
};

const slotColors: Record<string, string> = {
  A: "border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
  B: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  C: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  D: "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
};

function pathiBadge(value: string, slot: string) {
  if (!value || value === "N/A") {
    return (
      <span className="text-muted-foreground text-xs italic">{value || "—"}</span>
    );
  }
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium px-2 py-0.5 border whitespace-nowrap ${slotColors[slot] || "border-gray-300 dark:border-gray-700"}`}
    >
      {value}
    </Badge>
  );
}

export function ScheduleTable({ schedule }: ScheduleTableProps) {
  const [placeFilter, setPlaceFilter] = useState<string>("all");
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [showAllCenters, setShowAllCenters] = useState(false);

  const hasAnyBaalSatsang = useMemo(
    () => schedule.entries.some((e) => e.hasBaalSatsang),
    [schedule.entries]
  );

  // Group entries by center
  const groupedByCenter = useMemo(() => {
    const groups: Map<string, { category: string; entries: typeof schedule.entries }> = new Map();
    for (const entry of schedule.entries) {
      if (!groups.has(entry.gharName)) {
        groups.set(entry.gharName, { category: entry.gharCategory, entries: [] });
      }
      groups.get(entry.gharName)!.entries.push(entry);
    }
    // Sort entries within each center by date then time
    for (const [, group] of groups) {
      group.entries.sort((a, b) => {
        const dateCmp = a.entry.date.localeCompare(b.entry.date);
        if (dateCmp !== 0) return dateCmp;
        return a.entry.time.localeCompare(b.entry.time);
      });
    }
    // Sort centers: SP first, then SC, then C, alphabetically within
    const sorted = [...groups.entries()].sort((a, b) => {
      const order = (cat: string) => cat === "SP" ? 0 : cat === "SC" ? 1 : 2;
      const catDiff = order(a[1].category) - order(b[1].category);
      if (catDiff !== 0) return catDiff;
      return a[0].localeCompare(b[0]);
    });
    return new Map(sorted);
  }, [schedule.entries]);

  const centerNames = useMemo(
    () => [...groupedByCenter.keys()],
    [groupedByCenter]
  );

  const filteredCenters = useMemo(() => {
    if (placeFilter === "all") return centerNames;
    return centerNames.filter((c) => c === placeFilter);
  }, [centerNames, placeFilter]);

  // Auto-expand when filter is set to a specific center
  const visibleExpandedCenters = useMemo(() => {
    if (placeFilter !== "all" && placeFilter) {
      return new Set([placeFilter]);
    }
    if (showAllCenters) return new Set(centerNames);
    return expandedCenters;
  }, [expandedCenters, centerNames, placeFilter, showAllCenters]);

  const toggleCenter = useCallback((name: string) => {
    setExpandedCenters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setShowAllCenters(true);
    setExpandedCenters(new Set(centerNames));
  }, [centerNames]);

  const collapseAll = useCallback(() => {
    setShowAllCenters(false);
    setExpandedCenters(new Set());
  }, []);

  const allExpanded = filteredCenters.length > 0 && filteredCenters.every((c) => visibleExpandedCenters.has(c));

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
    for (const centerName of centerNames) {
      const group = groupedByCenter.get(centerName)!;
      for (const e of group.entries) {
        const base = [
          csvEscape(e.entry.date), csvEscape(e.entry.time), csvEscape(e.gharName), csvEscape(e.gharCategory),
          csvEscape(e.entry.nameOfSK), csvEscape(e.entry.shabad), csvEscape(e.entry.bani), csvEscape(e.entry.book),
          csvEscape(e.pathiA), csvEscape(e.pathiB), csvEscape(e.pathiC),
        ];
        if (hasAnyBaalSatsang) base.push(csvEscape(e.pathiD));
        rows.push(base.join(","));
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satsang_schedule_with_pathis.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported with all details");
  }, [centerNames, groupedByCenter, hasAnyBaalSatsang]);

  const uniquePlaces = useMemo(
    () => centerNames.sort(),
    [centerNames]
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              Complete Schedule
            </CardTitle>
            <Badge variant="secondary" className="text-xs font-normal shrink-0">
              {schedule.entries.length} entries · {centerNames.length} centers
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 shrink-0" />
                <SelectValue placeholder="Filter place" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                {uniquePlaces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={allExpanded ? collapseAll : expandAll}
              className="text-xs gap-1"
            >
              {allExpanded ? (
                <>
                  <ChevronRight className="h-3 w-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Expand All
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[700px]">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredCenters.map((centerName) => {
              const group = groupedByCenter.get(centerName)!;
              const isExpanded = visibleExpandedCenters.has(centerName);
              const liveCount = group.entries.filter((e) => e.entry.nameOfSK !== "VCD").length;
              const vcdCount = group.entries.length - liveCount;
              const baalCount = group.entries.filter((e) => e.hasBaalSatsang).length;

              return (
                <div key={centerName} className="w-full">
                  {/* Center header - clickable to expand/collapse */}
                  <button
                    onClick={() => toggleCenter(centerName)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Badge className={`${categoryColors[group.category] || ""} text-[10px] px-1.5 py-0 border-0 shrink-0`}>
                        {categoryLabels[group.category] || group.category}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground truncate">{centerName}</span>
                      {baalCount > 0 && (
                        <Badge className="text-[9px] px-1 py-0 border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                          Baal
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{group.entries.length} sessions</span>
                        <span className="text-emerald-600">{liveCount} live</span>
                        {vcdCount > 0 && <span className="text-purple-600">{vcdCount} VCD</span>}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded entries table for this center */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">SK</TableHead>
                              <TableHead className="text-xs hidden md:table-cell">Shabad</TableHead>
                              <TableHead className="text-xs text-center">
                                <span className="text-sky-600 font-semibold">A</span>
                              </TableHead>
                              <TableHead className="text-xs text-center">
                                <span className="text-emerald-600 font-semibold">B</span>
                              </TableHead>
                              <TableHead className="text-xs text-center">
                                <span className="text-amber-600 font-semibold">C</span>
                              </TableHead>
                              {hasAnyBaalSatsang && (
                                <TableHead className="text-xs text-center">
                                  <span className="text-purple-600 font-semibold">D</span>
                                </TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.entries.map((e, i) => {
                              const isVCD = e.entry.nameOfSK === "VCD";
                              const isBaal = e.hasBaalSatsang;
                              return (
                                <TableRow
                                  key={`${e.entry.date}-${i}`}
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
                                  <TableCell className="text-xs py-2 hidden md:table-cell">
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
                      </div>

                      {/* Slot legend */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1">
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${slotColors.A}`}>A</Badge>
                          Live
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${slotColors.B}`}>B</Badge>
                          Pathi-B
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${slotColors.C}`}>C</Badge>
                          Pathi-C
                        </div>
                        {hasAnyBaalSatsang && (
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            <Badge variant="outline" className={`text-[8px] px-1 py-0 ${slotColors.D}`}>D</Badge>
                            Baal
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
