"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  UserCog,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useAppStore, type Center } from "@/lib/store";
import { toast } from "sonner";

export function CentersView() {
  const centers = useAppStore((s) => s.centers);
  const setCenters = useAppStore((s) => s.setCenters);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCenter, setDeletingCenter] = useState<Center | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("C");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCenters = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/centers");
      if (res.ok) {
        const data = await res.json();
        setCenters(data.centers || []);
      }
    } catch {
      toast.error("Failed to load centers");
    } finally {
      setIsLoading(false);
    }
  }, [setCenters]);

  useEffect(() => {
    fetchCenters();
  }, [fetchCenters]);

  const openCreate = () => {
    setEditingCenter(null);
    setFormName("");
    setFormCategory("C");
    setDialogOpen(true);
  };

  const openEdit = (center: Center) => {
    setEditingCenter(center);
    setFormName(center.name);
    setFormCategory(center.category);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Center name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingCenter
        ? `/api/centers/${editingCenter.id}`
        : "/api/centers";
      const method = editingCenter ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), category: formCategory }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save center");
        return;
      }

      toast.success(
        editingCenter
          ? "Center updated successfully"
          : "Center created successfully"
      );
      setDialogOpen(false);
      fetchCenters();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCenter) return;
    try {
      const res = await fetch(`/api/centers/${deletingCenter.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete center");
        return;
      }
      toast.success("Center deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingCenter(null);
      fetchCenters();
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const categoryBadge = (cat: string) => {
    const map: Record<string, string> = {
      SP: "bg-amber-100 text-amber-800",
      SC: "bg-blue-100 text-blue-800",
      C: "bg-emerald-100 text-emerald-800",
    };
    const labelMap: Record<string, string> = {
      SP: "Special",
      SC: "Sub-Center",
      C: "Center",
    };
    return (
      <Badge className={`${map[cat] || ""} text-[10px] px-1.5 py-0 border-0`}>
        {labelMap[cat] || cat}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Centers</h2>
          <p className="text-sm text-muted-foreground">
            Manage all satsang centers
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add Center
        </Button>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : centers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No centers yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreate}
                className="mt-3 gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first center
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-center">Users</TableHead>
                  <TableHead className="text-xs text-center">Pathis</TableHead>
                  <TableHead className="text-xs text-center">Reports</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="text-sm font-medium py-3">
                      {center.name}
                    </TableCell>
                    <TableCell className="py-3">
                      {categoryBadge(center.category)}
                    </TableCell>
                    <TableCell className="text-xs text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {center._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <UserCog className="h-3 w-3 text-muted-foreground" />
                        {center._count?.pathis || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-center py-3">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        {center._count?.savedSchedules || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(center)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setDeletingCenter(center);
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCenter ? "Edit Center" : "Add New Center"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Center Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter center name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SP">SP - Special</SelectItem>
                  <SelectItem value="SC">SC - Sub-Center</SelectItem>
                  <SelectItem value="C">C - Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingCenter ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Center</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingCenter?.name}</strong>? This will also delete all
              associated pathis and saved schedules. This action cannot be
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
