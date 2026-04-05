"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  AlertTriangle, Save, Download, RotateCcw, Sparkles, Loader2, UserCog,
  ArrowRight, MapPin, Ban, Check,
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
import { useAppStore, type Pathi } from "@/lib/store";
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

/** Helper: get the day of week from a date string like "03 May 2026" or "03-May-2026" */
function getDayOfWeek(dateStr: string): string {
  if (!dateStr) return "";
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const parts = dateStr.trim().split(/[\s-]+/);
  let day: number, month: number, year: number = 2026;

  if (parts.length === 2) {
    if (/^\d+$/.test(parts[0]) && months[parts[1]] !== undefined) {
      day = parseInt(parts[0], 10);
      month = months[parts[1]];
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]] !== undefined) {
      day = parseInt(parts[1], 10);
      month = months[parts[0]];
    } else return "";
  } else if (parts.length === 3) {
    if (/^\d+$/.test(parts[0]) && months[parts[1]] !== undefined) {
      day = parseInt(parts[0], 10);
      month = months[parts[1]];
      year = parseInt(parts[2], 10) || 2026;
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]] !== undefined) {
      day = parseInt(parts[1], 10);
      month = months[parts[0]];
      year = parseInt(parts[2], 10) || 2026;
    } else return "";
  } else return "";

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? "" : days[d.getDay()];
}

/** Helper: parse date string to YYYY-MM-DD for sorting */
function parseDateSortable(dateStr: string): string {
  if (!dateStr) return "";
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.trim().split(/[\s-]+/);
  if (parts.length === 2) {
    let day: string, month: string;
    if (/^\d+$/.test(parts[0]) && months[parts[1]]) {
      day = parts[0].padStart(2, "0");
      month = months[parts[1]];
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]]) {
      day = parts[1].padStart(2, "0");
      month = months[parts[0]];
    } else return dateStr;
    return `2026-${month}-${day}`;
  }
  if (parts.length === 3) {
    let day: string, month: string;
    if (/^\d+$/.test(parts[0]) && months[parts[1]]) {
      day = parts[0].padStart(2, "0");
      month = months[parts[1]];
    } else if (/^\d+$/.test(parts[1]) && months[parts[0]]) {
      day = parts[1].padStart(2, "0");
      month = months[parts[0]];
    } else return dateStr;
    return `2026-${month}-${day}`;
  }
  return dateStr;
}

const ALL_SLOTS = ["A", "B", "C", "D"] as const;
const slotLabels: Record<string, string> = {
  A: "Slot A (Live)",
  B: "Slot B",
  C: "Slot C",
  D: "Slot D (Baal)",
};
const slotColors: Record<string, string> = {
  A: "text-sky-600 bg-sky-50 border-sky-200",
  B: "text-emerald-600 bg-emerald-50 border-emerald-200",
  C: "text-amber-600 bg-amber-50 border-amber-200",
  D: "text-purple-600 bg-purple-50 border-purple-200",
};
const slotColorsInactive: Record<string, string> = {
  A: "text-gray-300 bg-gray-50 border-gray-200 opacity-50",
  B: "text-gray-300 bg-gray-50 border-gray-200 opacity-50",
  C: "text-gray-300 bg-gray-50 border-gray-200 opacity-50",
  D: "text-gray-300 bg-gray-50 border-gray-200 opacity-50",
};

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

  // Slot toggle state for wizard step 2
  const [wizardSlotToggles, setWizardSlotToggles] = useState<Record<string, boolean>>({
    A: true,
    B: true,
    C: true,
    D: false,
  });
  // Local pathi slot overrides for the wizard (only active slots get filtered)
  const [pathiSlotOverrides, setPathiSlotOverrides] = useState<Record<string, string[]>>({});
  // Per-pathi per-ghar exclusion: Record<pathiName, string[]> of excluded ghar names
  const [pathiGharExclusions, setPathiGharExclusions] = useState<Record<string, string[]>>({});

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
    const cid = user?.role === "CENTER_ADMIN" ? user.centerId : (effectiveCenterId || selectedCenterId);
    if (cid) {
      fetch(`/api/pathis?centerId=${cid}`)
        .then((res) => res.json())
        .then((data) => setPathis(data.pathis || []))
        .catch(() => {});
    }
  }, [effectiveCenterId, selectedCenterId, setPathis, user]);

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

  // Filter pathis by wizard slot toggles
  const filteredPathis = activePathis.filter((p) => {
    const pSlots = parsePathiSlots(p.slots);
    // Check if this pathi has at least one slot that is enabled in the wizard toggles
    return pSlots.some((s) => wizardSlotToggles[s]);
  });

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

  // Toggle individual pathi's slot in the wizard
  const handleTogglePathiSlot = useCallback((pathiId: string, slot: string) => {
    setPathiSlotOverrides((prev) => {
      const pathi = activePathis.find((p) => p.id === pathiId);
      if (!pathi) return prev;
      const currentSlots = parsePathiSlots(pathi.slots);
      const overrides = prev[pathiId] || currentSlots;
      const newSlots = overrides.includes(slot)
        ? overrides.filter((s) => s !== slot)
        : [...overrides, slot];

      if (newSlots.length === 0) return prev; // Don't allow empty
      return { ...prev, [pathiId]: newSlots };
    });
  }, [activePathis]);

  // Toggle ghar exclusion for a pathi
  const handleToggleGharExclusion = useCallback((pathiName: string, gharName: string) => {
    setPathiGharExclusions((prev) => {
      const current = prev[pathiName] || [];
      const isExcluded = current.includes(gharName);
      if (isExcluded) {
        const updated = current.filter((g) => g !== gharName);
        if (updated.length === 0) {
          const { [pathiName]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [pathiName]: updated };
      } else {
        return { ...prev, [pathiName]: [...current, gharName] };
      }
    });
  }, []);

  // Check if a pathi is excluded from a ghar
  const isPathiExcludedFromGhar = useCallback((pathiName: string, gharName: string): boolean => {
    return (pathiGharExclusions[pathiName] || []).includes(gharName);
  }, [pathiGharExclusions]);

  // Get effective slots for a pathi (considering overrides)
  const getEffectiveSlots = useCallback((pathi: Pathi): string[] => {
    const baseSlots = parsePathiSlots(pathi.slots);
    const overrides = pathiSlotOverrides[pathi.id];
    return overrides || baseSlots;
  }, [pathiSlotOverrides]);

  const handleGenerate = useCallback(async () => {
    if (!schedule) return;
    if (filteredPathis.length === 0) {
      toast.error("No active pathis with enabled slots. Please adjust slot toggles or add pathis.");
      return;
    }

    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      // Build pathi list filtered by enabled wizard slots
      const pathiNames = filteredPathis.map((p) => p.name);

      // Build pathiSlots map from effective slots
      const pathiSlots: Record<string, string[]> = {};
      for (const p of filteredPathis) {
        const effectiveSlots = getEffectiveSlots(p);
        // Only include slots that are enabled in wizard toggles
        pathiSlots[p.name] = effectiveSlots.filter((s) => wizardSlotToggles[s]);
      }

      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleData: schedule,
          pathis: pathiNames,
          baalSatsangGhars,
          pathiSlots,
          centerId: effectiveCenterId,
          pathiExcludedGhars: pathiGharExclusions,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to generate schedule", { duration: 6000 });
        return;
      }

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
  }, [schedule, filteredPathis, baalSatsangGhars, wizardSlotToggles, getEffectiveSlots, pathiGharExclusions, setGeneratedSchedule, setScheduleData, setBaalSatsangGhars]);

  const handleRegenerate = useCallback(async () => {
    if (!schedule) return;
    setIsGenerating(true);
    setScheduleWarning(null);
    try {
      const pathiNames = filteredPathis.map((p) => p.name);
      const pathiSlots: Record<string, string[]> = {};
      for (const p of filteredPathis) {
        const effectiveSlots = getEffectiveSlots(p);
        pathiSlots[p.name] = effectiveSlots.filter((s) => wizardSlotToggles[s]);
      }
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleData: schedule, pathis: pathiNames, baalSatsangGhars, pathiSlots, pathiExcludedGhars: pathiGharExclusions }),
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
  }, [schedule, filteredPathis, baalSatsangGhars, wizardSlotToggles, getEffectiveSlots, pathiGharExclusions, setGeneratedSchedule]);

  const handleSaveReport = async () => {
    if (!generatedSchedule || !reportName.trim()) return;
    const cid = user?.role === "CENTER_ADMIN" ? user.centerId : (effectiveCenterId || selectedCenterId);
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
            pathis: filteredPathis.map((p) => p.name),
            baalSatsangGhars,
            pathiSlots: Object.fromEntries(
              filteredPathis.map((p) => [
                p.name,
                getEffectiveSlots(p).filter((s) => wizardSlotToggles[s]),
              ])
            ),
            pathiExcludedGhars: pathiGharExclusions,
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
    setPathiSlotOverrides({});
    setPathiGharExclusions({});
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

  // ===== Per-Pathi CSV Download =====
  const handleDownloadPathiList = useCallback(() => {
    if (!generatedSchedule) return;

    // Collect all unique pathi names from the schedule
    const pathiNameSet = new Set<string>();
    for (const e of generatedSchedule.entries) {
      if (e.pathiA && e.pathiA !== "N/A") pathiNameSet.add(e.pathiA);
      if (e.pathiB) pathiNameSet.add(e.pathiB);
      if (e.pathiC) pathiNameSet.add(e.pathiC);
      if (e.pathiD) pathiNameSet.add(e.pathiD);
    }
    const allPathiNames = Array.from(pathiNameSet).sort();

    // For each pathi, build a list of assignments sorted by date
    function csvEscape(s: string): string {
      if (s.includes(",") || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }

    // Generate CSV for each pathi
    for (const pathiName of allPathiNames) {
      const rows: string[] = [];
      rows.push("Pathi Name,Place,Date,Day,Time,Slot");
      rows.push(`${csvEscape(pathiName)},,,,,`);

      const assignments: Array<{
        place: string;
        date: string;
        day: string;
        time: string;
        slot: string;
      }> = [];

      for (const e of generatedSchedule.entries) {
        const day = getDayOfWeek(e.entry.date);
        const time = e.entry.time || "";
        if (e.pathiA === pathiName) {
          assignments.push({ place: e.gharName, date: e.entry.date, day, time, slot: "A" });
        }
        if (e.pathiB === pathiName) {
          assignments.push({ place: e.gharName, date: e.entry.date, day, time, slot: "B" });
        }
        if (e.pathiC === pathiName) {
          assignments.push({ place: e.gharName, date: e.entry.date, day, time, slot: "C" });
        }
        if (e.pathiD === pathiName) {
          assignments.push({ place: e.gharName, date: e.entry.date, day, time, slot: "D" });
        }
      }

      // Sort by date
      assignments.sort((a, b) => parseDateSortable(a.date).localeCompare(parseDateSortable(b.date)));

      for (const a of assignments) {
        rows.push("" + "," + csvEscape(a.place) + "," + csvEscape(a.date) + "," + a.day + "," + csvEscape(a.time) + "," + a.slot);
      }

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pathi_${pathiName.replace(/\s+/g, "_")}_schedule.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    toast.success(`Downloaded ${allPathiNames.length} pathi schedule files`);
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

  // Global slot toggle: enable/disable a slot for ALL pathis in the wizard
  const handleGlobalSlotToggle = useCallback((slot: string) => {
    setWizardSlotToggles((prev) => ({
      ...prev,
      [slot]: !prev[slot],
    }));
  }, []);

  const enabledSlotCount = Object.values(wizardSlotToggles).filter(Boolean).length;

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
                <div className="scrollable-panel max-h-[600px] space-y-4 pr-1">
                  {schedule.ghars.map((ghar) => (
                    <SatsangGharCard key={ghar.srNo} ghar={ghar} />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => {
                  setSchedule(null);
                  toast.info("File cleared. Upload a new one.");
                }} className="gap-2 text-muted-foreground">
                  <RotateCcw className="h-4 w-4" /> Clear & Re-upload
                </Button>
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
              Review pathis from your center, toggle slots, and configure Baal Satsang
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

          {/* Global Slot Toggle Bar */}
          <Card className="rounded-xl overflow-hidden border-2 border-dashed border-gray-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-600" />
                  Enable Assignment Slots
                </div>
                <Badge variant="secondary" className="sm:ml-auto text-xs w-fit">
                  {enabledSlotCount} of {ALL_SLOTS.length} active
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Toggle slots to enable/disable them for the schedule generation. Disabled slots will not have pathi assignments.
              </p>
              <div className="flex flex-wrap gap-3">
                {ALL_SLOTS.map((slot) => {
                  const isEnabled = wizardSlotToggles[slot];
                  return (
                    <div
                      key={slot}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleGlobalSlotToggle(slot)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGlobalSlotToggle(slot); }}}
                      className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer select-none ${
                        isEnabled
                          ? `${slotColors[slot]} border-current shadow-sm scale-[1.02]`
                          : `${slotColorsInactive[slot]} border-current`
                      }`}
                    >
                      <Switch
                        checked={isEnabled}
                        className="pointer-events-none"
                      />
                      <span>{slotLabels[slot]}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Pathi list from DB with per-pathi slot toggles */}
            <Card className="rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-amber-600" />
                  Pathis
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {filteredPathis.length} / {activePathis.length} active
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
                      const effectiveSlots = getEffectiveSlots(pathi);
                      const isEnabled = effectiveSlots.some((s) => wizardSlotToggles[s]);
                      return (
                        <div
                          key={pathi.id}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                            isEnabled
                              ? "bg-gray-50 dark:bg-gray-900/30"
                              : "bg-gray-100/50 dark:bg-gray-900/10 opacity-50"
                          }`}
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
                            {ALL_SLOTS.map((slot) => {
                              const hasSlot = effectiveSlots.includes(slot);
                              const globalEnabled = wizardSlotToggles[slot];
                              return (
                                <span
                                  key={slot}
                                  className={`inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-bold ${
                                    hasSlot && globalEnabled
                                      ? slotColors[slot]
                                      : slotColorsInactive[slot]
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
                      Grayed out = disabled globally or for that pathi.
                      Manage individual pathi slots in the Pathis section.
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
                  disabled={isGenerating || filteredPathis.length === 0 || enabledSlotCount === 0}
                  className={`w-full gap-2 font-medium ${
                    filteredPathis.length === 0 || enabledSlotCount === 0
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
                  ) : filteredPathis.length === 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Add Pathis First
                    </>
                  ) : enabledSlotCount === 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4" />
                      Enable at Least One Slot
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

          {/* Pathi-Center (Ghar) Exclusions */}
          {schedule && schedule.ghars.length > 0 && filteredPathis.length > 0 && (
            <Card className="rounded-xl overflow-hidden border-2 border-dashed border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Pathi Place Assignments
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {Object.keys(pathiGharExclusions).length} exclusion{Object.keys(pathiGharExclusions).length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-xs text-muted-foreground mb-3">
                  Toggle OFF to exclude a pathi from a specific place. Excluded pathis will never be assigned to that place.
                  For example: toggle OFF Place D for Ram — he will only go to A, B, C.
                </p>
                <div className="scrollable-panel max-h-[400px] overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-gray-950 z-10">
                      <tr>
                        <th className="text-left py-2 px-2 font-semibold text-muted-foreground border-b min-w-[120px] sticky left-0 bg-white dark:bg-gray-950">
                          Pathi
                        </th>
                        {schedule.ghars.map((ghar) => (
                          <th
                            key={ghar.name}
                            className="py-2 px-1 font-semibold text-muted-foreground border-b text-center min-w-[60px]"
                            title={ghar.name}
                          >
                            <span className="block max-w-[70px] truncate" title={ghar.name}>
                              {ghar.name.length > 10 ? ghar.name.substring(0, 9) + "…" : ghar.name}
                            </span>
                          </th>
                        ))}
                        <th className="py-2 px-2 font-semibold text-muted-foreground border-b text-center min-w-[40px]">
                          Avail
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPathis.map((pathi) => {
                        const excludedCount = (pathiGharExclusions[pathi.name] || []).length;
                        const availCount = schedule.ghars.length - excludedCount;
                        return (
                          <tr key={pathi.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-1.5 px-2 font-medium sticky left-0 bg-white dark:bg-gray-950 whitespace-nowrap">
                              {pathi.name}
                            </td>
                            {schedule.ghars.map((ghar) => {
                              const excluded = isPathiExcludedFromGhar(pathi.name, ghar.name);
                              return (
                                <td key={ghar.name} className="py-1.5 px-0.5 text-center">
                                  <button
                                    onClick={() => handleToggleGharExclusion(pathi.name, ghar.name)}
                                    className={`inline-flex items-center justify-center h-6 w-6 rounded-md transition-all text-[10px] font-bold ${
                                      excluded
                                        ? "bg-red-100 text-red-500 border border-red-200 hover:bg-red-200"
                                        : "bg-emerald-100 text-emerald-600 border border-emerald-200 hover:bg-emerald-200"
                                    }`}
                                    title={`${pathi.name} → ${ghar.name}: ${excluded ? "EXCLUDED" : "Allowed"}`}
                                  >
                                    {excluded ? <Ban className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 text-center">
                              <span className={`inline-flex items-center justify-center h-6 min-w-[24px] rounded-md text-[10px] font-bold ${
                                availCount === 0
                                  ? "bg-red-100 text-red-600"
                                  : availCount < schedule.ghars.length
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-50 text-emerald-600"
                              }`}>
                                {availCount}/{schedule.ghars.length}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-emerald-100 text-emerald-600"><Check className="h-2.5 w-2.5" /></span>
                      Allowed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-red-100 text-red-500"><Ban className="h-2.5 w-2.5" /></span>
                      Excluded
                    </span>
                  </div>
                  {Object.keys(pathiGharExclusions).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[11px] text-muted-foreground h-7"
                      onClick={() => setPathiGharExclusions({})}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset All Exclusions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Upload
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
                onClick={handleDownloadPathiList}
                className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                title="Download per-pathi schedule lists sorted by date"
              >
                <Download className="h-3.5 w-3.5" />
                Pathi Lists
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
          <Separator />
          <div className="flex justify-between">
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Configure
            </Button>
          </div>
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
