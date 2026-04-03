import { NextRequest, NextResponse } from "next/server";
import { assignPathis, calculateMinPathis } from "@/lib/pathi-engine";
import {
  GenerateScheduleResponse,
} from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleData, pathis, baalSatsangGhars } = body;

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

    // Calculate validation info
    const validation = calculateMinPathis(scheduleData, baalSatsangGhars);

    // Check if pathis are critically insufficient
    if (uniquePathis.length < validation.minimum) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient pathis. You need at least ${validation.minimum} pathis (you have ${uniquePathis.length}). ${validation.details}`,
          validation,
        },
        { status: 400 }
      );
    }

    // Check if pathis are fewer than recommended
    let warning: string | undefined;
    if (uniquePathis.length < validation.recommended) {
      warning = `You have ${uniquePathis.length} pathis. Recommended: ${validation.recommended}+ for balanced distribution. With fewer pathis, some may get significantly more assignments than others.`;
    }

    const generated = assignPathis(scheduleData, {
      pathis: uniquePathis,
      baalSatsangGhars,
    });

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
