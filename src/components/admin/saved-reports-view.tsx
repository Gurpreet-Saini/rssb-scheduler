"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Trash2,
  Loader2,
  Eye,
  Download,
  Calendar,
  Link as LinkIcon,
  Copy,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore, type SavedSchedule } from "@/lib/store";
import { toast } from "sonner";

export function SavedReportsView() {
  const user = useAppStore((s) => s.user);
  const centers = useAppStore((s) => s.centers);
  const selectedCenterId = useAppStore((s) => s.selectedCenterId);
  const setSelectedCenterId = useAppStore((s) => s.setSelectedCenterId);
  const setSavedSchedules = useAppStore((s) => s.setSavedSchedules);
  const setGeneratedSchedule = useAppStore((s) => s.setGeneratedSchedule);
  const setBaalSatsangGhars = useAppStore((s) => s.setBaalSatsangGhars);
  const setScheduleData = useAppStore((s) => s.setScheduleData);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setCenters = useAppStore((s) => s.setCenters);

  const savedSchedules = useAppStore((s) => s.savedSchedules);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<SavedSchedule | null>(null);
  const [filterCenterId, setFilterCenterId] = useState<string>(
    selectedCenterId || ""
  );
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const effectiveFilter = isSuperAdmin ? filterCenterId : selectedCenterId;

  const fetchSchedules = useCallback(async () => {
    const cid = effectiveFilter;
    if (!cid) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/schedules/saved?centerId=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setSavedSchedules(data.schedules || []);
      }
    } catch {
      toast.error("Failed to load saved reports");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveFilter, setSavedSchedules]);

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
    fetchSchedules();
  }, [fetchSchedules]);

  const handleLoad = async (schedule: SavedSchedule) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/schedules/saved/${schedule.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const { schedule: fullSchedule } = await res.json();

      // Parse the saved schedule data
      const scheduleData = JSON.parse(fullSchedule.scheduleData);
      setGeneratedSchedule(scheduleData);
      setScheduleData(scheduleData.originalSchedule || null);

      // Parse pathi config for baal satsang ghars
      try {
        const pathiConfig = JSON.parse(fullSchedule.pathiConfig);
        if (pathiConfig.baalSatsangGhars) {
          setBaalSatsangGhars(pathiConfig.baalSatsangGhars);
        }
      } catch {
        // ignore
      }

      toast.success(`Loaded: ${schedule.name}`);
      setCurrentView("schedule");
    } catch {
      toast.error("Failed to load schedule data. It may be corrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    try {
      const res = await fetch(`/api/schedules/saved/${deletingSchedule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success("Report deleted");
      setDeleteDialogOpen(false);
      setDeletingSchedule(null);
      fetchSchedules();
    } catch {
      toast.error("Network error");
    }
  };

  const handleExportJSON = async (schedule: SavedSchedule) => {
    setIsExporting(schedule.id);
    try {
      const res = await fetch(`/api/schedules/saved/${schedule.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const { schedule: fullSchedule } = await res.json();

      const data = JSON.parse(fullSchedule.scheduleData);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schedule.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON downloaded");
    } catch {
      toast.error("Failed to export");
    } finally {
      setIsExporting(null);
    }
  };

  const handleShareLink = async (schedule: SavedSchedule) => {
    try {
      const isCurrentlyPublic = schedule.isPublic;
      const res = await fetch(`/api/schedules/saved/${schedule.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isCurrentlyPublic }),
      });
      if (!res.ok) throw new Error("Failed to update share link");
      const data = await res.json();
      
      // Update local state instead of refetching
      setSavedSchedules(savedSchedules.map(s => 
        s.id === schedule.id ? { ...s, isPublic: data.isPublic, shareToken: data.shareToken } : s
      ));
      
      if (data.isPublic && data.shareToken) {
        const url = `${window.location.origin}/shared/${data.shareToken}`;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard!");
      } else {
        toast.success("Share link revoked.");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Saved Reports</h2>
          <p className="text-sm text-muted-foreground">
            View and manage your saved schedule reports
          </p>
        </div>
        <Button
          onClick={() => setCurrentView("schedule")}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          size="sm"
        >
          Generate New
        </Button>
      </div>

      {/* Center filter for Super Admin */}
      {isSuperAdmin && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Filter by Center:
          </span>
          <Select value={filterCenterId} onValueChange={setFilterCenterId}>
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

      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !effectiveFilter ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {isSuperAdmin
                  ? "Select a center to view reports"
                  : "No center assigned"}
              </p>
            </div>
          ) : savedSchedules.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No saved reports yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate a schedule and save it to see it here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs">Report Name</TableHead>
                  {!isSuperAdmin && (
                    <TableHead className="text-xs">Saved By</TableHead>
                  )}
                  <TableHead className="text-xs">Date Saved</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedSchedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                          <Calendar className="h-3.5 w-3.5 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium">{s.name}</span>
                        {s.isPublic && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0 h-4 border-0">
                            Shared
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {!isSuperAdmin && (
                      <TableCell className="text-xs text-muted-foreground py-3">
                        {s.user?.displayName || "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground py-3">
                      {formatDate(s.createdAt)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          onClick={() => handleLoad(s)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleExportJSON(s)}
                          disabled={isExporting === s.id}
                        >
                          {isExporting === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${s.isPublic ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-gray-400 hover:text-blue-600'}`}
                          title={s.isPublic ? "Copy active share link" : "Generate public link"}
                          onClick={async () => {
                            if (s.isPublic && s.shareToken) {
                              const url = `${window.location.origin}/shared/${s.shareToken}`;
                              await navigator.clipboard.writeText(url);
                              toast.success("Share link copied!");
                            } else {
                              handleShareLink(s);
                            }
                          }}
                        >
                          {s.isPublic ? <Copy className="h-3.5 w-3.5" /> : <LinkIcon className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setDeletingSchedule(s);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingSchedule?.name}</strong>? This action cannot be
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
