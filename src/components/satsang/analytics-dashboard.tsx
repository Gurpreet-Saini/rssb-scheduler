"use client";

import {
  BarChart3, Users, Calendar, Video, Mic, Star,
  AlertTriangle, CheckCircle2, MinusCircle, ShieldCheck,
} from "lucide-react";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex items-center gap-1.5">
      {status === "balanced" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      ) : status === "slightly_off" ? (
        <MinusCircle className="h-3.5 w-3.5 text-amber-500" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
      )}
      <span className={`text-[11px] font-semibold ${
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
  A: "bg-sky-400 dark:bg-sky-500",
  B: "bg-emerald-400 dark:bg-emerald-500",
  C: "bg-amber-400 dark:bg-amber-500",
  D: "bg-purple-400 dark:bg-purple-500",
};

const slotBgColors: Record<string, string> = {
  A: "bg-sky-50 dark:bg-sky-950/20",
  B: "bg-emerald-50 dark:bg-emerald-950/20",
  C: "bg-amber-50 dark:bg-amber-950/20",
  D: "bg-purple-50 dark:bg-purple-950/20",
};

const slotBorderColors: Record<string, string> = {
  A: "border-sky-200 dark:border-sky-800",
  B: "border-emerald-200 dark:border-emerald-800",
  C: "border-amber-200 dark:border-amber-800",
  D: "border-purple-200 dark:border-purple-800",
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
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distribution Quality Banner */}
      <div className={`flex items-start gap-3 rounded-lg border p-3 ${
        overallBalanced
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
      }`}>
        {overallBalanced ? (
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${
            overallBalanced ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
          }`}>
            {overallBalanced
              ? "Equal Distribution Achieved"
              : "Distribution Has Variance"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Each pathi gets approximately equal assignments across all slots.
            {overallBalanced
              ? " All slots are balanced within tolerance."
              : " Some pathis may have slightly more or fewer assignments."}
          </p>
        </div>
      </div>

      {/* Pathi Slot Distribution - Full Width with native scroll */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Pathi Slot Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-6 w-full h-[450px]">
             <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={metrics.pathiDetails}
                  margin={{ top: 20, right: 30, left: 0, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="pathiName" 
                    angle={-45} 
                    textAnchor="end" 
                    interval={0} 
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickMargin={8}
                    height={70}
                  />
                  <YAxis 
                    tick={{fontSize: 12, fill: '#6B7280'}} 
                    axisLine={false} 
                    tickLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                     contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                     cursor={{ fill: 'transparent' }} 
                  />
                  <Legend wrapperStyle={{paddingTop: '20px'}} />
                  <Bar dataKey="slotA" name="Slot A" stackId="a" fill="#38BDF8" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="slotB" name="Slot B" stackId="a" fill="#34D399" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="slotC" name="Slot C" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
                  {hasAnyBaalSatsang && (
                    <Bar dataKey="slotD" name="Slot D" stackId="a" fill="#C084FC" radius={[4, 4, 0, 0]} />
                  )}
                </RechartsBarChart>
              </ResponsiveContainer>
          </div>

        </CardContent>
      </Card>

      {/* Per-Pathi Summary + SK Distribution row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Per-Pathi Summary Table */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Per-Pathi Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="scrollable-panel max-h-[300px]">
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
                    const isBalanced = deviation <= avgTotal * 0.15 || avgTotal === 0;

                    return (
                      <TableRow key={p.pathiName}>
                        <TableCell className="text-xs py-1.5 font-medium max-w-[120px]">
                          <span className="truncate block" title={p.pathiName}>{p.pathiName}</span>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-sky-600 font-medium">{p.slotA}</span>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-emerald-600 font-medium">{p.slotB}</span>
                        </TableCell>
                        <TableCell className="text-xs text-center py-1.5">
                          <span className="text-amber-600 font-medium">{p.slotC}</span>
                        </TableCell>
                        {hasAnyBaalSatsang && (
                          <TableCell className="text-xs text-center py-1.5">
                            <span className="text-purple-600 font-medium">{p.slotD}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-center py-1.5">
                          <Badge variant="secondary" className={`text-[10px] font-bold ${
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
            </div>
          </CardContent>
        </Card>

        {/* SK Distribution */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-600" />
              SK Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="scrollable-panel max-h-[300px]">
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
                          <span className="font-medium truncate block max-w-[120px]" title={sk.skName}>{sk.skName}</span>
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Satsang Ghar Summary - Full Width with native scroll */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Satsang Ghar Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="scrollable-panel max-h-[280px]">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {metrics.gharSummary.map((ghar) => (
                <div
                  key={ghar.gharName}
                  className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                    ghar.hasBaalSatsang
                      ? "bg-purple-50/50 dark:bg-purple-950/10"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Badge className={`${categoryColors(ghar.gharCategory)} text-[9px] px-1.5 py-0 border-0 shrink-0`}>
                      {ghar.gharCategory}
                    </Badge>
                    <span className="text-xs font-medium truncate" title={ghar.gharName}>{ghar.gharName}</span>
                    {ghar.hasBaalSatsang && (
                      <Badge className="text-[8px] px-1 py-0 border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 shrink-0">
                        Baal
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0 ml-2">
                    <span className="font-medium text-foreground">{ghar.totalEntries}</span>
                    <span className="text-emerald-600">{ghar.liveEntries} live</span>
                    {ghar.vcdEntries > 0 && <span className="text-purple-600">{ghar.vcdEntries} VCD</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
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
