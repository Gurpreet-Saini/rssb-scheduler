import { create } from "zustand";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
  centerId?: string;
  centerName?: string | null;
}

export interface Center {
  id: string;
  name: string;
  category: string;
  _count?: { users: number; pathis: number; savedSchedules: number };
}

export interface Pathi {
  id: string;
  name: string;
  centerId: string;
  slots: string; // JSON string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedSchedule {
  id: string;
  name: string;
  centerId: string;
  userId: string;
  createdAt: string;
  scheduleData: string;
  pathiConfig: string;
  excelData?: string | null;
  user?: { id: string; username: string; displayName: string };
}

export type ViewType =
  | "login"
  | "dashboard"
  | "centers"
  | "users"
  | "pathis"
  | "schedule"
  | "saved-reports"
  | "generate-schedule";

export interface AppState {
  // Auth
  user: User | null;
  isLoading: boolean;

  // Navigation
  currentView: ViewType;
  selectedCenterId: string | null;

  // Data cache
  centers: Center[];
  users: Array<{
    id: string;
    username: string;
    displayName: string;
    role: string;
    centerId?: string | null;
    center?: { id: string; name: string; category: string } | null;
    createdAt: string;
    updatedAt: string;
  }>;
  pathis: Pathi[];
  savedSchedules: SavedSchedule[];

  // Schedule state
  scheduleData: any; // parsed Excel data (SatsangSchedule)
  generatedSchedule: any; // GeneratedSchedule
  baalSatsangGhars: string[];

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: ViewType) => void;
  setSelectedCenterId: (id: string | null) => void;
  setCenters: (centers: Center[]) => void;
  setUsers: (users: any[]) => void;
  setPathis: (pathis: Pathi[]) => void;
  setSavedSchedules: (schedules: SavedSchedule[]) => void;
  setScheduleData: (data: any) => void;
  setGeneratedSchedule: (schedule: any) => void;
  setBaalSatsangGhars: (ghars: string[]) => void;

  // Async initialization
  initialize: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isLoading: true,

  // Navigation
  currentView: "dashboard",
  selectedCenterId: null,

  // Data cache
  centers: [],
  users: [],
  pathis: [],
  savedSchedules: [],

  // Schedule state
  scheduleData: null,
  generatedSchedule: null,
  baalSatsangGhars: [],

  // Actions
  setUser: (user) => set({ user }),
  logout: () => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null, currentView: "dashboard", selectedCenterId: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedCenterId: (id) => set({ selectedCenterId: id }),
  setCenters: (centers) => set({ centers }),
  setUsers: (users) => set({ users }),
  setPathis: (pathis) => set({ pathis }),
  setSavedSchedules: (schedules) => set({ savedSchedules: schedules }),
  setScheduleData: (data) => set({ scheduleData: data }),
  setGeneratedSchedule: (schedule) => set({ generatedSchedule: schedule }),
  setBaalSatsangGhars: (ghars) => set({ baalSatsangGhars: ghars }),

  // Initialize: check existing session
  initialize: async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          set({ user: data.user, isLoading: false });
          // Auto-select center for CENTER_ADMIN
          if (data.user.role === "CENTER_ADMIN" && data.user.centerId) {
            set({ selectedCenterId: data.user.centerId });
          }
          return;
        }
      }
    } catch {
      // Session check failed
    }
    set({ user: null, isLoading: false });
  },
}));
