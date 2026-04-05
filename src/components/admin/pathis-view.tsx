"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCog,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppStore, type Pathi, type Center } from "@/lib/store";
import { toast } from "sonner";

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

function parsePathiSlots(slotsJson: string): string[] {
  try {
    const parsed = JSON.parse(slotsJson);
    return Array.isArray(parsed) ? parsed : ["A", "B", "C"];
  } catch {
    return ["A", "B", "C"];
  }
}

export function PathisView() {
  const user = useAppStore((s) => s.user);
  const centers = useAppStore((s) => s.centers);
  const pathis = useAppStore((s) => s.pathis);
  const setPathis = useAppStore((s) => s.setPathis);
  const selectedCenterId = useAppStore((s) => s.selectedCenterId);
  const setSelectedCenterId = useAppStore((s) => s.setSelectedCenterId);
  const setCenters = useAppStore((s) => s.setCenters);

  const [isLoading, setIsLoading] = useState(false);
  const [newPathiName, setNewPathiName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPathi, setDeletingPathi] = useState<Pathi | null>(null);
  
  const [localPathis, setLocalPathis] = useState<Pathi[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveCenterId = user?.role === "CENTER_ADMIN" ? user.centerId : selectedCenterId;
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const fetchPathis = useCallback(async () => {
    if (!effectiveCenterId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pathis?centerId=${effectiveCenterId}`);
      if (res.ok) {
        const data = await res.json();
        setPathis(data.pathis || []);
      }
    } catch {
      toast.error("Failed to load pathis");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCenterId, setPathis]);

  const fetchCenters = useCallback(async () => {
    try {
      const res = await fetch("/api/centers");
      if (res.ok) {
        const data = await res.json();
        setCenters(data.centers || []);
      }
    } catch {
      // ignore
    }
  }, [setCenters]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  useEffect(() => {
    fetchPathis();
  }, [fetchPathis]);

  useEffect(() => {
    setLocalPathis(pathis);
    setHasUnsavedChanges(false);
  }, [pathis]);

  const handleAddPathi = async () => {
    if (!effectiveCenterId) {
      toast.error("Please select a center first");
      return;
    }
    if (!newPathiName.trim()) {
      toast.error("Please enter a pathi name");
      return;
    }

    const namesToAdd = newPathiName.split(',').map(n => n.trim()).filter(n => n.length > 0);
    if (namesToAdd.length === 0) {
      toast.error("Please enter a valid pathi name");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/pathis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names: namesToAdd,
          centerId: effectiveCenterId,
          slots: ["A", "B", "C"],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const successCount = data.count || namesToAdd.length;
        toast.success(`Added ${successCount} pathi${successCount > 1 ? 's' : ''}`);
        setNewPathiName("");
        fetchPathis();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add pathis");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleSlot = (pathi: Pathi, slot: string) => {
    setLocalPathis(prev => prev.map(p => {
      if (p.id !== pathi.id) return p;
      const currentSlots = parsePathiSlots(p.slots);
      const newSlots = currentSlots.includes(slot)
        ? currentSlots.filter((s) => s !== slot)
        : [...currentSlots, slot];
      return { ...p, slots: JSON.stringify(newSlots) };
    }));
    setHasUnsavedChanges(true);
  };

  const toggleActive = (pathi: Pathi) => {
    setLocalPathis(prev => prev.map(p => {
      if (p.id !== pathi.id) return p;
      return { ...p, isActive: !p.isActive };
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveConfigurations = async () => {
    setIsSaving(true);
    try {
      const changed = localPathis.filter(lp => {
        const op = pathis.find(p => p.id === lp.id);
        return op && (op.slots !== lp.slots || op.isActive !== lp.isActive);
      });

      if (changed.length === 0) {
        toast.info("No changes to save");
        setHasUnsavedChanges(false);
        return;
      }

      const promises = changed.map(p => fetch(`/api/pathis/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: parsePathiSlots(p.slots), isActive: p.isActive }),
      }));

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        toast.error(`Failed to update ${failed.length} pathis`);
      } else {
        toast.success("Configurations saved successfully!");
      }
      fetchPathis();
    } catch {
      toast.error("Network error while saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPathi) return;
    try {
      const res = await fetch(`/api/pathis/${deletingPathi.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Pathi deleted");
      setDeleteDialogOpen(false);
      setDeletingPathi(null);
      fetchPathis();
    } catch {
      toast.error("Network error");
    }
  };

  const activePathis = localPathis.filter((p) => p.isActive);
  const totalSlotsEnabled = activePathis.reduce(
    (acc, p) => acc + parsePathiSlots(p.slots).length,
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            {isSuperAdmin ? "Pathis" : "My Pathis"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage pathis and their eligible slots
          </p>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="sticky top-4 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-900">You have unsaved slot configurations</span>
          </div>
          <Button onClick={handleSaveConfigurations} disabled={isSaving} className="w-full sm:w-auto gap-2 bg-amber-600 hover:bg-amber-700 shrink-0">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      )}

      {/* Center selector for Super Admin */}
      {isSuperAdmin && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Center:</span>
          <Select
            value={effectiveCenterId || ""}
            onValueChange={(val) => setSelectedCenterId(val)}
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
      )}

      {/* Add Pathi */}
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter pathi names (comma separated)..."
              value={newPathiName}
              onChange={(e) => setNewPathiName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPathi()}
              disabled={!effectiveCenterId || isAdding}
              className="h-10 flex-1"
            />
            <Button
              onClick={handleAddPathi}
              disabled={!effectiveCenterId || isAdding}
              className="shrink-0 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {pathis.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-medium">
            {activePathis.length} active
          </Badge>
          <span>·</span>
          <span>{pathis.length} total</span>
          <span>·</span>
          <span>{totalSlotsEnabled} total slots enabled</span>
        </div>
      )}

      {/* Pathi List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !effectiveCenterId ? (
        <div className="text-center py-12">
          <UserCog className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Select a center to view pathis"
              : "No center assigned"}
          </p>
        </div>
      ) : pathis.length === 0 ? (
        <div className="text-center py-12">
          <UserCog className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No pathis yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add pathis above to manage their slot assignments
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localPathis.map((pathi, index) => {
            const slots = parsePathiSlots(pathi.slots);
            return (
              <Card
                key={pathi.id}
                className={`rounded-xl overflow-hidden transition-opacity ${
                  !pathi.isActive ? "opacity-50" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Index */}
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0 font-medium">
                      {index + 1}.
                    </span>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {pathi.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {ALL_SLOTS.map((slot) => {
                          const isEnabled = slots.includes(slot);
                          return (
                            <div
                              key={slot}
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors ${
                                isEnabled
                                  ? slotColors[slot].replace("border-", "border-").replace("bg-", "bg-") 
                                  : "text-gray-400 bg-gray-50 border-gray-200 opacity-60"
                              }`}
                              title={`Toggle ${slotLabels[slot]}`}
                            >
                              <span className="text-xs font-bold w-3 text-center">{slot}</span>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => toggleSlot(pathi, slot)}
                                disabled={isSaving}
                                className="scale-75 origin-center -mx-1"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={pathi.isActive}
                        onCheckedChange={() => toggleActive(pathi)}
                        disabled={isSaving}
                        title={pathi.isActive ? "Deactivate" : "Activate"}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setDeletingPathi(pathi);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info */}
      {pathis.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 leading-relaxed space-y-0.5">
            <p className="font-semibold">Slot Assignment</p>
            <p>
              Click slot badges to enable/disable which slots this pathi can be
              assigned to. Pathis are only assigned to their enabled slots when
              generating schedules.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pathi</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingPathi?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
