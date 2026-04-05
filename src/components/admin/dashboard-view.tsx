"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  UserCog,
  FileText,
  CalendarPlus,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore, type Center, type User } from "@/lib/store";
import { toast } from "sonner";

export function DashboardView() {
  const user = useAppStore((s) => s.user);
  const centers = useAppStore((s) => s.centers);
  const users = useAppStore((s) => s.users);
  const savedSchedules = useAppStore((s) => s.savedSchedules);
  const setCenters = useAppStore((s) => s.setCenters);
  const setUsers = useAppStore((s) => s.setUsers);
  const setSavedSchedules = useAppStore((s) => s.setSavedSchedules);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const selectedCenterId = useAppStore((s) => s.selectedCenterId);

  const [pathiCount, setPathiCount] = useState(0);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [centersRes, schedulesRes] = await Promise.all([
          fetch("/api/centers"),
          selectedCenterId
            ? fetch(`/api/schedules/saved?centerId=${selectedCenterId}`)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        if (centersRes.ok) {
          const cData = await centersRes.json();
          setCenters(cData.centers || []);
        }

        if (schedulesRes && schedulesRes.ok) {
          const sData = await schedulesRes.json();
          setSavedSchedules(sData.schedules || []);
        }

        if (selectedCenterId) {
          const pathisRes = await fetch(
            `/api/pathis?centerId=${selectedCenterId}`
          );
          if (cancelled) return;
          if (pathisRes.ok) {
            const pData = await pathisRes.json();
            setPathiCount(pData.pathis?.length || 0);
          }
        }
      } catch {
        if (!cancelled) toast.error("Failed to load dashboard data");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCenterId, setCenters, setSavedSchedules]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setUsers(data.users || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSuperAdmin, setUsers]);

  const totalPathis = centers.reduce(
    (acc, c) => acc + (c._count?.pathis || 0),
    0
  );
  const totalSchedules = isSuperAdmin
    ? centers.reduce((acc, c) => acc + (c._count?.savedSchedules || 0), 0)
    : savedSchedules.length;
  const totalUsers = isSuperAdmin ? users.length : 0;
  const displayPathis = isSuperAdmin ? totalPathis : pathiCount;

  const myCenter = centers.find(
    (c) => c.id === user?.centerId
  );

  const quickActions = isSuperAdmin
    ? [
        {
          label: "Generate Schedule",
          icon: CalendarPlus,
          view: "schedule" as const,
          color: "bg-amber-600 hover:bg-amber-700 text-white",
        },
        {
          label: "Manage Centers",
          icon: Building2,
          view: "centers" as const,
          color:
            "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
        },
        {
          label: "Manage Users",
          icon: Users,
          view: "users" as const,
          color:
            "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
        },
        {
          label: "Manage Pathis",
          icon: UserCog,
          view: "pathis" as const,
          color:
            "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
        },
      ]
    : [
        {
          label: "Generate Schedule",
          icon: CalendarPlus,
          view: "schedule" as const,
          color: "bg-amber-600 hover:bg-amber-700 text-white",
        },
        {
          label: "Manage Pathis",
          icon: UserCog,
          view: "pathis" as const,
          color:
            "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
        },
        {
          label: "View Reports",
          icon: FileText,
          view: "saved-reports" as const,
          color:
            "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700",
        },
      ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.displayName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isSuperAdmin
            ? "Manage centers, users, pathis, and generate schedules"
            : myCenter
              ? `Manage pathis and schedules for ${myCenter.name}`
              : "Manage pathis and generate schedules"}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Building2,
            color: "text-amber-600",
            bg: "bg-amber-50",
            value: isSuperAdmin ? centers.length : (myCenter ? 1 : 0),
            label: isSuperAdmin ? "Centers" : "My Center",
          },
          {
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            value: totalUsers,
            label: "Users",
            show: isSuperAdmin,
          },
          {
            icon: UserCog,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            value: displayPathis,
            label: "Pathis",
          },
          {
            icon: FileText,
            color: "text-purple-600",
            bg: "bg-purple-50",
            value: totalSchedules,
            label: "Saved Reports",
          },
        ]
          .filter((s) => s.show !== false)
          .map((stat) => (
            <Card key={stat.label} className="rounded-xl overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bg}`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => setCurrentView(action.view)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${action.color}`}
            >
              <action.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="truncate">{action.label}</span>
              <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-50 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Centers Overview for Super Admin */}
      {isSuperAdmin && centers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Centers Overview
          </h3>
          <Card className="rounded-xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {centers.slice(0, 5).map((center) => (
                <div
                  key={center.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      className={`text-[9px] px-1.5 py-0 border-0 ${
                        center.category === "SP"
                          ? "bg-amber-100 text-amber-800"
                          : center.category === "SC"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {center.category}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {center.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span>{center._count?.users || 0} users</span>
                    <span>{center._count?.pathis || 0} pathis</span>
                    <span>{center._count?.savedSchedules || 0} reports</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
