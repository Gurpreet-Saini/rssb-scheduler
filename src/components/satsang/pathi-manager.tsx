"use client";

import { useState, useCallback } from "react";
import { Plus, X, UserPlus, Sparkles, Users, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { SatsangSchedule } from "@/lib/excel-parser";
import { toast } from "sonner";

interface PathiManagerProps {
  schedule: SatsangSchedule;
  pathis: string[];
  baalSatsangGhars: string[];
  onPathisChange: (pathis: string[]) => void;
  onBaalSatsangChange: (ghars: string[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function PathiManager({
  schedule,
  pathis,
  baalSatsangGhars,
  onPathisChange,
  onBaalSatsangChange,
  onGenerate,
  isGenerating,
}: PathiManagerProps) {
  const [newPathi, setNewPathi] = useState("");

  const addPathi = useCallback(() => {
    const trimmed = newPathi.trim();
    if (!trimmed) {
      toast.error("Please enter a pathi name");
      return;
    }
    if (pathis.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("This pathi is already in the list");
      return;
    }
    onPathisChange([...pathis, trimmed]);
    setNewPathi("");
    toast.success(`Added: ${trimmed}`);
  }, [newPathi, pathis, onPathisChange]);

  const removePathi = useCallback(
    (name: string) => {
      onPathisChange(pathis.filter((p) => p !== name));
    },
    [pathis, onPathisChange]
  );

  const toggleBaalSatsang = useCallback(
    (gharName: string) => {
      if (baalSatsangGhars.includes(gharName)) {
        onBaalSatsangChange(baalSatsangGhars.filter((g) => g !== gharName));
      } else {
        onBaalSatsangChange([...baalSatsangGhars, gharName]);
      }
    },
    [baalSatsangGhars, onBaalSatsangChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPathi();
      }
    },
    [addPathi]
  );

  // Calculate validation
  // A pathi can only be at ONE place per date (all satsangs at same time).
  // Minimum = max total slots needed on any single date.
  const totalEntries = schedule.ghars.reduce(
    (acc, ghar) => acc + ghar.entries.length, 0
  );
  const vcdEntries = schedule.ghars.reduce(
    (acc, ghar) => acc + ghar.entries.filter((e) => e.nameOfSK === "VCD").length, 0
  );
  const liveEntries = totalEntries - vcdEntries;
  const baalCount = schedule.ghars
    .filter((g) => baalSatsangGhars.includes(g.name))
    .reduce((acc, ghar) => acc + ghar.entries.length, 0);

  // Count total slots needed per date
  const dateSlotCount: Record<string, number> = {};
  const dateGharCount: Record<string, number> = {};
  for (const ghar of schedule.ghars) {
    const isBaal = baalSatsangGhars.includes(ghar.name);
    for (const entry of ghar.entries) {
      if (!entry.date) continue;
      dateGharCount[entry.date] = (dateGharCount[entry.date] || 0) + 1;
      if (entry.nameOfSK === "VCD") {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 2; // B + C
      } else {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 3; // A + B + C
      }
      if (isBaal) {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 1; // D
      }
    }
  }
  const maxSlotsPerDate = Math.max(...Object.values(dateSlotCount), 0);
  const maxGharsPerDate = Math.max(...Object.values(dateGharCount), 0);

  // Each pathi fills only 1 slot per date, so minimum = max slots on busiest date
  const minPathis = maxSlotsPerDate;
  const recommendedPathis = minPathis + 2;
  const isInsufficient = pathis.length > 0 && pathis.length < minPathis;
  const isBelowRecommended = pathis.length >= minPathis && pathis.length < recommendedPathis;

  const totalSlotsA = liveEntries;
  const totalSlotsBC = totalEntries;
  const totalSlotsD = baalCount;
  const totalSlots = totalSlotsA + totalSlotsBC * 2 + totalSlotsD;
  const idealPerPathi = pathis.length > 0 ? Math.ceil(totalSlots / pathis.length) : 0;

  return (
    <div className="space-y-4">
      {/* Validation warnings */}
      {isInsufficient && (
        <div className="flex items-start gap-3 rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20 p-4 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              Cannot Generate — Insufficient Pathis
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
              You have <strong>{pathis.length}</strong> pathi{pathis.length > 1 ? "s" : ""} but need at least{" "}
              <strong>{minPathis}</strong>. All satsangs happen at the same time, so each pathi can only be at one place per date. The busiest date has <strong>{maxSlotsPerDate}</strong> slots across {maxGharsPerDate} ghars. Please add{" "}
              <strong>{minPathis - pathis.length} more</strong> pathi{minPathis - pathis.length > 1 ? "s" : ""} to generate the schedule.
            </p>
          </div>
        </div>
      )}

      {isBelowRecommended && !isInsufficient && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Info className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
              Uneven Distribution Warning
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              You have <strong>{pathis.length}</strong> pathis. Recommended:{" "}
              <strong>{recommendedPathis}+</strong> for well-balanced distribution. With fewer pathis, the same person may appear at multiple ghars on the same date.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: Pathi List */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-amber-600" />
              Pathi List
              <Badge variant="secondary" className="ml-auto text-xs">
                {pathis.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter pathi name..."
                value={newPathi}
                onChange={(e) => setNewPathi(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm"
              />
              <Button
                onClick={addPathi}
                size="sm"
                className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Pathi list - native scroll */}
            <div className="scrollable-panel max-h-[240px]">
              {pathis.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No pathis added yet</p>
                  <p className="text-xs mt-1">
                    Minimum required: {minPathis} (unique pathis per ghar)
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {pathis.map((pathi, i) => (
                    <div
                      key={pathi}
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/30 group hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}.
                        </span>
                        <span className="text-sm font-medium truncate">{pathi}</span>
                      </div>
                      <button
                        onClick={() => removePathi(pathi)}
                        className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all shrink-0"
                      >
                        <X className="h-3.5 w-3.5 text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Slot Info */}
            {pathis.length > 0 && (
              <>
                <Separator />
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    Slot Requirements
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>Slot-A (live only):</span>
                    <span className="text-right font-medium text-foreground">{totalSlotsA} total</span>
                    <span>Slot-B (all):</span>
                    <span className="text-right font-medium text-foreground">{totalSlotsBC} total</span>
                    <span>Slot-C (all):</span>
                    <span className="text-right font-medium text-foreground">{totalSlotsBC} total</span>
                    {baalCount > 0 && (
                      <>
                        <span>Slot-D (Baal Satsang):</span>
                        <span className="text-right font-medium text-foreground">{totalSlotsD} total</span>
                      </>
                    )}
                    <span className="font-semibold text-foreground pt-1 border-t border-blue-200 dark:border-blue-800">
                      Total slots:
                    </span>
                    <span className="text-right font-bold text-foreground pt-1 border-t border-blue-200 dark:border-blue-800">
                      {totalSlots}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground pt-1">
                    ~{idealPerPathi} assignments per pathi across all slots
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Baal Satsang Configuration */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Baal Satsang Settings
              {baalSatsangGhars.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {baalSatsangGhars.length} enabled
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Enable Baal Satsang to add a 4th pathi slot (Pathi-D) to all sessions of that ghar.
            </p>

            {/* Baal Satsang list - native scroll */}
            <div className="scrollable-panel max-h-[240px]">
              <div className="space-y-2">
                {schedule.ghars.map((ghar) => {
                  const isEnabled = baalSatsangGhars.includes(ghar.name);
                  return (
                    <div
                      key={ghar.name}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${
                        isEnabled
                          ? "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20"
                          : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-xs">
                          {ghar.srNo}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{ghar.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ghar.entries.length} sessions
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isEnabled && (
                          <Badge className="text-[9px] px-1.5 py-0 border-0 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
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

            {/* Generate Button */}
            <Separator />
            <Button
              onClick={onGenerate}
              disabled={isInsufficient || isGenerating || pathis.length === 0}
              className={`w-full gap-2 font-medium ${isInsufficient ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : isInsufficient ? (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Cannot Generate — Need {minPathis} Pathis
                </>
              ) : pathis.length === 0 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Add Pathis to Generate
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Schedule
                </>
              )}
            </Button>
            {!isInsufficient && pathis.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Add at least <strong>{minPathis}</strong> pathis to generate ({maxSlotsPerDate} slots on busiest date)
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
