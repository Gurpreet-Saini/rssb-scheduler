"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Download, Filter, ChevronDown, ChevronRight, MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const categoryIconBg: Record<string, string> = {
  SP: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  SC: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
  C: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
};

function pathiBadge(value: string, slot: string) {
  if (!value || value === "N/A") {
    return <span className="text-muted-foreground text-xs italic">{value || "—"}</span>;
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

/** Parse "03-May" → "2026-05-03" for sorting */
function parseDateSortable(dateStr: string): string {
  if (!dateStr) return "";
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.trim().split(/[\s-]+/);
  if (parts.length === 2) {
    // Could be "03 May" or "03-May"
    let day: string, month: string;
    // Check if first part is a number (day) and second is month
    if (/^\d+$/.test(parts[0]) && months[parts[1]]) {
      day = parts[0].padStart(2, "0");
      month = months[parts[1]];
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]]) {
      // "May 03" format
      day = parts[1].padStart(2, "0");
      month = months[parts[0]];
    } else {
      return dateStr;
    }
    return `2026-${month}-${day}`;
  }
  // Try "03 May 2026" or "03-May-2026" format
  if (parts.length === 3) {
    let day: string, month: string;
    if (/^\d+$/.test(parts[0]) && months[parts[1]]) {
      day = parts[0].padStart(2, "0");
      month = months[parts[1]];
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]]) {
      day = parts[1].padStart(2, "0");
      month = months[parts[0]];
    } else {
      return dateStr;
    }
    return `2026-${month}-${day}`;
  }
  return dateStr;
}

export function ScheduleTable({ schedule }: ScheduleTableProps) {
  const [placeFilter, setPlaceFilter] = useState<string>("all");
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const hasAnyBaalSatsang = useMemo(
    () => schedule.entries.some((e) => e.hasBaalSatsang),
    [schedule.entries]
  );

  const uniquePlaces = useMemo(
    () => [...new Set(schedule.entries.map((e) => e.gharName))].sort(),
    [schedule.entries]
  );

  // Group entries by CENTER, sorted by category then name
  // Within each center, sort entries by date chronologically
  const groupedByCenter = useMemo(() => {
    const filteredEntries =
      placeFilter === "all"
        ? schedule.entries
        : schedule.entries.filter((e) => e.gharName === placeFilter);

    // Group by center (gharName)
    const centerMap: Map<string, {
      category: string;
      entries: typeof schedule.entries;
    }> = new Map();

    for (const entry of filteredEntries) {
      if (!centerMap.has(entry.gharName)) {
        centerMap.set(entry.gharName, { category: entry.gharCategory, entries: [] });
      }
      centerMap.get(entry.gharName)!.entries.push(entry);
    }

    // Sort entries within each center by date (chronologically)
    for (const [, center] of centerMap) {
      center.entries.sort((a, b) => {
        const dc = parseDateSortable(a.entry.date).localeCompare(parseDateSortable(b.entry.date));
        if (dc !== 0) return dc;
        return a.entry.time.localeCompare(b.entry.time);
      });
    }

    // Sort centers: SP → SC → C, then alphabetically
    const sortedCenters = [...centerMap.entries()]
      .map(([name, data]) => ({
        name,
        category: data.category,
        entries: data.entries,
      }))
      .sort((a, b) => {
        const order = (cat: string) => cat === "SP" ? 0 : cat === "SC" ? 1 : 2;
        const catDiff = order(a.category) - order(b.category);
        if (catDiff !== 0) return catDiff;
        return a.name.localeCompare(b.name);
      });

    return sortedCenters;
  }, [schedule.entries, placeFilter]);

  const centerKeys = useMemo(() => groupedByCenter.map((g) => g.name), [groupedByCenter]);

  // Derive expanded set: auto-expand when filtering to a single center,
  // or when showAll is true, otherwise use manual expandedCenters state.
  const expandedSet = useMemo(() => {
    if (showAll) return new Set(centerKeys);
    if (placeFilter !== "all") return new Set([placeFilter]);
    return expandedCenters;
  }, [expandedCenters, centerKeys, showAll, placeFilter]);

  const toggleCenter = useCallback((name: string) => {
    setExpandedCenters((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setShowAll(true);
    setExpandedCenters(new Set(centerKeys));
  }, [centerKeys]);

  const collapseAll = useCallback(() => {
    setShowAll(false);
    setExpandedCenters(new Set());
  }, []);

  const isAllExpanded = centerKeys.length > 0 && centerKeys.every((k) => expandedSet.has(k));

  const exportCSV = useCallback(() => {
    const header = hasAnyBaalSatsang
      ? "Date,Time,Place,Category,SK,Shabad,Bani,Book,Pathi-A,Pathi-B,Pathi-C,Pathi-D"
      : "Date,Time,Place,Category,SK,Shabad,Bani,Book,Pathi-A,Pathi-B,Pathi-C";
    const rows = [header];
    function csvEscape(s: string): string {
      if (s.includes(",") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    // Export: sorted by center, then by date within center
    const sorted = [...schedule.entries].sort((a, b) => {
      const placeComp = a.gharName.localeCompare(b.gharName);
      if (placeComp !== 0) return placeComp;
      const dc = parseDateSortable(a.entry.date).localeCompare(parseDateSortable(b.entry.date));
      if (dc !== 0) return dc;
      return a.entry.time.localeCompare(b.entry.time);
    });
    for (const e of sorted) {
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
    toast.success("CSV exported (sorted by center, then date)");
  }, [schedule.entries, hasAnyBaalSatsang]);

  const slotLegend = (
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
              {schedule.entries.length} entries · {centerKeys.length} centers
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Select value={placeFilter} onValueChange={setPlaceFilter}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
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
              onClick={isAllExpanded ? collapseAll : expandAll}
              className="text-xs gap-1"
            >
              {isAllExpanded ? (
                <><ChevronRight className="h-3 w-3" />Collapse</>
              ) : (
                <><ChevronDown className="h-3 w-3" />Expand All</>
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
        <div className="scrollable-panel max-h-[700px]">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {groupedByCenter.map((center) => {
              const isExpanded = expandedSet.has(center.name);
              const totalEntries = center.entries.length;
              const liveCount = center.entries.filter((e) => e.entry.nameOfSK !== "VCD").length;
              const vcdCount = totalEntries - liveCount;
              const firstDate = center.entries[0]?.entry.date || "";
              const lastDate = center.entries[center.entries.length - 1]?.entry.date || "";

              return (
                <div key={center.name} className="w-full">
                  {/* Center header */}
                  <button
                    onClick={() => toggleCenter(center.name)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${categoryIconBg[center.category] || "bg-gray-100 text-gray-700"}`}>
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge className={`${categoryColors[center.category] || ""} text-[9px] px-1.5 py-0 border-0 shrink-0`}>
                          {categoryLabels[center.category] || center.category}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground truncate">{center.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{totalEntries} session{totalEntries > 1 ? "s" : ""}</span>
                        <span className="text-emerald-600">{liveCount} live</span>
                        {vcdCount > 0 && <span className="text-purple-600">{vcdCount} VCD</span>}
                        <span className="text-gray-500">{firstDate}{firstDate !== lastDate ? ` → ${lastDate}` : ""}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded: show all entries for this center sorted by date */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-900/40">
                              <TableHead className="text-xs">Date</TableHead>
                              <TableHead className="text-xs">Time</TableHead>
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
                            {center.entries.map((e, i) => {
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
                                    <span className="font-medium text-gray-600 dark:text-gray-400">{e.entry.date}</span>
                                  </TableCell>
                                  <TableCell className="text-xs whitespace-nowrap py-2">
                                    <span className="font-medium">{e.entry.time}</span>
                                  </TableCell>
                                  <TableCell className="text-xs py-2">
                                    {isVCD ? (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed border-gray-300 text-gray-500">
                                        VCD
                                      </Badge>
                                    ) : (
                                      <span className="font-medium truncate max-w-[100px] block" title={e.entry.nameOfSK}>
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
                      {slotLegend}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
