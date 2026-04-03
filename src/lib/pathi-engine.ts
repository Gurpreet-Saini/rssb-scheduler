// ============================================
// Pathi Assignment Engine
// ============================================
// Core algorithm for assigning pathis to schedule entries
// with strict equal distribution per slot, conflict prevention,
// and Baal Satsang support.
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
 * Per-slot booking: a pathi CAN do Slot-A at Place-1 and Slot-B at Place-2 same date,
 * but CANNOT do Slot-A at Place-1 AND Slot-A at Place-2 same date.
 *
 * So per slot per date: need at most (number of ghars active) pathis.
 * Min pathis = max over all dates of ghars_with_non_VCD_sessions (for slot A)
 *             or max over all dates of total_ghars (for slot B/C).
 */
export function calculateMinPathis(
  schedule: SatsangSchedule,
  baalSatsangGhars: string[]
): { minimum: number; recommended: number; maxPerDate: number; maxPerSlot: number; maxPerSlotA: number; details: string } {
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
 * Algorithm (strict per-slot equal distribution):
 * 1. Flatten all entries, group by date, sort deterministically.
 * 2. For each date, for each ghar entry (sorted):
 *    - Pick pathi for Slot-A (if not VCD) — using deterministic rotation
 *    - Pick pathi for Slot-B — using deterministic rotation
 *    - Pick pathi for Slot-C — using deterministic rotation
 *    - Pick pathi for Slot-D (if Baal Satsang) — using deterministic rotation
 * 3. Equal distribution: each slot has its own rotation pointer that cycles
 *    through available pathis, always preferring the least-loaded one.
 *    Ties are broken by deterministic rotation index (not random).
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

  // Per-slot rotation indices for deterministic tiebreaking
  // Each slot has its own rotation that advances after each assignment
  const slotRotation: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

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

  // Sort dates chronologically
  dateMap.sort((a, b) => a.localeCompare(b));

  // Sort entries within each date by ghar name for determinism
  for (const dk of dateMap) {
    dateEntriesMap[dk].sort((a, b) => a.gharName.localeCompare(b.gharName));
  }

  const flatEntries: AssignedScheduleEntry[] = [];

  for (const dateKey of dateMap) {
    const entriesForDate = dateEntriesMap[dateKey];

    // Per-slot booking: track which pathis are already assigned to each slot on this date
    const bookedSlot: Record<string, Set<string>> = {
      A: new Set(), B: new Set(), C: new Set(), D: new Set(),
    };

    for (const de of entriesForDate) {
      const isVCD = de.entry.nameOfSK === "VCD";

      let assignedA = "N/A";
      let assignedB = "";
      let assignedC = "";
      let assignedD = "";

      if (!isVCD) {
        assignedA = pickPathiBalanced(slotCounts["A"], pathis, bookedSlot["A"], slotRotation, "A");
        bookedSlot["A"].add(assignedA);
        slotCounts["A"][assignedA]++;
      }

      assignedB = pickPathiBalanced(slotCounts["B"], pathis, bookedSlot["B"], slotRotation, "B");
      bookedSlot["B"].add(assignedB);
      slotCounts["B"][assignedB]++;

      assignedC = pickPathiBalanced(slotCounts["C"], pathis, bookedSlot["C"], slotRotation, "C");
      bookedSlot["C"].add(assignedC);
      slotCounts["C"][assignedC]++;

      if (de.hasBaalSatsang) {
        assignedD = pickPathiBalanced(slotCounts["D"], pathis, bookedSlot["D"], slotRotation, "D");
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
 * Uses deterministic rotation for tiebreaking to ensure strict equal distribution.
 *
 * Instead of random tiebreaking among equally-loaded candidates,
 * we rotate through candidates in a fixed cycle. This guarantees
 * that over the full schedule, each pathi gets exactly the same
 * number of assignments (or within ±1 when total isn't divisible).
 */
function pickPathiBalanced(
  counts: Record<string, number>,
  pathis: string[],
  bookedForSlot: Set<string>,
  slotRotation: Record<string, number>,
  slotName: string
): string {
  const available = pathis.filter((p) => !bookedForSlot.has(p));

  if (available.length === 0) {
    // All booked — fallback to least-assigned overall (shouldn't happen if pathis >= minPathis)
    const sorted = [...pathis].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0));
    return sorted[0];
  }

  const minCount = Math.min(...available.map((p) => counts[p] ?? 0));
  const candidates = available.filter((p) => (counts[p] ?? 0) === minCount);

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Deterministic rotation: pick from candidates using rotation index
  // This ensures fair cycling through equally-loaded pathis
  const rotIdx = slotRotation[slotName] % candidates.length;
  const selected = candidates[rotIdx];

  // Advance the rotation pointer for this slot
  slotRotation[slotName]++;

  return selected;
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
