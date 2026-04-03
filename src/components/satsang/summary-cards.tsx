"use client";

import { ScheduleSummary } from "@/lib/excel-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, Video, Mic } from "lucide-react";

interface SummaryCardsProps {
  summary: ScheduleSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const stats = [
    {
      label: "Satsang Ghars",
      value: summary.totalGhars,
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Total Sessions",
      value: summary.totalSessions,
      icon: BookOpen,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Live Sessions",
      value: summary.liveSessions,
      icon: Mic,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "VCD Sessions",
      value: summary.vcdSessions,
      icon: Video,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Unique Speakers",
      value: summary.uniqueSpeakers,
      icon: Users,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      label: "Unique Shabads",
      value: summary.uniqueShabads,
      icon: BookOpen,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
