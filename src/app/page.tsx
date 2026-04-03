"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/satsang/file-upload";
import { SummaryCards } from "@/components/satsang/summary-cards";
import { SatsangGharCard } from "@/components/satsang/satsang-ghar-card";
import { ListsDisplay } from "@/components/satsang/lists-display";
import { SatsangSchedule } from "@/lib/excel-parser";
import { Button } from "@/components/ui/button";
import { Download, Upload, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  const [schedule, setSchedule] = useState<SatsangSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to parse file");
        return;
      }

      setSchedule(result.data);
      toast.success(`Successfully parsed: ${result.data.title}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleExportJSON = useCallback(() => {
    if (!schedule) return;
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satsang_schedule.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded");
  }, [schedule]);

  const handleExportCSV = useCallback(() => {
    if (!schedule) return;
    const rows = ["Sr No,Satsang Ghar,Category,Date,Time,Name of SK,Shabad,Bani,Book"];
    for (const ghar of schedule.ghars) {
      for (const entry of ghar.entries) {
        const escape = (s: string) =>
          s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        rows.push(
          [
            ghar.srNo,
            escape(ghar.name),
            escape(ghar.category),
            escape(entry.date),
            escape(entry.time),
            escape(entry.nameOfSK),
            escape(entry.shabad),
            escape(entry.bani),
            escape(entry.book),
          ].join(",")
        );
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "satsang_schedule.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV file downloaded");
  }, [schedule]);

  const handleReset = useCallback(() => {
    setSchedule(null);
    toast.info("Ready for a new file");
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Satsang Schedule Extractor</h1>
              <p className="text-xs text-muted-foreground">
                Upload an Excel file to extract schedule data
              </p>
            </div>
          </div>
          {schedule && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="text-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                New File
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Upload Section */}
        {!schedule && (
          <div className="max-w-xl mx-auto pt-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                Upload Your Excel File
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload the Satsang Schedule Excel file (.xlsx) to extract and view the data in a structured format.
              </p>
            </div>
            <FileUpload onFileAccepted={handleFile} isProcessing={isProcessing} />
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                Special (SP)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                Sub-Center (SC)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                Center (C)
              </div>
            </div>
          </div>
        )}

        {/* Schedule Display */}
        {schedule && (
          <>
            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-foreground">{schedule.title}</h2>
              <Separator className="mt-3" />
            </div>

            {/* Summary Stats */}
            <SummaryCards summary={schedule.summary} />

            {/* Satsang Ghars */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Satsang Ghars ({schedule.ghars.length})
              </h3>
              <div className="space-y-4">
                {schedule.ghars.map((ghar) => (
                  <SatsangGharCard key={ghar.srNo} ghar={ghar} />
                ))}
              </div>
            </div>

            {/* Unique Lists */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Unique Data
              </h3>
              <ListsDisplay summary={schedule.summary} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
