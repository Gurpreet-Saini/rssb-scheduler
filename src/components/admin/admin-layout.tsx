"use client";

import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  CalendarPlus,
  FileText,
  LogOut,
  Calendar,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore, ViewType, type User } from "@/lib/store";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  view: ViewType;
  label: string;
  icon: React.ElementType;
}

const superAdminNavItems: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "centers", label: "Centers", icon: Building2 },
  { view: "users", label: "Users", icon: Users },
  { view: "pathis", label: "Pathis", icon: UserCog },
  { view: "schedule", label: "Schedule Generator", icon: CalendarPlus },
  { view: "saved-reports", label: "Saved Reports", icon: FileText },
];

const centerAdminNavItems: NavItem[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "pathis", label: "My Pathis", icon: UserCog },
  { view: "schedule", label: "Schedule Generator", icon: CalendarPlus },
  { view: "saved-reports", label: "Saved Reports", icon: FileText },
];

function SidebarContent({
  user,
  currentView,
  onNavigate,
  onClose,
}: {
  user: User;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onClose?: () => void;
}) {
  const logout = useAppStore((s) => s.logout);

  const navItems =
    user.role === "SUPER_ADMIN" ? superAdminNavItems : centerAdminNavItems;

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <Calendar className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">
            Satsang Schedule
          </h2>
          <p className="text-[11px] text-muted-foreground">Management System</p>
        </div>
      </div>

      <Separator />

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          const Icon = item.icon;
          return (
            <button
              key={item.view}
              onClick={() => {
                onNavigate(item.view);
                onClose?.();
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-amber-50 text-amber-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0",
                  isActive ? "text-amber-600" : "text-gray-400"
                )}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* User info + Logout */}
      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
            {user.displayName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {user.displayName}
            </p>
            <Badge
              variant="secondary"
              className={cn(
                "text-[9px] px-1.5 py-0 font-semibold border-0",
                user.role === "SUPER_ADMIN"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              )}
            >
              {user.role === "SUPER_ADMIN" ? "Super Admin" : "Center Admin"}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            onClose?.();
          }}
          className="w-full justify-start gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100">
                <Calendar className="h-4 w-4 text-amber-700" />
              </div>
              <span className="text-sm font-bold">Satsang Schedule</span>
            </div>
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "text-[9px] px-1.5 py-0 font-semibold border-0",
              user.role === "SUPER_ADMIN"
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            {user.displayName}
          </Badge>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30">
          <SidebarContent
            user={user}
            currentView={currentView}
            onNavigate={setCurrentView}
          />
        </aside>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent
              user={user}
              currentView={currentView}
              onNavigate={setCurrentView}
              onClose={() => setSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 md:ml-60 min-h-[calc(100vh-3.5rem)] md:min-h-screen">
          {/* Breadcrumb bar */}
          <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200/60">
            <div className="flex items-center h-12 px-6 gap-2">
              {currentView !== "dashboard" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView("dashboard")}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Dashboard
                </Button>
              )}
              <h2 className="text-sm font-semibold capitalize">
                {currentView === "saved-reports"
                  ? "Saved Reports"
                  : currentView === "schedule"
                    ? "Schedule Generator"
                    : currentView}
              </h2>
            </div>
          </div>

          {/* Page content */}
          <div className="p-4 md:p-6 max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
