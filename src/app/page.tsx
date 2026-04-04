"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LoginView } from "@/components/admin/login-view";
import { AdminLayout } from "@/components/admin/admin-layout";
import { DashboardView } from "@/components/admin/dashboard-view";
import { CentersView } from "@/components/admin/centers-view";
import { UsersView } from "@/components/admin/users-view";
import { PathisView } from "@/components/admin/pathis-view";
import { ScheduleWizardView } from "@/components/admin/schedule-wizard-view";
import { SavedReportsView } from "@/components/admin/saved-reports-view";

export default function Home() {
  const isLoading = useAppStore((s) => s.isLoading);
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <AdminLayout>
      {currentView === "dashboard" && <DashboardView />}
      {currentView === "centers" && user.role === "SUPER_ADMIN" && (
        <CentersView />
      )}
      {currentView === "users" && user.role === "SUPER_ADMIN" && (
        <UsersView />
      )}
      {(currentView === "pathis" || currentView === "generate-schedule") && (
        <PathisView />
      )}
      {currentView === "schedule" && <ScheduleWizardView />}
      {currentView === "saved-reports" && <SavedReportsView />}
    </AdminLayout>
  );
}
