"use client";

import { ScheduleSummary } from "@/lib/excel-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ListsDisplayProps {
  summary: ScheduleSummary;
}

export function ListsDisplay({ summary }: ListsDisplayProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 dark:bg-rose-900/40">
              <span className="text-[10px] font-bold text-rose-600">{summary.speakerList.length}</span>
            </div>
            Unique Speakers (Sewa Karta)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1">
              {summary.speakerList.map((speaker, i) => (
                <div
                  key={speaker}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{i + 1}.</span>
                  <span className="text-sm text-foreground">{speaker}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-100 dark:bg-cyan-900/40">
              <span className="text-[10px] font-bold text-cyan-600">{summary.shabadList.length}</span>
            </div>
            Unique Shabads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1">
              {summary.shabadList.map((shabad, i) => (
                <div
                  key={shabad}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-6 text-right shrink-0 pt-0.5">{i + 1}.</span>
                  <span className="text-sm text-foreground leading-relaxed">{shabad}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
