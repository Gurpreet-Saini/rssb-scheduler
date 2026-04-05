"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SavedSchedule } from "@/lib/store";

interface ScheduleEvent {
  date: string; // YYYY-MM-DD
  gharName: string;
  scheduleId: string;
  scheduleName: string;
}

interface DashboardCalendarProps {
  savedSchedules: SavedSchedule[];
  onViewReports: () => void;
}

function parseScheduleEvents(schedules: SavedSchedule[]): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const monthNames: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };

  for (const sched of schedules) {
    try {
      const parsed = JSON.parse(sched.scheduleData);
      if (!parsed?.entries) continue;
      const seen = new Set<string>();
      for (const entry of parsed.entries) {
        const rawDate: string = entry?.entry?.date;
        if (!rawDate) continue;
        // Parse formats: "03-May", "03 May", "03-May-25", "03 May 2025"
        const parts = rawDate.trim().split(/[\s-]+/);
        let isoDate = "";
        if (parts.length >= 2) {
          let day = "", month = "";
          if (/^\d+$/.test(parts[0]) && monthNames[parts[1]]) {
            day = parts[0].padStart(2, "0");
            month = monthNames[parts[1]];
          } else if (/^\d+$/.test(parts[1]) && monthNames[parts[0]]) {
            day = parts[1].padStart(2, "0");
            month = monthNames[parts[0]];
          }
          if (day && month) {
            const year = parts[2]
              ? (parts[2].length === 2 ? "20" + parts[2] : parts[2])
              : new Date().getFullYear().toString();
            isoDate = `${year}-${month}-${day}`;
          }
        }
        if (!isoDate) continue;
        const dedupeKey = `${isoDate}-${entry.gharName}-${sched.id}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        events.push({
          date: isoDate,
          gharName: entry.gharName,
          scheduleId: sched.id,
          scheduleName: sched.name,
        });
      }
    } catch {
      // If schedule has createdAt date, use it as a fallback event marker
      if (sched.createdAt) {
        const d = new Date(sched.createdAt);
        if (!isNaN(d.getTime())) {
          const isoDate = d.toISOString().split("T")[0];
          events.push({
            date: isoDate,
            gharName: "—",
            scheduleId: sched.id,
            scheduleName: sched.name,
          });
        }
      }
    }
  }
  return events;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function DashboardCalendar({ savedSchedules, onViewReports }: DashboardCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const events = useMemo(() => parseScheduleEvents(savedSchedules), [savedSchedules]);

  // Build a map: "YYYY-MM-DD" -> events[]
  const eventMap = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const ev of events) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return map;
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const days: Array<{ date: Date | null; isoDate: string }> = [];

    // Pad start
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, isoDate: "" });
    }
    // Fill days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(viewYear, viewMonth, d);
      days.push({ date, isoDate: date.toISOString().split("T")[0] });
    }
    // Pad to complete grid rows
    while (days.length % 7 !== 0) {
      days.push({ date: null, isoDate: "" });
    }
    return days;
  }, [viewYear, viewMonth]);

  const totalEventsThisMonth = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return events.filter(e => e.date.startsWith(prefix)).length;
  }, [events, viewYear, viewMonth]);

  const isToday = (isoDate: string) =>
    isoDate === today.toISOString().split("T")[0];

  return (
    <Card className="rounded-xl overflow-hidden">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-600" />
            Schedule Calendar
            {totalEventsThisMonth > 0 && (
              <Badge variant="secondary" className="text-[10px] font-medium">
                {totalEventsThisMonth} sessions
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevMonth}
              className="h-7 w-7 p-0"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              onClick={goToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 hover:bg-gray-200 transition-colors min-w-[130px] text-center"
            >
              {MONTH_NAMES[viewMonth]} {viewYear}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              className="h-7 w-7 p-0"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b bg-gray-50/70">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, i) => {
            const dayEvents = cell.isoDate ? (eventMap.get(cell.isoDate) || []) : [];
            const today_ = isToday(cell.isoDate);
            // Count distinct ghars for this day
            const uniqueGhars = new Set(dayEvents.map(e => e.gharName)).size;

            return (
              <div
                key={i}
                className={`min-h-[72px] border-r border-b p-1.5 text-xs relative group transition-colors
                  ${!cell.date ? "bg-gray-50/30" : "hover:bg-gray-50/60"}
                  ${today_ ? "bg-amber-50/60" : ""}
                `}
              >
                {cell.date && (
                  <>
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium mb-1
                        ${today_ ? "bg-amber-500 text-white font-bold" : "text-gray-700"}
                      `}
                    >
                      {cell.date.getDate()}
                    </span>

                    {dayEvents.length > 0 && (
                      <div className="space-y-0.5">
                        {/* Show up to 2 events, then "+N more" */}
                        {dayEvents.slice(0, 2).map((ev, eIdx) => (
                          <div
                            key={eIdx}
                            title={`${ev.scheduleName}: ${ev.gharName}`}
                            className="w-full truncate rounded px-1 py-0.5 text-[9px] font-medium bg-amber-100 text-amber-800 leading-tight"
                          >
                            {ev.gharName !== "—" ? ev.gharName : ev.scheduleName}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <button
                            onClick={onViewReports}
                            className="text-[9px] text-amber-700 font-semibold hover:underline"
                          >
                            +{dayEvents.length - 2} more
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {savedSchedules.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No saved schedules yet. Generate one to see it here.
          </div>
        ) : (
          <div className="px-4 py-2.5 border-t bg-gray-50/50 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {events.length} total session{events.length !== 1 ? "s" : ""} across {savedSchedules.length} report{savedSchedules.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={onViewReports}
              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 hover:underline"
            >
              View all reports →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
