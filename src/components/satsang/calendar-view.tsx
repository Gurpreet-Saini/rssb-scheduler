import React, { useMemo } from "react";
import { GeneratedSchedule } from "@/lib/types";

interface CalendarViewProps {
  schedule: GeneratedSchedule;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ schedule }) => {
  // Group entries by date
  const dateMap = useMemo(() => {
    const map = new Map<string, typeof schedule.entries>();
    for (const e of schedule.entries) {
      if (!e.entry.date) continue;
      // We parse date format like "20-Apr-25" or "05 May 24"
      const parsed = new Date(e.entry.date);
      if (isNaN(parsed.getTime())) continue;
      
      const key = parsed.toISOString().split("T")[0]; // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [schedule]);

  const dates = Array.from(dateMap.keys()).sort();
  if (dates.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No valid dates found in schedule.</div>;
  }

  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  
  // Backtrack start date to Sunday
  const displayStart = new Date(start);
  displayStart.setDate(displayStart.getDate() - displayStart.getDay());
  
  // Forward end date to Saturday
  const displayEnd = new Date(end);
  displayEnd.setDate(displayEnd.getDate() + (6 - displayEnd.getDay()));

  const calendarDays: Date[] = [];
  let current = new Date(displayStart);
  
  while (current <= displayEnd) {
    calendarDays.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white border text-sm rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b bg-gray-50/80">
        {weekdays.map(d => (
          <div key={d} className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(120px,auto)]">
        {calendarDays.map((day, i) => {
          const key = day.toISOString().split("T")[0];
          const entries = dateMap.get(key) || [];
          const isCurrentMonth = day.getMonth() === start.getMonth();

          return (
            <div key={key} className={`border-r border-b p-2 ${!isCurrentMonth ? "bg-gray-50/50 text-gray-400" : ""}`}>
              <div className="font-medium text-xs mb-2 text-right">{day.getDate()}</div>
              <div className="space-y-1">
                {entries.map((e, idx) => (
                  <div key={idx} className="p-1.5 bg-blue-50/50 border border-blue-100 rounded text-[10px] leading-tight hover:bg-blue-100 transition-colors">
                    <div className="font-semibold text-blue-900 truncate">{e.gharName}</div>
                    <div className="text-blue-700/80 mb-1">{e.entry.time}</div>
                    <div className="text-gray-600 truncate">
                      {e.pathiA !== 'N/A' ? e.pathiA : (e.pathiB !== 'N/A' ? e.pathiB : e.pathiC)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
