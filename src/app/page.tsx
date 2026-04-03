"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar, RotateCcw, ChevronLeft, ChevronRight,
  RefreshCw as RefreshIcon, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/satsang/file-upload";
import { SummaryCards } from "@/components/satsang/summary-cards";
import { SatsangGharCard } from "@/components/satsang/satsang-ghar-card";
import { StepIndicator } from "@/components/satsang/step-indicator";
import { PathiManager } from "@/components/satsang/pathi-manager";
import { ScheduleTable } from "@/components/satsang/schedule-table";
import { AnalyticsDashboard } from "@/components/satsang/analytics-dashboard";
import { SatsangSchedule } from "@/lib/excel-parser";
import { GeneratedSchedule, WizardStep } from "@/lib/types";

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  const [schedule, setSchedule] = useState<SatsangSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [pathis, setPathis] = useState<string[]>([]);
  const [baalSatsangGhars, setBaalSatsangGhars] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-excel", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Failed to parse file"); return; }
      setSchedule(result.data);
      toast.success(`Extracted: ${result.data.title}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < 3) setCurrentStep((s) => (s + 1) as WizardStep);
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as WizardStep);
  }, [currentStep]);

  const handleGenerate = useCallback(async () => {
    if (!schedule) return;
    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleData: schedule, pathis, baalSatsangGhars }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to generate schedule", { duration: 6000 });
        return;
      }
      setGeneratedSchedule(result.data);
      if (result.warning) {
        setScheduleWarning(result.warning);
        toast.warning("Schedule generated — some pathis have slightly more assignments.", { duration: 5000 });
      } else {
        toast.success("Schedule generated with equal distribution across all slots!");
      }
      setCurrentStep(3);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, pathis, baalSatsangGhars]);

  const handleRegenerate = useCallback(async () => {
    if (!schedule) return;
    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleData: schedule, pathis, baalSatsangGhars }),
      });
      const result = await response.json();
      if (!response.ok) { toast.error(result.error || "Failed to regenerate"); return; }
      setGeneratedSchedule(result.data);
      if (result.warning) {
        setScheduleWarning(result.warning);
      } else {
        setScheduleWarning(null);
      }
      toast.success("Schedule regenerated with new assignments!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, pathis, baalSatsangGhars]);

  const handleStartOver = useCallback(() => {
    setCurrentStep(1);
    setSchedule(null);
    setPathis([]);
    setBaalSatsangGhars([]);
    setGeneratedSchedule(null);
    setScheduleWarning(null);
    toast.info("Ready for a new schedule");
  }, []);

  const handleExportJSON = useCallback(() => {
    if (!generatedSchedule) return;
    const blob = new Blob([JSON.stringify(generatedSchedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_schedule.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded");
  }, [generatedSchedule]);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Calendar className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Satsang Schedule Manager</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Upload · Configure Pathis · Auto-Generate
              </p>
            </div>
          </div>
          {currentStep === 3 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="text-xs gap-1.5"
              >
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-xs gap-1.5"
              >
                <RefreshIcon className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button variant="ghost" size="sm" onClick={handleStartOver} className="text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                New File
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <StepIndicator currentStep={currentStep} />

        {/* Step 1 */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {!schedule ? (
              <div className="max-w-xl mx-auto pt-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground">Upload Your Excel File</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Upload the Satsang Schedule Excel file (.xlsx) to extract and view the data
                  </p>
                </div>
                <FileUpload onFileAccepted={handleFile} isProcessing={isProcessing} />
                <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-400" /> Special (SP)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-400" /> Sub-Center (SC)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" /> Center (C)
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{schedule.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">Review the extracted data before configuring pathis</p>
                </div>
                <SummaryCards summary={schedule.summary} />
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
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={handleNext} className="gap-2 bg-amber-600 hover:bg-amber-700">
                    Next: Configure Pathis <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2 */}
        {currentStep === 2 && schedule && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div>
              <h2 className="text-xl font-bold text-foreground">Configure Pathis & Baal Satsang</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add pathis and toggle Baal Satsang per ghar, then generate the schedule
              </p>
            </div>
            <PathiManager
              schedule={schedule}
              pathis={pathis}
              baalSatsangGhars={baalSatsangGhars}
              onPathisChange={setPathis}
              onBaalSatsangChange={setBaalSatsangGhars}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
            <Separator />
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {currentStep === 3 && generatedSchedule && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Generated Schedule</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {generatedSchedule.config.pathis.length} pathis · {generatedSchedule.entries.length} entries
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleBack} className="text-xs gap-1.5">
                  <ChevronLeft className="h-3.5 w-3.5" /> Edit Config
                </Button>
                <Button variant="outline" size="sm" onClick={handleStartOver} className="text-xs gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Start Over
                </Button>
              </div>
            </div>

            {scheduleWarning && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">{scheduleWarning}</p>
              </div>
            )}

            <AnalyticsDashboard schedule={generatedSchedule} />
            <Separator />
            <ScheduleTable schedule={generatedSchedule} />
          </div>
        )}
      </div>
    </main>
  );
}
