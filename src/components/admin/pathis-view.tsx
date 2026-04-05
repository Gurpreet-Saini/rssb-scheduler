"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCog,
  Plus,
  Trash2,
  Loader2,
  Power,
  PowerOff,
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
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  const handleAddPathi = async () => {
    if (!effectiveCenterId) {
      toast.error("Please select a center first");
      return;
    }
    if (!newPathiName.trim()) {
      toast.error("Please enter a pathi name");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/pathis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPathiName.trim(),
          centerId: effectiveCenterId,
          slots: ["A", "B", "C"],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add pathi");
        return;
      }

      toast.success(`Added: ${newPathiName.trim()}`);
      setNewPathiName("");
      fetchPathis();
    } catch {
      toast.error("Network error");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleSlot = async (pathi: Pathi, slot: string) => {
    const currentSlots = parsePathiSlots(pathi.slots);
    const newSlots = currentSlots.includes(slot)
      ? currentSlots.filter((s) => s !== slot)
      : [...currentSlots, slot];

    if (newSlots.length === 0) {
      toast.error("At least one slot must be enabled");
      return;
    }

    setTogglingId(pathi.id);
    try {
      const res = await fetch(`/api/pathis/${pathi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: newSlots }),
      });

      if (!res.ok) {
        toast.error("Failed to update slots");
        return;
      }

      fetchPathis();
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleActive = async (pathi: Pathi) => {
    setTogglingId(pathi.id);
    try {
      const res = await fetch(`/api/pathis/${pathi.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pathi.isActive }),
      });

      if (!res.ok) {
        toast.error("Failed to update pathi status");
        return;
      }

      toast.success(
        pathi.isActive ? "Pathi deactivated" : "Pathi activated"
      );
      fetchPathis();
    } catch {
      toast.error("Network error");
    } finally {
      setTogglingId(null);
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

  const activePathis = pathis.filter((p) => p.isActive);
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
              placeholder="Enter pathi name..."
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
          {pathis.map((pathi, index) => {
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
                            <button
                              key={slot}
                              onClick={() => toggleSlot(pathi, slot)}
                              disabled={togglingId === pathi.id}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                isEnabled
                                  ? slotColors[slot]
                                  : "text-gray-400 bg-gray-50 border-gray-200 opacity-50"
                              }`}
                              title={`Toggle ${slotLabels[slot]}`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={pathi.isActive}
                        onCheckedChange={() => toggleActive(pathi)}
                        disabled={togglingId === pathi.id}
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
