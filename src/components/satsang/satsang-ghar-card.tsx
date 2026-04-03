"use client";

import { useState } from "react";
import { SatsangGhar } from "@/lib/excel-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SatsangGharCardProps {
  ghar: SatsangGhar;
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

export function SatsangGharCard({ ghar }: SatsangGharCardProps) {
  const [expanded, setExpanded] = useState(true);
  const liveCount = ghar.entries.filter((e) => e.nameOfSK !== "VCD" && e.nameOfSK !== "").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-sm">
              {ghar.srNo}
            </div>
            <div>
              <CardTitle className="text-lg">{ghar.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${categoryColors[ghar.category] || ""} text-[10px] px-2 py-0 border-0`}>
                  {categoryLabels[ghar.category] || ghar.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {liveCount} live · {ghar.entries.length - liveCount} VCD
                </span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="schedule">Full Schedule</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="schedule" className="mt-3">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {ghar.entries.map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/30 ${
                        entry.nameOfSK === "VCD"
                          ? "border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="shrink-0 text-center min-w-[56px]">
                        <p className="text-xs font-semibold text-foreground">{entry.date}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {entry.nameOfSK === "VCD" ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-600">
                              VCD
                            </Badge>
                          ) : (
                            <span className="text-sm font-medium text-foreground truncate">
                              {entry.nameOfSK}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate" title={entry.shabad}>
                          {entry.shabad}
                        </p>
                      </div>
                      <div className="shrink-0 text-right hidden sm:block max-w-[180px]">
                        <p className="text-[10px] text-muted-foreground truncate" title={entry.bani}>
                          {entry.bani || "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 truncate" title={entry.book}>
                          {entry.book || "—"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="details" className="mt-3">
              <ScrollArea className="max-h-[400px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Date</th>
                      <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Speaker</th>
                      <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Shabad</th>
                      <th className="text-left py-2 pr-3 font-semibold text-muted-foreground hidden md:table-cell">Bani</th>
                      <th className="text-left py-2 font-semibold text-muted-foreground hidden lg:table-cell">Book</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ghar.entries.map((entry, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className="text-foreground">{entry.date}</span>
                          <br />
                          <span className="text-muted-foreground text-[10px]">{entry.time}</span>
                        </td>
                        <td className="py-2 pr-3">
                          {entry.nameOfSK === "VCD" ? (
                            <span className="text-purple-600 font-medium">VCD</span>
                          ) : (
                            entry.nameOfSK
                          )}
                        </td>
                        <td className="py-2 pr-3 max-w-[200px]">
                          <span className="line-clamp-2" title={entry.shabad}>{entry.shabad || "—"}</span>
                        </td>
                        <td className="py-2 pr-3 max-w-[150px] hidden md:table-cell">
                          <span className="line-clamp-1" title={entry.bani}>{entry.bani || "—"}</span>
                        </td>
                        <td className="py-2 max-w-[150px] hidden lg:table-cell">
                          <span className="line-clamp-1" title={entry.book}>{entry.book || "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
