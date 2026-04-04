// ============================================
// Pathi Assignment Engine
// ============================================
// Core algorithm for assigning pathis to schedule entries
// with strict equal distribution per slot, conflict prevention,
// and Baal Satsang support.
// ============================================
//
// KEY CONSTRAINT: A pathi can fill at most ONE slot at ONE place on ONE date.
//   - Pathi "x" CANNOT be at Place-1 and Place-2 on the same date.
//   - Pathi "x" CANNOT be Pathi-A and Pathi-B at the same place on the same date.
//   - Within a single ghar on a date: Pathi-A ≠ Pathi-B ≠ Pathi-C ≠ Pathi-D.
//   - Across all ghars on a date: each pathi appears at most ONCE.
//
// RATIONALE: All satsangs happen at the same time (09:30 AM / 09:00 AM),
// so a person can physically only be at one place on a given date.
//
// MINIMUM PATHIS: On each date, the total number of slot assignments across ALL
// ghars determines the minimum pathis needed. Since each pathi can fill only
// ONE slot across all ghars on a date:
//   - If 5 ghars have live sessions on a date, need 5 pathis (one per ghar, slot A)
//     PLUS 5 more for slot B, PLUS 5 more for slot C = 15 pathis minimum.
//   - If some sessions are VCD, they only need 2 slots (B, C) instead of 3 (A, B, C).
//   - If some ghars have Baal Satsang, they need 4 slots instead of 3.
//   Global minimum = max total slots needed on any single date.
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
 * Per-date booking: a pathi can fill at most ONE slot (at one ghar) per date.
 * All satsangs happen at the same time, so a person cannot be at two places.
 *
 * On each date, count total slots needed:
 *   - VCD session: 2 slots (B, C)
 *   - Live session: 3 slots (A, B, C)
 *   - Live + Baal: 4 slots (A, B, C, D)
 *
 * Minimum pathis = max total slots across all dates.
 * Because each pathi can fill only 1 slot per date, the number of pathis
 * must be >= total slots on the busiest date.
 */
export function calculateMinPathis(
  schedule: SatsangSchedule,
  baalSatsangGhars: string[]
): { minimum: number; recommended: number; maxPerDate: number; maxPerSlot: number; maxPerSlotA: number; details: string } {
  const dateGharCount: Record<string, number> = {};
  // Count total slots needed per date (NOT just ghars)
  const dateSlotCount: Record<string, number> = {};

  for (const ghar of schedule.ghars) {
    const isBaal = baalSatsangGhars.includes(ghar.name);
    for (const entry of ghar.entries) {
      if (!entry.date) continue;
      dateGharCount[entry.date] = (dateGharCount[entry.date] || 0) + 1;

      // Count slots needed for this session
      if (entry.nameOfSK === "VCD") {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 2; // B + C
      } else {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 3; // A + B + C
      }
      if (isBaal) {
        dateSlotCount[entry.date] = (dateSlotCount[entry.date] || 0) + 1; // D
      }
    }
  }

  const maxGharsPerDate = Math.max(...Object.values(dateGharCount), 0);
  const maxSlotsPerDate = Math.max(...Object.values(dateSlotCount), 0);

  // Each pathi can fill exactly 1 slot per date, so minimum = max slots on any date
  const minimum = maxSlotsPerDate;

  // Recommended: have more than minimum for balanced rotation
  const recommended = minimum + 2;

  const totalDates = Object.keys(dateGharCount).length;
  const totalEntries = schedule.ghars.reduce((a, g) => a + g.entries.length, 0);
  const vcdEntries = schedule.ghars.reduce((a, g) => a + g.entries.filter(e => e.nameOfSK === "VCD").length, 0);
  const liveEntries = totalEntries - vcdEntries;

  const details = [
    `${totalDates} dates, ${maxGharsPerDate} ghars per date`,
    `Max ${maxSlotsPerDate} slot assignments on a single date`,
    `Each pathi can fill only 1 slot per date (same time across all places)`,
    `Minimum ${minimum} pathis needed (one per slot on busiest date)`,
    `${liveEntries} live + ${vcdEntries} VCD = ${totalEntries} total sessions`,
  ].join(" · ");

  return { minimum, recommended, maxPerDate: maxGharsPerDate, maxPerSlot: maxSlotsPerDate, maxPerSlotA: maxGharsPerDate, details };
}

/**
 * Extended config that optionally includes per-pathi slot eligibility.
 * If `pathiSlots` is provided, a pathi is only eligible for slots
 * listed in its array. If not provided, all pathis are eligible for all slots.
 */
export interface PathiSlotConfig {
  pathis: string[];
  baalSatsangGhars: string[];
  /** Optional map: pathi name → eligible slots. If not set, all slots are eligible. */
  pathiSlots?: Record<string, string[]>;
  /** Optional map: pathi name → list of ghar names to EXCLUDE from assignment.
   *  A pathi in this list will NEVER be assigned to the listed ghars. */
  pathiExcludedGhars?: Record<string, string[]>;
}

/**
 * Main entry point: Assign pathis to all schedule entries.
 *
 * Algorithm (strict per-slot equal distribution with per-date conflict prevention):
 * 1. Flatten all entries, group by date, sort deterministically.
 * 2. For each date, for each ghar entry (sorted):
 *    - Pick pathi for Slot-A (if not VCD) — using deterministic rotation
 *    - Pick pathi for Slot-B — using deterministic rotation
 *    - Pick pathi for Slot-C — using deterministic rotation
 *    - Pick pathi for Slot-D (if Baal Satsang) — using deterministic rotation
 * 3. Per-date booking: once a pathi is assigned to ANY slot at ANY ghar on a date,
 *    it is excluded from ALL other slots at ALL ghars on that date.
 *    (All satsangs happen at the same time, so a person can only be at one place.)
 * 4. Equal distribution: each slot has its own rotation pointer that cycles
 *    through available pathis, always preferring the least-loaded one.
 *    Ties are broken by deterministic rotation index (not random).
 */
export function assignPathis(
  schedule: SatsangSchedule,
  config: PathiConfig | PathiSlotConfig
): GeneratedSchedule {
  const { pathis, baalSatsangGhars } = config;
  const pathiSlots = 'pathiSlots' in config ? config.pathiSlots : undefined;
  const pathiExcludedGhars = 'pathiExcludedGhars' in config ? config.pathiExcludedGhars : undefined;

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

    // CRITICAL: Per-date booking. A pathi can fill at most ONE slot
    // across ALL ghars on this date. All satsangs happen at the same time,
    // so a person physically cannot be at two places on the same day.
    const bookedForDate: Set<string> = new Set();

    for (const de of entriesForDate) {
      const isVCD = de.entry.nameOfSK === "VCD";

      let assignedA = "N/A";
      let assignedB = "";
      let assignedC = "";
      let assignedD = "";

      // Slot-A: only for live sessions (not VCD)
      if (!isVCD) {
        assignedA = pickPathiBalanced(slotCounts["A"], pathis, bookedForDate, slotRotation, "A", pathiSlots, pathiExcludedGhars, de.gharName);
        bookedForDate.add(assignedA); // Person is now at this place — cannot go anywhere else today
        slotCounts["A"][assignedA]++;
      }

      // Slot-B: for all sessions (including VCD)
      assignedB = pickPathiBalanced(slotCounts["B"], pathis, bookedForDate, slotRotation, "B", pathiSlots, pathiExcludedGhars, de.gharName);
      bookedForDate.add(assignedB); // Person cannot go anywhere else today
      slotCounts["B"][assignedB]++;

      // Slot-C: for all sessions (including VCD)
      assignedC = pickPathiBalanced(slotCounts["C"], pathis, bookedForDate, slotRotation, "C", pathiSlots, pathiExcludedGhars, de.gharName);
      bookedForDate.add(assignedC);
      slotCounts["C"][assignedC]++;

      // Slot-D: only for Baal Satsang ghars
      if (de.hasBaalSatsang) {
        assignedD = pickPathiBalanced(slotCounts["D"], pathis, bookedForDate, slotRotation, "D", pathiSlots, pathiExcludedGhars, de.gharName);
        bookedForDate.add(assignedD);
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
 * excluding any already booked for ANY slot at ANY ghar on this date.
 * Uses deterministic rotation for tiebreaking to ensure strict equal distribution.
 */
function pickPathiBalanced(
  counts: Record<string, number>,
  pathis: string[],
  bookedForDate: Set<string>,
  slotRotation: Record<string, number>,
  slotName: string,
  pathiSlots?: Record<string, string[]>,
  pathiExcludedGhars?: Record<string, string[]>,
  currentGharName?: string
): string {
  // First filter: exclude pathis already assigned ANYWHERE on this date
  let available = pathis.filter((p) => !bookedForDate.has(p));

  // If pathiSlots map is provided, only include pathis eligible for this slot
  if (pathiSlots) {
    available = available.filter((p) => {
      const eligible = pathiSlots[p];
      return eligible ? eligible.includes(slotName) : true;
    });
  }

  // If pathiExcludedGhars map is provided, exclude pathis banned from this ghar
  if (pathiExcludedGhars && currentGharName) {
    available = available.filter((p) => {
      const excluded = pathiExcludedGhars[p];
      return excluded ? !excluded.includes(currentGharName) : true;
    });
  }

  if (available.length === 0) {
    // All pathis already booked on this date.
    // This means there aren't enough pathis for the number of slots.
    // Fallback: pick the least-assigned pathi for this slot overall (cross-date).
    const sorted = [...pathis].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0));
    return sorted[0];
  }

  const minCount = Math.min(...available.map((p) => counts[p] ?? 0));
  const candidates = available.filter((p) => (counts[p] ?? 0) === minCount);

  if (candidates.length === 1) {
    return candidates[0];
  }

  // Deterministic rotation: pick from candidates using rotation index
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

  // Validate: check for conflicts
  // 1. Same pathi in multiple slots at same ghar/date
  // 2. Same pathi at different ghars on same date
  const conflicts: string[] = [];

  // Check per-ghar conflicts (same pathi in multiple slots at one ghar)
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
        conflicts.push(`Ghar conflict ${key}: ${usedPathis.join(", ")} (duplicate at same place!)`);
      }
    }
  }

  // Check cross-ghar conflicts (same pathi at different places on same date)
  const datePathiMap: Record<string, Map<string, string[]>> = {};
  for (const e of entries) {
    if (!datePathiMap[e.entry.date]) datePathiMap[e.entry.date] = new Map();
    const pathiPlaces = datePathiMap[e.entry.date];
    const allPathis = [e.pathiA, e.pathiB, e.pathiC, e.pathiD].filter(p => p && p !== "N/A");
    for (const p of allPathis) {
      if (!pathiPlaces.has(p)) pathiPlaces.set(p, []);
      pathiPlaces.get(p)!.push(e.gharName);
    }
  }
  for (const [date, pathiPlaces] of Object.entries(datePathiMap)) {
    for (const [pathi, places] of pathiPlaces) {
      if (places.length > 1) {
        conflicts.push(`Date conflict ${date}: "${pathi}" at ${places.join(" + ")} (same person at multiple places!)`);
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

  // Log conflicts if any
  if (conflicts.length > 0) {
    console.error(`[Pathi Engine] ${conflicts.length} conflicts detected!`, conflicts.slice(0, 20));
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
