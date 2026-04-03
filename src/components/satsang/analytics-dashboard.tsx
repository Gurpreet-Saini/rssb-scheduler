"use client";

import {
  BarChart3, Users, Calendar, Video, Mic, Star,
  AlertTriangle, CheckCircle2, MinusCircle, ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { GeneratedSchedule, BalanceStatus } from "@/lib/types";

interface AnalyticsDashboardProps {
  schedule: GeneratedSchedule;
}

function getBalanceStatus(stdDev: number, average: number): BalanceStatus {
  if (average === 0) return "balanced";
  const cv = stdDev / average;
  if (cv <= 0.15) return "balanced";
  if (cv <= 0.35) return "slightly_off";
  return "uneven";
}

function BalanceIndicator({ stdDev, average }: { stdDev: number; average: number }) {
  const status = getBalanceStatus(stdDev, average);
  return (
    <div className="flex items-center gap-1">
      {status === "balanced" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : status === "slightly_off" ? (
        <MinusCircle className="h-3.5 w-3.5 text-amber-500" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
      )}
      <span className={`text-[10px] font-medium ${
        status === "balanced" ? "text-emerald-600 dark:text-emerald-400"
        : status === "slightly_off" ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400"
      }`}>
        {status === "balanced" ? "Equal" : status === "slightly_off" ? "~Equal" : "Uneven"}
      </span>
    </div>
  );
}

const slotLabelColors: Record<string, string> = {
  A: "text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/40",
  B: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
  C: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  D: "text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40",
};

const slotBarColors: Record<string, string> = {
  A: "bg-sky-400 dark:bg-sky-600 hover:bg-sky-500",
  B: "bg-emerald-400 dark:bg-emerald-600 hover:bg-emerald-500",
  C: "bg-amber-400 dark:bg-amber-600 hover:bg-amber-500",
  D: "bg-purple-400 dark:bg-purple-600 hover:bg-purple-500",
};

export function AnalyticsDashboard({ schedule }: AnalyticsDashboardProps) {
  const metrics = schedule.metrics;
  const hasAnyBaalSatsang = schedule.entries.some((e) => e.hasBaalSatsang);

  // Overall balance check
  const overallBalanced = metrics.slotMetrics.every(
    (s) => s.slot === "D" || getBalanceStatus(s.stdDev, s.average) === "balanced"
  );

  return (
    <div className="space-y-4">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Calendar, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", value: metrics.totalPrograms, label: "Total Programs" },
          { icon: Mic, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", value: metrics.liveSessions, label: "Live Sessions" },
          { icon: Video, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", value: metrics.vcdSessions, label: "VCD Sessions" },
          { icon: Users, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", value: schedule.config.pathis.length, label: "Pathis" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution Quality Banner */}
      <div className={`flex items-center gap-3 rounded-lg border p-3 ${
        overallBalanced
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
      }`}>
        {overallBalanced ? (
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        )}
        <div>
          <p className={`text-sm font-semibold ${
            overallBalanced ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {overallBalanced
              ? "Equal Distribution Achieved"
              : "Distribution Has Variance"}
          </p>
          <p className="text-xs text-muted-foreground">
            Each pathi gets approximately equal assignments across all slots.
            {overallBalanced
              ? " All slots are balanced within tolerance."
              : " Some pathis may have slightly more or fewer assignments."}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Per-Slot Distribution Detail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Pathi Slot Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.slotMetrics
              .filter((s) => s.slot !== "D" || hasAnyBaalSatsang)
              .map((slot) => {
                const counts = schedule.config.pathis.map((p) => slot.assignments[p] || 0);
                const maxCount = Math.max(...counts, 1);
                const minCount = Math.min(...counts);
                const range = maxCount - minCount;

                return (
                  <div key={slot.slot} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${slotLabelColors[slot.slot]} text-[10px] px-1.5 py-0 border-0 font-bold`}>
                          Slot-{slot.slot}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {slot.total} total
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          avg {slot.average.toFixed(1)} · range {range}
                        </span>
                        <BalanceIndicator stdDev={slot.stdDev} average={slot.average} />
                      </div>
                    </div>

                    {/* Bar chart */}
                    <div className="flex items-end gap-1.5 h-8">
                      {schedule.config.pathis.map((pathi) => {
                        const count = slot.assignments[pathi] || 0;
                        const height = Math.max((count / maxCount) * 100, 6);
                        return (
                          <div
                            key={pathi}
                            className="flex-1 flex flex-col items-center gap-0.5"
                            title={`${pathi}: ${count} assignments (Slot-${slot.slot})`}
                          >
                            <span className="text-[8px] font-medium text-muted-foreground">{count}</span>
                            <div className="w-full rounded-sm transition-all hover:opacity-80" style={{ height: `${height}%` }}>
                              <div className={`w-full h-full rounded-sm ${slotBarColors[slot.slot]}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-1.5">
                      {schedule.config.pathis.map((pathi) => (
                        <div key={pathi} className="flex-1 text-center text-[8px] text-muted-foreground truncate" title={pathi}>
                          {pathi.split(" ")[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Per-Pathi Summary Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Per-Pathi Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Pathi</TableHead>
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
                    <TableHead className="text-xs text-center font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.pathiDetails.map((p) => {
                    const totalPossible = metrics.slotMetrics.reduce((acc, s) => acc + s.total, 0);
                    const avgTotal = schedule.config.pathis.length > 0 ? totalPossible / schedule.config.pathis.length : 0;
                    const deviation = Math.abs(p.total - avgTotal);
                    const isBalanced = deviation <= avgTotal * 0.15;

                    return (
                      <TableRow key={p.pathiName}>
                        <TableCell className="text-xs py-1.5 font-medium">{p.pathiName}</TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-sky-600">{p.slotA}</span>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-emerald-600">{p.slotB}</span>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-amber-600">{p.slotC}</span>
                        </TableCell>
                        {hasAnyBaalSatsang && (
                          <TableCell className="text-xs text-center py-1.5">
                            <span className="text-purple-600">{p.slotD}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-center py-1.5">
                          <Badge variant="secondary" className={`text-[10px] font-semibold ${
                            isBalanced
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}>
                            {p.total}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: SK Distribution + Ghar Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* SK Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-600" />
              SK Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">SK Name</TableHead>
                    <TableHead className="text-xs text-center">Live</TableHead>
                    <TableHead className="text-xs text-center">VCD</TableHead>
                    <TableHead className="text-xs text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.skDistribution.map((sk) => (
                    <TableRow key={sk.skName}>
                      <TableCell className="text-xs py-1.5">
                        {sk.skName === "VCD" ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed border-gray-300 text-gray-500">VCD</Badge>
                        ) : (
                          <span className="font-medium">{sk.skName}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-center py-1.5">
                        {sk.liveCount > 0 ? <Badge variant="secondary" className="text-[10px]">{sk.liveCount}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-center py-1.5">
                        {sk.vcdCount > 0 ? <Badge variant="secondary" className="text-[10px]">{sk.vcdCount}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-center py-1.5 font-semibold">{sk.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ghar Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              Satsang Ghar Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.gharSummary.map((ghar) => (
                <div
                  key={ghar.gharName}
                  className={`flex items-center justify-between rounded-lg border p-2.5 ${
                    ghar.hasBaalSatsang
                      ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={`${categoryColors(ghar.gharCategory)} text-[9px] px-1 py-0 border-0 shrink-0`}>
                      {ghar.gharCategory}
                    </Badge>
                    <span className="text-xs font-medium truncate">{ghar.gharName}</span>
                    {ghar.hasBaalSatsang && <span className="text-[9px] text-purple-500">★ BS</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                    <span>{ghar.totalEntries} total</span>
                    <span className="text-emerald-600">{ghar.liveEntries} live</span>
                    {ghar.vcdEntries > 0 && <span className="text-purple-600">{ghar.vcdEntries} VCD</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function categoryColors(cat: string): string {
  switch (cat) {
    case "SP": return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "SC": return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
    default: return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  }
}
