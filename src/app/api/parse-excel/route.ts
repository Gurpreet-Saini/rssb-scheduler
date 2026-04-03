import { NextRequest, NextResponse } from "next/server";
import { parseExcelBuffer } from "@/lib/excel-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json({ error: "Please upload an Excel file (.xlsx or .xls)" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const schedule = parseExcelBuffer(buffer);

    return NextResponse.json({ success: true, data: schedule });
  } catch (error) {
    console.error("Excel parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse Excel file. Please ensure the file has the correct Satsang Schedule format." },
      { status: 500 }
    );
  }
}
