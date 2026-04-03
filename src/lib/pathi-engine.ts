// ============================================
// Pathi Assignment Engine
// ============================================
// Core algorithm for assigning pathis to schedule entries
// with load balancing, conflict prevention, and Baal Satsang support.
// ============================================

import {
  SatsangSchedule,
} from "./excel-parser";
import {
  PathiConfig,
  AssignedScheduleEntry,
  SlotMetrics,
  PathiSlotInfo,
  SKDistribution,
  PathiMetrics,
  GharAssignmentSummary,
  GeneratedSchedule,
} from "./types";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate the minimum number of pathis needed for conflict-free assignment.
 * On any single date, each ghar needs separate pathis for each active slot.
 * A pathi can only fill ONE slot at ONE ghar per date.
 * So min pathis = max_ghars_per_date (each needs at least 1 pathi for Slot-A/B/C each).
 *
 * Actually: each ghar needs 3 pathis (A, B, C) per date. A single pathi can do
 * at most one slot per ghar per date. But the same pathi CAN do different slots
 * at different ghars on the same date (per-slot booking).
 *
 * So per slot per date: need at most (number of ghars active) pathis.
 * Min pathis = max over all dates of ghars_with_non_VCD_sessions (for slot A)
 *             or max over all dates of total_ghars (for slot B/C).
 * = max ghars per date (since all ghars have sessions on all dates).
 */
export function calculateMinPathis(
  schedule: SatsangSchedule,
  baalSatsangGhars: string[]
): { minimum: number; recommended: number; maxPerDate: number; maxPerSlot: number; maxPerSlotA: number; details: string } {
  // Find the busiest date (most ghar sessions)
  const dateGharCount: Record<string, number> = {};
  const dateLiveCount: Record<string, number> = {};
  const dateBaalCount: Record<string, number> = {};

  for (const ghar of schedule.ghars) {
    const isBaal = baalSatsangGhars.includes(ghar.name);
    for (const entry of ghar.entries) {
      if (!entry.date) continue;
      dateGharCount[entry.date] = (dateGharCount[entry.date] || 0) + 1;
      if (entry.nameOfSK !== "VCD") {
        dateLiveCount[entry.date] = (dateLiveCount[entry.date] || 0) + 1;
      }
      if (isBaal) {
        dateBaalCount[entry.date] = (dateBaalCount[entry.date] || 0) + 1;
      }
    }
  }

  const maxGharsPerDate = Math.max(...Object.values(dateGharCount), 0);
  const maxLivePerDate = Math.max(...Object.values(dateLiveCount), 0);
  const maxBaalPerDate = Math.max(...Object.values(dateBaalCount), 0);

  // Per-slot: each slot needs at most maxGharsPerDate pathis (one per ghar)
  // Slot-A: needs maxLivePerDate (VCD entries don't need pathi-A)
  // Slot-B, C: needs maxGharsPerDate
  // Slot-D: needs maxBaalPerDate
  const maxPerSlotA = maxLivePerDate;
  const maxPerSlotBC = maxGharsPerDate;
  const maxPerSlotD = maxBaalPerDate;
  const maxPerSlot = Math.max(maxPerSlotA, maxPerSlotBC, maxPerSlotD);

  // Minimum = maxPerSlot (enough for the busiest slot on the busiest date)
  const minimum = maxPerSlot;
  // Recommended = minimum + 2 (for better rotation and rest days)
  const recommended = minimum + 2;

  const totalDates = Object.keys(dateGharCount).length;
  const totalEntries = schedule.ghars.reduce((a, g) => a + g.entries.length, 0);
  const vcdEntries = schedule.ghars.reduce((a, g) => a + g.entries.filter(e => e.nameOfSK === "VCD").length, 0);
  const liveEntries = totalEntries - vcdEntries;

  const details = [
    `${totalDates} dates, ${maxGharsPerDate} ghars per date`,
    `Slot-A needs up to ${maxPerSlotA} pathis/date (live sessions only)`,
    `Slot-B/C need up to ${maxPerSlotBC} pathis/date (all sessions)`,
    maxPerSlotD > 0 ? `Slot-D needs up to ${maxPerSlotD} pathis/date (Baal Satsang)` : null,
    `${liveEntries} live + ${vcdEntries} VCD = ${totalEntries} total sessions`,
  ].filter(Boolean).join(" · ");

  return { minimum, recommended, maxPerDate: maxGharsPerDate, maxPerSlot, maxPerSlotA, details };
}

/**
 * Main entry point: Assign pathis to all schedule entries.
 *
 * Algorithm (per-slot booking):
 * 1. Flatten all entries, group by date.
 * 2. For each date, for each ghar entry:
 *    - Pick pathi for Slot-A (if not VCD) — only prevent same pathi doing Slot-A at another ghar
 *    - Pick pathi for Slot-B — only prevent same pathi doing Slot-B at another ghar
 *    - Pick pathi for Slot-C — only prevent same pathi doing Slot-C at another ghar
 *    - Pick pathi for Slot-D (if Baal Satsang) — same isolation
 * 3. Load balancing: always pick the pathi with fewest assignments in that slot.
 * 4. No cross-slot blocking: a pathi CAN do Slot-A at Place-1 and Slot-B at Place-2 same date.
 */
export function assignPathis(
  schedule: SatsangSchedule,
  config: PathiConfig
): GeneratedSchedule {
  const { pathis, baalSatsangGhars } = config;

  if (pathis.length === 0) {
    throw new Error("At least one pathi is required");
  }

  // Per-slot assignment counts
  const slotCounts: Record<string, Record<string, number>> = {
    A: {}, B: {}, C: {}, D: {},
  };
  for (const slot of ["A", "B", "C", "D"]) {
    for (const pathi of pathis) {
      slotCounts[slot][pathi] = 0;
    }
  }

  interface DateEntry {
    gharName: string;
    gharCategory: string;
    entry: import("./excel-parser").SatsangEntry;
    hasBaalSatsang: boolean;
  }

  const dateMap: string[] = [];
  const dateEntriesMap: Record<string, DateEntry[]> = {};

  for (const ghar of schedule.ghars) {
    const hasBaal = baalSatsangGhars.includes(ghar.name);
    for (const entry of ghar.entries) {
      if (!entry.date) continue;
      const dk = entry.date;
      if (!dateEntriesMap[dk]) {
        dateEntriesMap[dk] = [];
        dateMap.push(dk);
      }
      dateEntriesMap[dk].push({
        gharName: ghar.name,
        gharCategory: ghar.category,
        entry,
        hasBaalSatsang: hasBaal,
      });
    }
  }

  const flatEntries: AssignedScheduleEntry[] = [];

  for (const dateKey of dateMap) {
    const entriesForDate = dateEntriesMap[dateKey];

    // Per-slot booking: track which pathis are already assigned to each slot on this date
    const bookedSlot: Record<string, Set<string>> = {
      A: new Set(), B: new Set(), C: new Set(), D: new Set(),
    };

    // Shuffle for randomness
    const shuffled = shuffleArray(entriesForDate.map((_, i) => i));

    for (const idx of shuffled) {
      const de = entriesForDate[idx];
      const isVCD = de.entry.nameOfSK === "VCD";

      let assignedA = "N/A";
      let assignedB = "";
      let assignedC = "";
      let assignedD = "";

      if (!isVCD) {
        assignedA = pickPathi(slotCounts["A"], pathis, bookedSlot["A"]);
        bookedSlot["A"].add(assignedA);
        slotCounts["A"][assignedA]++;
      }

      assignedB = pickPathi(slotCounts["B"], pathis, bookedSlot["B"]);
      bookedSlot["B"].add(assignedB);
      slotCounts["B"][assignedB]++;

      assignedC = pickPathi(slotCounts["C"], pathis, bookedSlot["C"]);
      bookedSlot["C"].add(assignedC);
      slotCounts["C"][assignedC]++;

      if (de.hasBaalSatsang) {
        assignedD = pickPathi(slotCounts["D"], pathis, bookedSlot["D"]);
        bookedSlot["D"].add(assignedD);
        slotCounts["D"][assignedD]++;
      }

      flatEntries.push({
        entry: de.entry,
        gharName: de.gharName,
        gharCategory: de.gharCategory,
        pathiA: assignedA,
        pathiB: assignedB,
        pathiC: assignedC,
        pathiD: assignedD,
        hasBaalSatsang: de.hasBaalSatsang,
      });
    }
  }

  flatEntries.sort((a, b) => {
    if (a.entry.date !== b.entry.date) return a.entry.date.localeCompare(b.entry.date);
    return a.gharName.localeCompare(b.gharName);
  });

  const metrics = calculateMetrics(flatEntries, pathis, schedule);

  return {
    originalSchedule: schedule,
    entries: flatEntries,
    config,
    metrics,
  };
}

/**
 * Pick the pathi with fewest assignments in the given slot,
 * excluding any already booked for THIS SLOT on this date.
 */
function pickPathi(
  counts: Record<string, number>,
  pathis: string[],
  bookedForSlot: Set<string>
): string {
  const available = pathis.filter((p) => !bookedForSlot.has(p));

  if (available.length === 0) {
    // All booked — fallback to least-assigned overall
    const sorted = [...pathis].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0));
    return sorted[0];
  }

  const minCount = Math.min(...available.map((p) => counts[p] ?? 0));
  const candidates = available.filter((p) => (counts[p] ?? 0) === minCount);

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function calculateMetrics(
  entries: AssignedScheduleEntry[],
  pathis: string[],
  schedule: SatsangSchedule
): PathiMetrics {
  const vcdSessions = entries.filter((e) => e.entry.nameOfSK === "VCD").length;
  const liveSessions = entries.length - vcdSessions;

  const slotMetrics: SlotMetrics[] = [];

  for (const slot of ["A", "B", "C", "D"] as const) {
    const fieldKey = `pathi${slot}` as keyof AssignedScheduleEntry;
    const assignments: Record<string, number> = {};
    for (const p of pathis) assignments[p] = 0;

    let total = 0;
    for (const e of entries) {
      const val = e[fieldKey] as string;
      if (val && val !== "N/A") {
        assignments[val] = (assignments[val] || 0) + 1;
        total++;
      }
    }

    const avg = pathis.length > 0 ? total / pathis.length : 0;
    const counts = pathis.map((p) => assignments[p] || 0);
    const stdDev = standardDeviation(counts);

    slotMetrics.push({
      slot,
      assignments,
      total,
      average: Math.round(avg * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
    });
  }

  const pathiDetails: PathiSlotInfo[] = pathis.map((p) => ({
    pathiName: p,
    slotA: slotMetrics[0].assignments[p] || 0,
    slotB: slotMetrics[1].assignments[p] || 0,
    slotC: slotMetrics[2].assignments[p] || 0,
    slotD: slotMetrics[3].assignments[p] || 0,
    total:
      (slotMetrics[0].assignments[p] || 0) +
      (slotMetrics[1].assignments[p] || 0) +
      (slotMetrics[2].assignments[p] || 0) +
      (slotMetrics[3].assignments[p] || 0),
  }));

  const skMap: Record<string, { live: number; vcd: number }> = {};
  for (const e of entries) {
    const sk = e.entry.nameOfSK || "Unknown";
    if (!skMap[sk]) skMap[sk] = { live: 0, vcd: 0 };
    if (sk === "VCD") skMap[sk].vcd++;
    else skMap[sk].live++;
  }

  const skDistribution: SKDistribution[] = Object.entries(skMap)
    .map(([skName, data]) => ({
      skName,
      count: data.live + data.vcd,
      vcdCount: data.vcd,
      liveCount: data.live,
    }))
    .sort((a, b) => b.count - a.count);

  const gharSummary: GharAssignmentSummary[] = schedule.ghars.map((ghar) => {
    const gharEntries = entries.filter((e) => e.gharName === ghar.name);
    const live = gharEntries.filter((e) => e.entry.nameOfSK !== "VCD").length;
    const vcd = gharEntries.length - live;
    return {
      gharName: ghar.name,
      gharCategory: ghar.category,
      hasBaalSatsang: entries.some(
        (e) => e.gharName === ghar.name && e.hasBaalSatsang
      ),
      totalEntries: gharEntries.length,
      liveEntries: live,
      vcdEntries: vcd,
    };
  });

  return {
    totalPrograms: entries.length,
    vcdSessions,
    liveSessions,
    slotMetrics,
    pathiDetails,
    skDistribution,
    gharSummary,
  };
}
