"use client";

import React, { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Download, Filter, ChevronDown, ChevronRight, MapPin, Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GeneratedSchedule } from "@/lib/types";
import { toast } from "sonner";
import { CalendarView } from "./calendar-view";

interface ScheduleTableProps {
  schedule: GeneratedSchedule;
  readOnly?: boolean;
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


/** Parse "03-May" → "2026-05-03" for sorting */
function parseDateSortable(dateStr: string): string {
  if (!dateStr) return "";
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.trim().split(/[\s-]+/);
  if (parts.length === 2) {
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

export const ScheduleTable = React.memo(function ScheduleTable({ schedule, readOnly = false }: ScheduleTableProps) {
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [placeFilter, setPlaceFilter] = useState<string>("all");
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  
  const setGeneratedSchedule = useAppStore(state => state.setGeneratedSchedule);

  const handleDragStart = useCallback((e: React.DragEvent, pathiName: string, date: string, gharName: string, slotKey: string) => {
    if (readOnly || pathiName === "N/A" || !pathiName) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("application/json", JSON.stringify({ pathiName, date, gharName, slotKey }));
    e.dataTransfer.effectAllowed = "move";
  }, [readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, [readOnly]);

  const handleDrop = useCallback((e: React.DragEvent, targetDate: string, targetGhar: string, targetSlotKey: string) => {
    if (readOnly) return;
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      if (!data || !data.pathiName) return;

      const { pathiName, date: sourceDate, gharName: sourceGhar, slotKey: sourceSlot } = data;

      // Avoid self-drop
      if (sourceDate === targetDate && sourceGhar === targetGhar && sourceSlot === targetSlotKey) return;

      // Clash Engine: Check if Pathi is at a DIFFERENT center on same date
      const entriesForDate = schedule.entries.filter(en => en.entry.date === targetDate);
      const isAlreadyOnDateAtDifferentPlace = entriesForDate.some(en => {
        if (en.gharName === targetGhar) return false;
        return [en.pathiA, en.pathiB, en.pathiC, en.pathiD].includes(pathiName);
      });

      if (isAlreadyOnDateAtDifferentPlace) {
        toast.error(`Clash Error: ${pathiName} is already assigned to a different Center on ${targetDate}.`);
        return;
      }

      // Mutate
      const newEntries = [...schedule.entries];
      const sourceIdx = newEntries.findIndex(en => en.entry.date === sourceDate && en.gharName === sourceGhar);
      const targetIdx = newEntries.findIndex(en => en.entry.date === targetDate && en.gharName === targetGhar);

      if (sourceIdx === -1 || targetIdx === -1) return;

      const targetEntry = newEntries[targetIdx];
      const swappedPathi = targetEntry[targetSlotKey as keyof typeof targetEntry];

      newEntries[sourceIdx] = { ...newEntries[sourceIdx], [sourceSlot]: swappedPathi };
      newEntries[targetIdx] = { ...newEntries[targetIdx], [targetSlotKey]: pathiName };

      setGeneratedSchedule({ ...schedule, entries: newEntries });
      toast.success(`Swapped ${pathiName} successfully`);
      
    } catch (err) {}
  }, [readOnly, schedule, setGeneratedSchedule]);

  const renderDraggableBadge = useCallback((value: string, slot: string, date: string, gharName: string, slotKey: string) => {
    if (!value || value === "N/A") {
      return (
        <div 
          onDragOver={handleDragOver} 
          onDrop={(e) => handleDrop(e, date, gharName, slotKey)}
          className="h-full w-full min-h-[24px] flex items-center justify-center rounded border border-dashed border-transparent hover:border-gray-300 transition-colors cursor-pointer"
        >
          <span className="text-muted-foreground/30 text-[10px] italic">—</span>
        </div>
      );
    }
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, date, gharName, slotKey)}
        className="p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <Badge
          draggable={!readOnly}
          onDragStart={(e) => handleDragStart(e, value, date, gharName, slotKey)}
          variant="outline"
          className={`text-[11px] font-medium px-2 py-0.5 border whitespace-nowrap cursor-grab active:cursor-grabbing ${slotColors[slot] || "border-gray-300 dark:border-gray-700"}`}
        >
          {value}
        </Badge>
      </div>
    );
  }, [readOnly, handleDragStart, handleDragOver, handleDrop]);

  const hasAnyBaalSatsang = useMemo(
    () => schedule.entries.some((e) => e.hasBaalSatsang),
    [schedule.entries]
  );

  const uniquePlaces = useMemo(
    () => [...new Set(schedule.entries.map((e) => e.gharName))].sort(),
    [schedule.entries]
  );

  const groupedByCenter = useMemo(() => {
    const filteredEntries =
      placeFilter === "all"
        ? schedule.entries
        : schedule.entries.filter((e) => e.gharName === placeFilter);

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

    for (const [, center] of centerMap) {
      center.entries.sort((a, b) => {
        const dc = parseDateSortable(a.entry.date).localeCompare(parseDateSortable(b.entry.date));
        if (dc !== 0) return dc;
        return a.entry.time.localeCompare(b.entry.time);
      });
    }

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

  const exportXLSX = useCallback(() => {
    const headerRow = hasAnyBaalSatsang
      ? ["Date", "Time", "Place", "Category", "SK", "Shabad", "Bani", "Book", "Pathi-A", "Pathi-B", "Pathi-C", "Pathi-D"]
      : ["Date", "Time", "Place", "Category", "SK", "Shabad", "Bani", "Book", "Pathi-A", "Pathi-B", "Pathi-C"];
      
    const sorted = [...schedule.entries].sort((a, b) => {
      const dc = parseDateSortable(a.entry.date).localeCompare(parseDateSortable(b.entry.date));
      if (dc !== 0) return dc;
      const placeComp = a.gharName.localeCompare(b.gharName);
      if (placeComp !== 0) return placeComp;
      return a.entry.time.localeCompare(b.entry.time);
    });

    const worksheetData = [headerRow];
    
    for (const e of sorted) {
      const row = [
        e.entry.date, e.entry.time, e.gharName, e.gharCategory,
        e.entry.nameOfSK, e.entry.shabad, e.entry.bani, e.entry.book,
        e.pathiA !== "N/A" ? e.pathiA : "", 
        e.pathiB !== "N/A" ? e.pathiB : "", 
        e.pathiC !== "N/A" ? e.pathiC : "",
      ];
      if (hasAnyBaalSatsang) {
        row.push(e.pathiD !== "N/A" ? e.pathiD : "");
      }
      worksheetData.push(row);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    
    ws['!cols'] = headerRow.map((_, i) => ({ 
      wch: Math.min(Math.max(...worksheetData.map(r => String(r[i] || "").length)) + 2, 50) 
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Satsang Schedule");
    
    XLSX.writeFile(wb, "Satsang_Schedule.xlsx");
    toast.success("Excel (.xlsx) exported successfully!");
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-md border border-gray-200">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`h-7 px-3 text-xs ${viewMode === "table" ? "bg-white shadow-sm" : "hover:bg-gray-200/50"}`}
              >
                Table
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className={`h-7 px-3 text-xs ${viewMode === "calendar" ? "bg-white shadow-sm" : "hover:bg-gray-200/50"}`}
              >
                Calendar
              </Button>
            </div>
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
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={isAllExpanded ? collapseAll : expandAll} className="h-8 text-xs gap-1.5 hidden md:flex">
                {isAllExpanded ? (
                  <><ChevronRight className="h-3 w-3" />Collapse All</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />Expand All</>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportXLSX} className="text-xs gap-1.5 h-8">
              <Download className="h-3.5 w-3.5" /> Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs gap-1.5 h-8 print:hidden">
              <Printer className="h-3.5 w-3.5" /> Print / PDF
            </Button>
          </div>
        </div>
        {viewMode === "table" && slotLegend}
      </CardHeader>
      <CardContent className="p-0">
        {viewMode === "calendar" ? (
          <div className="p-4 bg-gray-50/50 min-h-[500px]">
             <CalendarView schedule={schedule} />
          </div>
        ) : (
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

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="rounded-lg border overflow-x-auto overflow-y-hidden">
                          <Table className="min-w-[600px] md:min-w-full">
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
                                    <TableCell className="text-center py-1">
                                      {renderDraggableBadge(e.pathiA, "A", e.entry.date, e.gharName, "pathiA")}
                                    </TableCell>
                                    <TableCell className="text-center py-1">
                                      {renderDraggableBadge(e.pathiB, "B", e.entry.date, e.gharName, "pathiB")}
                                    </TableCell>
                                    <TableCell className="text-center py-1">
                                      {renderDraggableBadge(e.pathiC, "C", e.entry.date, e.gharName, "pathiC")}
                                    </TableCell>
                                    {hasAnyBaalSatsang && (
                                      <TableCell className="text-center py-1">
                                        {isBaal ? renderDraggableBadge(e.pathiD, "D", e.entry.date, e.gharName, "pathiD") : <span className="text-muted-foreground/30 text-[10px]">—</span>}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
