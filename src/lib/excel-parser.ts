import * as XLSX from "xlsx";

export interface SatsangEntry {
  date: string;
  month: string;
  time: string;
  nameOfSK: string;
  shabad: string;
  bani: string;
  book: string;
}

export interface SatsangGhar {
  srNo: number;
  name: string;
  category: string;
  entries: SatsangEntry[];
}

export interface ScheduleSummary {
  totalGhars: number;
  totalSessions: number;
  vcdSessions: number;
  liveSessions: number;
  uniqueSpeakers: number;
  uniqueShabads: number;
  speakerList: string[];
  shabadList: string[];
}

export interface SatsangSchedule {
  title: string;
  ghars: SatsangGhar[];
  summary: ScheduleSummary;
}

function getVal(sheet: XLSX.WorkSheet, cell: string): string {
  const c = sheet[cell];
  if (!c || c.v === undefined || c.v === null) return "";
  return String(c.v).trim();
}

function formatExcelDate(raw: string): string {
  if (!raw) return "";
  // Excel serial date or already formatted
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw + "T00:00:00");
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  // Try parsing as Excel serial number
  const num = Number(raw);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + num);
    return epoch.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  return raw;
}

const COL_LETTERS = ["E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q"];

function getMonthTimeForCol(col: string, sheet: XLSX.WorkSheet): { month: string; time: string } {
  if (["E", "F", "G", "H"].includes(col)) return { month: "April", time: "09:30 AM" };
  if (["I", "J", "K", "L", "M"].includes(col)) return { month: "May", time: "09:00 AM" };
  return { month: "June", time: "09:00 AM" };
}

export function parseExcelBuffer(buffer: ArrayBuffer): SatsangSchedule {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // Title from A1
  const title = getVal(sheet, "A1") || "Satsang Schedule";

  // Read dates from row 4
  const dateMap: Record<string, string> = {};
  for (const col of COL_LETTERS) {
    const raw = getVal(sheet, `${col}4`);
    dateMap[col] = formatExcelDate(raw);
  }

  // Parse each satsang ghar (rows 5, 9, 13, 17, 21 — every 4 rows)
  const ghars: SatsangGhar[] = [];
  for (let row = 5; row <= 24; row += 4) {
    const srNoStr = getVal(sheet, `A${row}`);
    if (!srNoStr) continue;

    const srNo = parseInt(srNoStr, 10) || 0;
    const name = getVal(sheet, `B${row}`);
    const category = getVal(sheet, `C${row}`);
    const entries: SatsangEntry[] = [];

    for (const col of COL_LETTERS) {
      const { month, time } = getMonthTimeForCol(col, sheet);
      const colNum = XLSX.utils.decode_col(col);

      entries.push({
        date: dateMap[col] || "",
        month,
        time,
        nameOfSK: getVal(sheet, XLSX.utils.encode_cell({ r: row - 1, c: colNum })),
        shabad: getVal(sheet, XLSX.utils.encode_cell({ r: row, c: colNum })),
        bani: getVal(sheet, XLSX.utils.encode_cell({ r: row + 1, c: colNum })).replace(/[\r\n]+/g, " "),
        book: getVal(sheet, XLSX.utils.encode_cell({ r: row + 2, c: colNum })).replace(/[\r\n]+/g, " "),
      });
    }

    ghars.push({ srNo, name, category, entries });
  }

  // Calculate summary
  const uniqueSpeakers = new Set<string>();
  const uniqueShabads = new Set<string>();
  let totalSessions = 0;
  let vcdSessions = 0;

  for (const ghar of ghars) {
    for (const entry of ghar.entries) {
      totalSessions++;
      if (entry.nameOfSK === "VCD") {
        vcdSessions++;
      } else if (entry.nameOfSK) {
        uniqueSpeakers.add(entry.nameOfSK);
      }
      if (entry.shabad && entry.shabad !== "VCD") {
        uniqueShabads.add(entry.shabad);
      }
    }
  }

  return {
    title,
    ghars,
    summary: {
      totalGhars: ghars.length,
      totalSessions,
      vcdSessions,
      liveSessions: totalSessions - vcdSessions,
      uniqueSpeakers: uniqueSpeakers.size,
      uniqueShabads: uniqueShabads.size,
      speakerList: Array.from(uniqueSpeakers).sort(),
      shabadList: Array.from(uniqueShabads).sort(),
    },
  };
}
