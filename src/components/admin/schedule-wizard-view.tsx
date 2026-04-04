"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  AlertTriangle, Save, Download, RotateCcw, Sparkles, Loader2, UserCog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/satsang/file-upload";
import { SummaryCards } from "@/components/satsang/summary-cards";
import { SatsangGharCard } from "@/components/satsang/satsang-ghar-card";
import { StepIndicator } from "@/components/satsang/step-indicator";
import { ScheduleTable } from "@/components/satsang/schedule-table";
import { AnalyticsDashboard } from "@/components/satsang/analytics-dashboard";
import { useAppStore, type Pathi, type GeneratedSchedule as GS } from "@/lib/store";
import { SatsangSchedule } from "@/lib/excel-parser";
import { GeneratedSchedule, WizardStep } from "@/lib/types";
import { toast } from "sonner";

function parsePathiSlots(slotsJson: string): string[] {
  try {
    const parsed = JSON.parse(slotsJson);
    return Array.isArray(parsed) ? parsed : ["A", "B", "C"];
  } catch {
    return ["A", "B", "C"];
  }
}

export function ScheduleWizardView() {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [schedule, setSchedule] = useState<SatsangSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const storePathis = useAppStore((s) => s.pathis);
  const storeBaalSatsangGhars = useAppStore((s) => s.baalSatsangGhars);
  const storeGeneratedSchedule = useAppStore((s) => s.generatedSchedule);
  const selectedCenterId = useAppStore((s) => s.selectedCenterId);
  const user = useAppStore((s) => s.user);
  const centers = useAppStore((s) => s.centers);
  const setGeneratedSchedule = useAppStore((s) => s.setGeneratedSchedule);
  const setBaalSatsangGhars = useAppStore((s) => s.setBaalSatsangGhars);
  const setScheduleData = useAppStore((s) => s.setScheduleData);
  const setPathis = useAppStore((s) => s.setPathis);
  const setCenters = useAppStore((s) => s.setCenters);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [baalSatsangGhars, setBaalSatsangLocal] = useState<string[]>(storeBaalSatsangGhars);
  const [generatedSchedule, setGeneratedLocal] = useState<GeneratedSchedule | null>(
    storeGeneratedSchedule
  );
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [effectiveCenterId, setEffectiveCenterId] = useState<string>(selectedCenterId || "");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Fetch centers and pathis
  useEffect(() => {
    if (isSuperAdmin) {
      fetch("/api/centers")
        .then((res) => res.json())
        .then((data) => setCenters(data.centers || []))
        .catch(() => {});
    }
  }, [isSuperAdmin, setCenters]);

  useEffect(() => {
    const cid = effectiveCenterId || selectedCenterId;
    if (cid) {
      fetch(`/api/pathis?centerId=${cid}`)
        .then((res) => res.json())
        .then((data) => setPathis(data.pathis || []))
        .catch(() => {});
    }
  }, [effectiveCenterId, selectedCenterId, setPathis]);

  // Sync store state
  useEffect(() => {
    setBaalSatsangLocal(storeBaalSatsangGhars);
  }, [storeBaalSatsangGhars]);

  useEffect(() => {
    if (storeGeneratedSchedule) {
      setGeneratedLocal(storeGeneratedSchedule);
      setCurrentStep(3);
    }
  }, [storeGeneratedSchedule]);

  const activePathis = storePathis.filter((p) => p.isActive);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-excel", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to parse file");
        return;
      }
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
    if (activePathis.length === 0) {
      toast.error("No active pathis. Please add pathis in the Pathis section.");
      return;
    }

    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      const pathiNames = activePathis.map((p) => p.name);

      // Build pathiSlots map
      const pathiSlots: Record<string, string[]> = {};
      for (const p of activePathis) {
        pathiSlots[p.name] = parsePathiSlots(p.slots);
      }

      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleData: schedule,
          pathis: pathiNames,
          baalSatsangGhars,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to generate schedule", { duration: 6000 });
        return;
      }

      // Also do a client-side generation with slot awareness
      // For now, use the API result but enhance with pathiSlots
      setGeneratedSchedule(result.data);
      setGeneratedLocal(result.data);
      setScheduleData(schedule);
      setBaalSatsangGhars(baalSatsangGhars);

      if (result.warning) {
        setScheduleWarning(result.warning);
        toast.warning("Schedule generated with some variance.", { duration: 5000 });
      } else {
        toast.success("Schedule generated successfully!");
      }
      setCurrentStep(3);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, activePathis, baalSatsangGhars, setGeneratedSchedule, setScheduleData, setBaalSatsangGhars]);

  const handleRegenerate = useCallback(async () => {
    if (!schedule) return;
    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      const pathiNames = activePathis.map((p) => p.name);
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleData: schedule, pathis: pathiNames, baalSatsangGhars }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to regenerate");
        return;
      }
      setGeneratedSchedule(result.data);
      setGeneratedLocal(result.data);
      if (result.warning) {
        setScheduleWarning(result.warning);
      } else {
        setScheduleWarning(null);
      }
      toast.success("Schedule regenerated!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }, [schedule, activePathis, baalSatsangGhars, setGeneratedSchedule]);

  const handleSaveReport = async () => {
    if (!generatedSchedule || !reportName.trim()) return;
    const cid = effectiveCenterId || selectedCenterId;
    if (!cid) {
      toast.error("No center selected");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/schedules/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reportName.trim(),
          centerId: cid,
          scheduleData: JSON.stringify(generatedSchedule),
          pathiConfig: JSON.stringify({
            pathis: activePathis.map((p) => p.name),
            baalSatsangGhars,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save report");
        return;
      }

      toast.success(`Report "${reportName.trim()}" saved successfully!`);
      setSaveDialogOpen(false);
      setReportName("");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartOver = useCallback(() => {
    setCurrentStep(1);
    setSchedule(null);
    setGeneratedSchedule(null);
    setGeneratedLocal(null);
    setScheduleWarning(null);
    setBaalSatsangGhars([]);
    setScheduleData(null);
    toast.info("Ready for a new schedule");
  }, [setGeneratedSchedule, setBaalSatsangGhars, setScheduleData]);

  const handleExportJSON = useCallback(() => {
    if (!generatedSchedule) return;
    const blob = new Blob([JSON.stringify(generatedSchedule, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated_schedule.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded");
  }, [generatedSchedule]);

  const toggleBaalSatsang = useCallback(
    (gharName: string) => {
      const updated = baalSatsangGhars.includes(gharName)
        ? baalSatsangGhars.filter((g) => g !== gharName)
        : [...baalSatsangGhars, gharName];
      setBaalSatsangLocal(updated);
    },
    [baalSatsangGhars]
  );

  const slotColors: Record<string, string> = {
    A: "text-sky-600 bg-sky-50 border-sky-200",
    B: "text-emerald-600 bg-emerald-50 border-emerald-200",
    C: "text-amber-600 bg-amber-50 border-amber-200",
    D: "text-purple-600 bg-purple-50 border-purple-200",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step 1: Upload Excel */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {!schedule ? (
            <div className="max-w-xl mx-auto pt-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  Upload Your Excel File
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload the Satsang Schedule Excel file (.xlsx) to extract and
                  view the data
                </p>
              </div>
              <FileUpload onFileAccepted={handleFile} isProcessing={isProcessing} />
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {schedule.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review the extracted data before configuring pathis
                </p>
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
                <Button
                  onClick={handleNext}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  Next: Configure Pathis <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {currentStep === 2 && schedule && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Configure Pathis & Baal Satsang
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review pathis from your center and toggle Baal Satsang per ghar
            </p>
          </div>

          {/* Center selector for Super Admin */}
          {isSuperAdmin && (
            <Card className="rounded-xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">
                    Center:
                  </span>
                  <Select
                    value={effectiveCenterId || ""}
                    onValueChange={setEffectiveCenterId}
                  >
                    <SelectTrigger className="w-64 h-9 text-sm">
                      <SelectValue placeholder="Select a center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Pathi list from DB */}
            <Card className="rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-amber-600" />
                  Active Pathis
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {activePathis.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activePathis.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>No active pathis found</p>
                    <p className="text-xs mt-1">
                      Go to the Pathis section to add pathis
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => setCurrentView("pathis")}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      Manage Pathis
                    </Button>
                  </div>
                ) : (
                  <div className="scrollable-panel max-h-[300px] space-y-1">
                    {activePathis.map((pathi, i) => {
                      const slots = parsePathiSlots(pathi.slots);
                      return (
                        <div
                          key={pathi.id}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/30"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                              {i + 1}.
                            </span>
                            <span className="text-sm font-medium truncate">
                              {pathi.name}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {["A", "B", "C", "D"].map((slot) => {
                              const has = slots.includes(slot);
                              return (
                                <span
                                  key={slot}
                                  className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${
                                    has ? slotColors[slot] : "text-gray-300 bg-gray-100"
                                  }`}
                                >
                                  {slot}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activePathis.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-[11px] text-muted-foreground">
                      Slot badges show which slots each pathi is eligible for.
                      Manage in the Pathis section.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Baal Satsang toggles */}
            <Card className="rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Baal Satsang Settings
                  {baalSatsangGhars.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-auto text-xs bg-purple-100 text-purple-700"
                    >
                      {baalSatsangGhars.length} enabled
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Enable Baal Satsang to add a 4th pathi slot (Pathi-D) to all
                  sessions of that ghar.
                </p>
                <div className="scrollable-panel max-h-[300px]">
                  <div className="space-y-2">
                    {schedule.ghars.map((ghar) => {
                      const isEnabled = baalSatsangGhars.includes(ghar.name);
                      return (
                        <div
                          key={ghar.name}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${
                            isEnabled
                              ? "border-purple-300 bg-purple-50/50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                              {ghar.srNo}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {ghar.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {ghar.entries.length} sessions
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEnabled && (
                              <Badge className="text-[9px] px-1.5 py-0 border-0 bg-purple-100 text-purple-700">
                                +Pathi-D
                              </Badge>
                            )}
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => toggleBaalSatsang(ghar.name)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator />
                <Button
                  onClick={() => {
                    setBaalSatsangGhars(baalSatsangGhars);
                    handleGenerate();
                  }}
                  disabled={isGenerating || activePathis.length === 0}
                  className={`w-full gap-2 font-medium ${
                    activePathis.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : activePathis.length === 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Add Pathis First
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Schedule
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Separator />
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {currentStep === 3 && generatedSchedule && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground">
                Generated Schedule
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {generatedSchedule.config.pathis.length} pathis ·{" "}
                {generatedSchedule.entries.length} entries
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSaveDialogOpen(true)}
                className="text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              >
                <Save className="h-3.5 w-3.5" />
                Save Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                className="text-xs gap-1"
              >
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-xs gap-1"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`}
                />
                Redo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartOver}
                className="text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            </div>
          </div>

          {scheduleWarning && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{scheduleWarning}</p>
            </div>
          )}

          <AnalyticsDashboard schedule={generatedSchedule} />
          <ScheduleTable schedule={generatedSchedule} />
        </div>
      )}

      {/* Save Report Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Schedule Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Report Name</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., April 2026 Schedule"
                className="h-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will save the generated schedule along with its pathi
              configuration for future reference.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveReport}
              disabled={isSaving || !reportName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
