// ============================================
// Unified Type Definitions for Satsang Schedule Management System
// ============================================

import { SatsangSchedule, SatsangGhar, SatsangEntry } from "./excel-parser";

export interface PathiConfig {
  pathis: string[];
  baalSatsangGhars: string[];
}

export interface AssignedScheduleEntry {
  entry: SatsangEntry;
  gharName: string;
  gharCategory: string;
  pathiA: string;
  pathiB: string;
  pathiC: string;
  pathiD: string;
  hasBaalSatsang: boolean;
}

export interface SlotMetrics {
  slot: "A" | "B" | "C" | "D";
  assignments: Record<string, number>;
  total: number;
  average: number;
  stdDev: number;
}

export type BalanceStatus = "balanced" | "slightly_off" | "uneven";

export interface PathiSlotInfo {
  pathiName: string;
  slotA: number;
  slotB: number;
  slotC: number;
  slotD: number;
  total: number;
}

export interface SKDistribution {
  skName: string;
  count: number;
  vcdCount: number;
  liveCount: number;
}

export interface PathiMetrics {
  totalPrograms: number;
  vcdSessions: number;
  liveSessions: number;
  slotMetrics: SlotMetrics[];
  pathiDetails: PathiSlotInfo[];
  skDistribution: SKDistribution[];
  gharSummary: GharAssignmentSummary[];
}

export interface GharAssignmentSummary {
  gharName: string;
  gharCategory: string;
  hasBaalSatsang: boolean;
  totalEntries: number;
  liveEntries: number;
  vcdEntries: number;
}

export interface GeneratedSchedule {
  originalSchedule: SatsangSchedule;
  entries: AssignedScheduleEntry[];
  config: PathiConfig;
  metrics: PathiMetrics;
}

export interface PathiValidation {
  minimum: number;
  recommended: number;
  maxPerDate: number;
  maxPerSlot: number;
  maxPerSlotA: number;
  details: string;
}

export interface GenerateScheduleRequest {
  scheduleData: SatsangSchedule;
  pathis: string[];
  baalSatsangGhars: string[];
}

export interface GenerateScheduleResponse {
  success: boolean;
  data?: GeneratedSchedule;
  error?: string;
  validation?: PathiValidation;
  warning?: string;
}

export type WizardStep = 1 | 2 | 3;
