"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: string;
  centerId?: string | null;
  center?: { id: string; name: string; category: string } | null;
  createdAt: string;
  updatedAt: string;
}

export function UsersView() {
  const users = useAppStore((s) => s.users);
  const centers = useAppStore((s) => s.centers);
  const setUsers = useAppStore((s) => s.setUsers);
  const currentUser = useAppStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formRole, setFormRole] = useState("CENTER_ADMIN");
  const [formCenterId, setFormCenterId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [setUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormPassword("");
    setFormDisplayName("");
    setFormRole("CENTER_ADMIN");
    setFormCenterId("");
    setDialogOpen(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword("");
    setFormDisplayName(user.displayName);
    setFormRole(user.role);
    setFormCenterId(user.centerId || "");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingUser) {
      if (!formDisplayName.trim()) {
        toast.error("Display name is required");
        return;
      }
    } else {
      if (!formUsername.trim() || !formPassword || !formDisplayName.trim()) {
        toast.error("All fields are required");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";

      const body: Record<string, string> = {
        displayName: formDisplayName.trim(),
        role: formRole,
      };

      if (formCenterId) body.centerId = formCenterId;
      else if (!editingUser) body.centerId = "";

      if (editingUser) {
        if (formPassword) body.password = formPassword;
      } else {
        body.username = formUsername.trim();
        body.password = formPassword;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save user");
        return;
      }

      toast.success(
        editingUser ? "User updated successfully" : "User created successfully"
      );
      setDialogOpen(false);
      fetchUsers();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete user");
        return;
      }
      toast.success("User deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  const roleBadge = (role: string) => (
    <Badge
      className={`text-[10px] px-1.5 py-0 border-0 font-semibold ${
        role === "SUPER_ADMIN"
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {role === "SUPER_ADMIN" ? "Super Admin" : "Center Admin"}
    </Badge>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage system users and permissions
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No users yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={openCreate}
                className="mt-3 gap-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first user
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="text-xs">Display Name</TableHead>
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Center</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-bold text-[11px]">
                          {u.displayName?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">
                          {u.displayName}
                        </span>
                        {u.id === currentUser?.id && (
                          <Badge
                            variant="secondary"
                            className="text-[8px] px-1 py-0 border-0 bg-blue-50 text-blue-600"
                          >
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-3">
                      {u.username}
                    </TableCell>
                    <TableCell className="py-3">{roleBadge(u.role)}</TableCell>
                    <TableCell className="text-xs py-3">
                      {u.center?.name || (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
              {editingUser ? "Edit User" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-sm">Username</Label>
                <Input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Enter username"
                  className="h-10"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">
                {editingUser ? "New Password (leave blank to keep)" : "Password"}
              </Label>
              <Input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={
                  editingUser ? "Leave blank to keep current" : "Enter password"
                }
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Display Name</Label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="CENTER_ADMIN">Center Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formRole === "CENTER_ADMIN" && (
              <div className="space-y-2">
                <Label className="text-sm">Center</Label>
                <Select value={formCenterId} onValueChange={setFormCenterId}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
              {editingUser ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingUser?.displayName}</strong> (@{deletingUser?.username}
              )? This action cannot be undone.
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
