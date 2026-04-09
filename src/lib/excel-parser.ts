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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatExcelDate(raw: string): string {
  if (!raw) return "";

  // Already in "DD MMM YYYY" format (e.g. "06 Apr 2026")
  if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(raw.trim())) {
    return raw.trim();
  }

  // ISO "YYYY-MM-DD" format
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw + "T00:00:00");
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = SHORT_MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  }

  // Excel serial number
  const num = Number(raw);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + num);
    const day = String(epoch.getDate()).padStart(2, "0");
    const month = SHORT_MONTHS[epoch.getMonth()];
    const year = epoch.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return raw;
}

function getMonthTimeFromDate(dateStr: string): { month: string; time: string } {
  // Expect format "DD MMM YYYY" e.g. "06 Apr 2026"
  const match = /^\d{1,2}\s+([A-Za-z]{3})\s+\d{4}$/.exec(dateStr.trim());
  const shortMonth = match ? match[1] : "";

  // April has 09:30 AM, others 09:00 AM
  const time = shortMonth === "Apr" ? "09:30 AM" : "09:00 AM";

  // Map short month to full month name for consistency
  const monthMap: Record<string, string> = {
    Jan: "January", Feb: "February", Mar: "March", Apr: "April",
    May: "May", Jun: "June", Jul: "July", Aug: "August",
    Sep: "September", Oct: "October", Nov: "November", Dec: "December",
  };

  return {
    month: shortMonth ? (monthMap[shortMonth] || shortMonth) : "",
    time,
  };
}

export function parseExcelBuffer(buffer: ArrayBuffer): SatsangSchedule {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // Title from A1
  const title = getVal(sheet, "A1") || "Satsang Schedule";

  // Dynamic column detection: read dates from row 4 starting at column E (index 4)
  const columns: string[] = [];
  const dateMap: Record<string, string> = {};
  
  // Starting from column E (index 4) up to a reasonable limit (e.g. 50 columns)
  for (let c = 4; c < 50; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    const raw = getVal(sheet, `${colLetter}4`);
    if (!raw) break; // Stop at first empty date
    
    columns.push(colLetter);
    dateMap[colLetter] = formatExcelDate(raw);
  }

  // Parse each satsang ghar (starting row 5, every 4 rows)
  const ghars: SatsangGhar[] = [];
  // Dynamic row detection: continue as long as Sr No exists in column A
  for (let row = 5; row <= 500; row += 4) {
    const srNoStr = getVal(sheet, `A${row}`);
    if (!srNoStr) break;

    const srNo = parseInt(srNoStr, 10) || 0;
    const name = getVal(sheet, `B${row}`);
    const category = getVal(sheet, `C${row}`);
    const entries: SatsangEntry[] = [];

    for (const col of columns) {
      const dateStr = dateMap[col] || "";
      const { month, time } = getMonthTimeFromDate(dateStr);
      const colNum = XLSX.utils.decode_col(col);

      entries.push({
        date: dateStr,
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
      if (!entry.date) continue; // Skip empty entries if any
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
