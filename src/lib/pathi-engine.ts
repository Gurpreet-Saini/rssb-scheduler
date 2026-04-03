// ============================================
// Pathi Assignment Engine
// ============================================
// Core algorithm for assigning pathis to schedule entries
// with strict equal distribution per slot, conflict prevention,
// and Baal Satsang support.
// ============================================
//
// KEY CONSTRAINT: A pathi can fill at most ONE slot at ONE ghar (place) per date.
//   - Pathi "x" CANNOT be both Pathi-B and Pathi-C at Place-1 on Date-Y.
//   - Pathi "x" CAN be Pathi-B at Place-1 AND Pathi-A at Place-2 on Date-Y.
//   - Within a single ghar on a date: Pathi-A ≠ Pathi-B ≠ Pathi-C ≠ Pathi-D.
//
// MINIMUM PATHIS: At each ghar, the number of active slots determines how many
//   unique pathis are needed at that ghar on that date:
//   - VCD session: 2 pathis (B + C)
//   - Live session: 3 pathis (A + B + C)
//   - Live + Baal: 4 pathis (A + B + C + D)
//   Global minimum = max active slots at any single ghar (3 or 4).
//   But for good distribution, recommended = much higher.
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
 *
 * Per-place-per-date booking: a pathi can fill at most ONE slot at ONE ghar per date.
 * A pathi CAN do Slot-B at Place-1 and Slot-C at Place-2 on the same date.
 * But CANNOT do Slot-B and Slot-C at Place-1 on the same date.
 *
 * At each ghar on a date, active slots determine unique pathis needed:
 *   - VCD: 2 (B, C)
 *   - Live: 3 (A, B, C)
 *   - Live+Baal: 4 (A, B, C, D)
 *
 * Minimum pathis = max slots at any single ghar (3 for live, 4 with baal).
 * A pathi CAN serve the same slot at multiple ghars on the same date,
 * so the number of ghars per date doesn't directly increase the minimum.
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

  const hasAnyBaalSatsang = baalSatsangGhars.length > 0;

  // Per-ghar constraint: each ghar needs up to 3 (live) or 4 (live+baal) unique pathis
  // Minimum for feasibility = max active slots at any single ghar
  const slotsPerGhar = hasAnyBaalSatsang ? 4 : 3;
  const minimum = slotsPerGhar;

  // Recommended: enough for good rotation across all ghars per date
  // More pathis = better distribution = less chance of same pathi at adjacent ghars
  const recommended = Math.max(minimum + 2, maxGharsPerDate + 1);

  const maxPerSlotA = maxLivePerDate;
  const maxPerSlotBC = maxGharsPerDate;
  const maxPerSlotD = maxBaalPerDate;
  const maxPerSlot = Math.max(maxPerSlotA, maxPerSlotBC, maxPerSlotD);

  const totalDates = Object.keys(dateGharCount).length;
  const totalEntries = schedule.ghars.reduce((a, g) => a + g.entries.length, 0);
  const vcdEntries = schedule.ghars.reduce((a, g) => a + g.entries.filter(e => e.nameOfSK === "VCD").length, 0);
  const liveEntries = totalEntries - vcdEntries;

  const details = [
    `${totalDates} dates, ${maxGharsPerDate} ghars per date`,
    `Each ghar needs ${slotsPerGhar} unique pathis per date (B, C, ${hasAnyBaalSatsang ? "A, D" : "A"})`,
    `Slot-A: up to ${maxPerSlotA} per date, Slot-B/C: up to ${maxPerSlotBC} per date each`,
    maxPerSlotD > 0 ? `Slot-D: up to ${maxPerSlotD} per date (Baal Satsang)` : null,
    `${liveEntries} live + ${vcdEntries} VCD = ${totalEntries} total sessions`,
  ].filter(Boolean).join(" · ");

  return { minimum, recommended, maxPerDate: maxGharsPerDate, maxPerSlot, maxPerSlotA, details };
}

/**
 * Main entry point: Assign pathis to all schedule entries.
 *
 * Algorithm (strict per-slot equal distribution with per-ghar conflict prevention):
 * 1. Flatten all entries, group by date, sort deterministically.
 * 2. For each date, for each ghar entry (sorted):
 *    - Pick pathi for Slot-A (if not VCD) — using deterministic rotation
 *    - Pick pathi for Slot-B — using deterministic rotation
 *    - Pick pathi for Slot-C — using deterministic rotation
 *    - Pick pathi for Slot-D (if Baal Satsang) — using deterministic rotation
 * 3. Per-ghar booking: once a pathi is assigned to ANY slot at a ghar on a date,
 *    it is excluded from all other slots at that same ghar on that date.
 * 4. Cross-place allowed: the same pathi CAN be assigned to different slots
 *    at DIFFERENT ghars on the same date.
 * 5. Equal distribution: each slot has its own rotation pointer that cycles
 *    through available pathis, always preferring the least-loaded one.
 *    Ties are broken by deterministic rotation index (not random).
 */
export function assignPathis(
  schedule: SatsangSchedule,
  config: PathiConfig
): GeneratedSchedule {
  const { pathis, baalSatsangGhars } = config;

  if (pathis.length === 0) {
    throw new Error("At least one pathi is required");
  }

  // Per-slot assignment counts (global, across all dates)
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

    // Per-place-per-date booking: track which pathis are already assigned
    // to ANY slot at a specific ghar (place) on this date.
    // A pathi CANNOT be in Slot-B and Slot-C at the same place on the same date.
    // But a pathi CAN do Slot-B at Place-1 and Slot-C at Place-2 on the same date.
    const bookedPerGhar: Record<string, Set<string>> = {};

    for (const de of entriesForDate) {
      if (!bookedPerGhar[de.gharName]) {
        bookedPerGhar[de.gharName] = new Set();
      }
      const gharBooked = bookedPerGhar[de.gharName];

      const isVCD = de.entry.nameOfSK === "VCD";

      let assignedA = "N/A";
      let assignedB = "";
      let assignedC = "";
      let assignedD = "";

      // Slot-A: only for live sessions (not VCD)
      if (!isVCD) {
        assignedA = pickPathiBalanced(slotCounts["A"], pathis, gharBooked, slotRotation, "A");
        gharBooked.add(assignedA); // Mark as used at this ghar on this date
        slotCounts["A"][assignedA]++;
      }

      // Slot-B: for all sessions (including VCD)
      assignedB = pickPathiBalanced(slotCounts["B"], pathis, gharBooked, slotRotation, "B");
      gharBooked.add(assignedB); // Cannot be reused for C or D at this ghar
      slotCounts["B"][assignedB]++;

      // Slot-C: for all sessions (including VCD)
      // Will automatically exclude pathis already used for A and B at this ghar
      assignedC = pickPathiBalanced(slotCounts["C"], pathis, gharBooked, slotRotation, "C");
      gharBooked.add(assignedC); // Cannot be reused for D at this ghar
      slotCounts["C"][assignedC]++;

      // Slot-D: only for Baal Satsang ghars
      // Will automatically exclude pathis already used for A, B, C at this ghar
      if (de.hasBaalSatsang) {
        assignedD = pickPathiBalanced(slotCounts["D"], pathis, gharBooked, slotRotation, "D");
        gharBooked.add(assignedD);
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
 * excluding any already booked for ANY slot at this ghar (place) on this date.
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
  bookedForGhar: Set<string>,
  slotRotation: Record<string, number>,
  slotName: string
): string {
  const available = pathis.filter((p) => !bookedForGhar.has(p));

  if (available.length === 0) {
    // All pathis already booked at this ghar for this date.
    // This should NOT happen if pathis >= minimum (3 or 4).
    // Fallback: pick the least-assigned pathi for this slot overall.
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

  // Validate: check for same pathi in B and C at same ghar/date (conflict detection)
  const conflicts: string[] = [];
  const gharDateMap: Record<string, AssignedScheduleEntry[]> = {};
  for (const e of entries) {
    const key = `${e.entry.date}|${e.gharName}`;
    if (!gharDateMap[key]) gharDateMap[key] = [];
    gharDateMap[key].push(e);
  }
  for (const [key, group] of Object.entries(gharDateMap)) {
    for (const e of group) {
      const usedPathis = [e.pathiA, e.pathiB, e.pathiC, e.pathiD].filter(p => p && p !== "N/A");
      const uniquePathis = new Set(usedPathis);
      if (uniquePathis.size < usedPathis.length) {
        conflicts.push(`${key}: ${usedPathis.join(", ")} (duplicate!)`);
      }
    }
  }

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

  // Log conflicts if any (for debugging)
  if (conflicts.length > 0) {
    console.error(`[Pathi Engine] ${conflicts.length} slot conflicts detected!`, conflicts.slice(0, 10));
  }

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
