import { NextRequest, NextResponse } from "next/server";
import { assignPathis, calculateMinPathis } from "@/lib/pathi-engine";
import {
  GenerateScheduleResponse,
} from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleData, pathis, baalSatsangGhars, pathiSlots, pathiExcludedGhars } = body;

    if (!scheduleData || !scheduleData.ghars || scheduleData.ghars.length === 0) {
      return NextResponse.json(
        { success: false, error: "No schedule data provided. Please upload an Excel file first." },
        { status: 400 }
      );
    }

    if (!pathis || pathis.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one pathi is required to generate the schedule." },
        { status: 400 }
      );
    }

    if (!Array.isArray(baalSatsangGhars)) {
      return NextResponse.json(
        { success: false, error: "Invalid Baal Satsang configuration." },
        { status: 400 }
      );
    }

    const validGharNames = new Set(scheduleData.ghars.map((g) => g.name));
    const invalidGhars = baalSatsangGhars.filter((g) => !validGharNames.has(g));
    if (invalidGhars.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid Baal Satsang ghar names: ${invalidGhars.join(", ")}` },
        { status: 400 }
      );
    }

    const uniquePathis = [...new Set(pathis.map((p) => p.trim()).filter(Boolean))];
    if (uniquePathis.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid pathi names provided." },
        { status: 400 }
      );
    }

    // Build the config object
    const config: { pathis: string[]; baalSatsangGhars: string[]; pathiSlots?: Record<string, string[]>; pathiExcludedGhars?: Record<string, string[]> } = {
      pathis: uniquePathis,
      baalSatsangGhars,
    };

    // Only include pathiSlots if provided and non-empty
    if (pathiSlots && typeof pathiSlots === "object" && Object.keys(pathiSlots).length > 0) {
      config.pathiSlots = pathiSlots;
    }

    // Only include pathiExcludedGhars if provided and non-empty
    if (pathiExcludedGhars && typeof pathiExcludedGhars === "object" && Object.keys(pathiExcludedGhars).length > 0) {
      config.pathiExcludedGhars = pathiExcludedGhars;
    }

    // Calculate validation info
    const validation = calculateMinPathis(scheduleData, baalSatsangGhars);

    // Check if pathis are critically insufficient
    // A pathi can only be at ONE place on ONE date (all satsangs happen at the same time).
    // So we need at least as many pathis as the total slots on the busiest date.
    if (uniquePathis.length < validation.minimum) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient pathis! You have ${uniquePathis.length} pathis but need at least ${validation.minimum}. All satsangs happen at the same time, so each pathi can only be at one place per date. The busiest date has ${validation.maxPerSlot} slot assignments across all ghars. Each pathi fills only one slot per date. Please add at least ${validation.minimum - uniquePathis.length} more pathi${validation.minimum - uniquePathis.length > 1 ? "s" : ""} before generating.`,
          validation,
        },
        { status: 400 }
      );
    }

    // Check if pathis are fewer than recommended
    let warning: string | undefined;
    if (uniquePathis.length < validation.recommended) {
      warning = `You have ${uniquePathis.length} pathis. Recommended: ${validation.recommended}+ for well-balanced distribution. With fewer pathis, the same person may need to fill multiple slots on a date.`;
    }

    const generated = assignPathis(scheduleData, config);

    const response: GenerateScheduleResponse = {
      success: true,
      data: generated,
      validation,
      warning,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Schedule generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate schedule";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
