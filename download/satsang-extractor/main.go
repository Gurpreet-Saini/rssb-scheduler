package main

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

// DateColumn maps Excel column index to date label and month info
type DateColumn struct {
	ColIndex int
	Date     string
	Month    string
	Time     string
}

// SatsangEntry holds data for a single satsang session
type SatsangEntry struct {
	Date  string
	Month string
	Time  string
	SK    string
	Shabad string
	Bani  string
	Book  string
}

// SatsangGhar holds all info for one Satsang Ghar
type SatsangGhar struct {
	SrNo    int
	Name    string
	Category string
	Entries []SatsangEntry
}

// Schedule holds the complete schedule
type Schedule struct {
	Title  string
	Ghars  []SatsangGhar
	Columns []DateColumn
}

func getCellValue(f *excelize.File, sheet, axis string) string {
	val, err := f.GetCellValue(sheet, axis)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(val)
}

func extractSchedule(filePath string) (*Schedule, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer f.Close()

	sheet := f.GetSheetName(0)

	// Read title
	title := getCellValue(f, sheet, "A1")
	if title == "" {
		title = "Satsang Schedule"
	}

	// Read month info and times from row 3
	monthInfo := map[string]string{
		"APRIL": getCellValue(f, sheet, "E3"),
		"MAY":   getCellValue(f, sheet, "I3"),
		"JUNE":  getCellValue(f, sheet, "N3"),
	}

	// Define date columns: column letter -> date display
	dateColumns := []struct {
		Col      string
		ColIdx   int
		Month    string
		Time     string
	}{
		{"E", 5, "APRIL", "09:30 AM"}, {"F", 6, "APRIL", "09:30 AM"},
		{"G", 7, "APRIL", "09:30 AM"}, {"H", 8, "APRIL", "09:30 AM"},
		{"I", 9, "MAY", "09:00 AM"}, {"J", 10, "MAY", "09:00 AM"},
		{"K", 11, "MAY", "09:00 AM"}, {"L", 12, "MAY", "09:00 AM"},
		{"M", 13, "MAY", "09:00 AM"},
		{"N", 14, "JUNE", "09:00 AM"}, {"O", 15, "JUNE", "09:00 AM"},
		{"P", 16, "JUNE", "09:00 AM"}, {"Q", 17, "JUNE", "09:00 AM"},
	}

	// Extract proper time from the header cells
	for i := range dateColumns {
		if timeStr, ok := monthInfo[dateColumns[i].Month]; ok {
			parts := strings.Fields(timeStr)
			if len(parts) >= 2 {
				dateColumns[i].Time = strings.Join(parts[1:], " ")
			}
		}
	}

	// Read date values from row 4
	for i := range dateColumns {
		colLetter := dateColumns[i].Col
		cellVal := getCellValue(f, sheet, fmt.Sprintf("%s4", colLetter))
		if cellVal != "" {
			dateColumns[i].Month = strings.ToUpper(dateColumns[i].Month)
			// cellVal will be a date like "2026-04-05"
			if t, err := time.Parse("2006-01-02", cellVal); err == nil {
				dateColumns[i].Col = t.Format("2 Jan 2006")
			} else {
				dateColumns[i].Col = cellVal
			}
		}
	}

	// Parse Satsang Ghars - each takes 4 rows starting from row 5
	// Row pattern: Header(SK), Shabad, Bani, Book
	var ghars []SatsangGhar

	for row := 5; row <= 24; row += 4 {
		srNo := getCellValue(f, sheet, fmt.Sprintf("A%d", row))
		if srNo == "" {
			continue
		}

		name := getCellValue(f, sheet, fmt.Sprintf("B%d", row))
		category := getCellValue(f, sheet, fmt.Sprintf("C%d", row))

		ghar := SatsangGhar{
			Name:    name,
			Category: category,
		}
		fmt.Sscanf(srNo, "%d", &ghar.SrNo)

		// Extract entries for each date column
		for _, dc := range dateColumns {
			colIdx := dc.ColIdx
			colLetter, _ := excelize.ColumnNumberToName(colIdx)

			skVal := getCellValue(f, sheet, fmt.Sprintf("%s%d", colLetter, row))
			shabadVal := getCellValue(f, sheet, fmt.Sprintf("%s%d", colLetter, row+1))
			baniVal := getCellValue(f, sheet, fmt.Sprintf("%s%d", colLetter, row+2))
			bookVal := getCellValue(f, sheet, fmt.Sprintf("%s%d", colLetter, row+3))

			// Clean up multiline values
			bookVal = strings.ReplaceAll(bookVal, "\n", " ")

			entry := SatsangEntry{
				Date:  dc.Col,
				Month: dc.Month,
				Time:  dc.Time,
				SK:    skVal,
				Shabad: shabadVal,
				Bani:  baniVal,
				Book:  bookVal,
			}
			ghar.Entries = append(ghar.Entries, entry)
		}

		ghars = append(ghars, ghar)
	}

	return &Schedule{
		Title: title,
		Ghars: ghars,
	}, nil
}

func printSchedule(schedule *Schedule) {
	// Print header
	fmt.Println(strings.Repeat("=", 100))
	fmt.Printf("  %s\n", schedule.Title)
	fmt.Println(strings.Repeat("=", 100))
	fmt.Println()

	// Define category meanings
	categoryMeanings := map[string]string{
		"SP": "Special",
		"SC": "Sub-Center",
		"C":  "Center",
	}

	for _, ghar := range schedule.Ghars {
		fmt.Println(strings.Repeat("-", 80))
		catDesc := ghar.Category
		if v, ok := categoryMeanings[ghar.Category]; ok {
			catDesc = fmt.Sprintf("%s (%s)", ghar.Category, v)
		}
		fmt.Printf("  [%d] %s  —  Category: %s\n", ghar.SrNo, ghar.Name, catDesc)
		fmt.Println(strings.Repeat("-", 80))
		fmt.Println()

		// Table header
		fmt.Printf("  %-18s | %-25s | %-30s\n", "Date & Time", "Name of SK", "Shabad")
		fmt.Printf("  %-18s-+-%-25s-+-%-30s\n", strings.Repeat("-", 18), strings.Repeat("-", 25), strings.Repeat("-", 30))

		for _, entry := range ghar.Entries {
			// Format date
			dateTime := fmt.Sprintf("%s (%s)", entry.Date, entry.Time)

			// Truncate fields for display
			sk := entry.SK
			if len(sk) > 25 {
				sk = sk[:22] + "..."
			}
			shabad := entry.Shabad
			if len(shabad) > 30 {
				shabad = shabad[:27] + "..."
			}

			fmt.Printf("  %-18s | %-25s | %-30s\n", dateTime, sk, shabad)
		}

		fmt.Println()
		fmt.Printf("  %-18s | %-25s | %-30s\n", "Date & Time", "Bani Source", "Book Reference")
		fmt.Printf("  %-18s-+-%-25s-+-%-30s\n", strings.Repeat("-", 18), strings.Repeat("-", 25), strings.Repeat("-", 30))

		for _, entry := range ghar.Entries {
			dateTime := fmt.Sprintf("%s (%s)", entry.Date, entry.Time)

			bani := entry.Bani
			if len(bani) > 25 {
				bani = bani[:22] + "..."
			}
			book := entry.Book
			if len(book) > 30 {
				book = book[:27] + "..."
			}

			fmt.Printf("  %-18s | %-25s | %-30s\n", dateTime, bani, book)
		}

		fmt.Println()
	}
}

func generateCSV(schedule *Schedule, outputPath string) error {
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Write CSV header
	fmt.Fprintln(file, "Sr No,Satsang Ghar,Category,Date,Time,Name of SK,Shabad,Bani,Book")

	for _, ghar := range schedule.Ghars {
		for _, entry := range ghar.Entries {
			// Escape CSV fields containing commas
			escape := func(s string) string {
				if strings.Contains(s, ",") || strings.Contains(s, "\"") {
					return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
				}
				return s
			}

			line := fmt.Sprintf("%d,%s,%s,%s,%s,%s,%s,%s,%s",
				ghar.SrNo,
				escape(ghar.Name),
				escape(ghar.Category),
				escape(entry.Date),
				escape(entry.Time),
				escape(entry.SK),
				escape(entry.Shabad),
				escape(entry.Bani),
				escape(entry.Book),
			)
			fmt.Fprintln(file, line)
		}
	}

	return nil
}

func generateJSON(schedule *Schedule, outputPath string) error {
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	fmt.Fprintln(file, "{")
	fmt.Fprintf(file, "  \"title\": %q,\n", schedule.Title)
	fmt.Fprintln(file, "  \"satsang_ghars\": [")

	for i, ghar := range schedule.Ghars {
		fmt.Fprintf(file, "    {\n")
		fmt.Fprintf(file, "      \"sr_no\": %d,\n", ghar.SrNo)
		fmt.Fprintf(file, "      \"name\": %q,\n", ghar.Name)
		fmt.Fprintf(file, "      \"category\": %q,\n", ghar.Category)
		fmt.Fprintln(file, "      \"schedule\": [")

		for j, entry := range ghar.Entries {
			fmt.Fprintf(file, "        {\n")
			fmt.Fprintf(file, "          \"date\": %q,\n", entry.Date)
			fmt.Fprintf(file, "          \"time\": %q,\n", entry.Time)
			fmt.Fprintf(file, "          \"name_of_sk\": %q,\n", entry.SK)
			fmt.Fprintf(file, "          \"shabad\": %q,\n", entry.Shabad)
			fmt.Fprintf(file, "          \"bani\": %q,\n", entry.Bani)
			fmt.Fprintf(file, "          \"book\": %q\n", entry.Book)
			if j < len(ghar.Entries)-1 {
				fmt.Fprintln(file, "        },")
			} else {
				fmt.Fprintln(file, "        }")
			}
		}

		fmt.Fprintln(file, "      ]")
		if i < len(schedule.Ghars)-1 {
			fmt.Fprintln(file, "    },")
		} else {
			fmt.Fprintln(file, "    }")
		}
	}

	fmt.Fprintln(file, "  ]")
	fmt.Fprintln(file, "}")

	return nil
}

func generateSummary(schedule *Schedule, outputPath string) error {
	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	// Count stats
	totalSessions := 0
	vcdCount := 0
	uniqueSKs := make(map[string]bool)
	uniqueShabads := make(map[string]bool)

	for _, ghar := range schedule.Ghars {
		for _, entry := range ghar.Entries {
			totalSessions++
			if entry.SK == "VCD" {
				vcdCount++
			}
			if entry.SK != "VCD" && entry.SK != "" {
				uniqueSKs[entry.SK] = true
			}
			if entry.Shabad != "" && entry.Shabad != "VCD" {
				uniqueShabads[entry.Shabad] = true
			}
		}
	}

	w := file
	fmt.Fprintf(w, "SATSANG SCHEDULE SUMMARY\n")
	fmt.Fprintf(w, "========================\n\n")
	fmt.Fprintf(w, "Title: %s\n\n", schedule.Title)
	fmt.Fprintf(w, "Total Satsang Ghars:      %d\n", len(schedule.Ghars))
	fmt.Fprintf(w, "Total Scheduled Sessions: %d\n", totalSessions)
	fmt.Fprintf(w, "VCD Sessions:             %d\n", vcdCount)
	fmt.Fprintf(w, "Live Sessions:            %d\n", totalSessions-vcdCount)
	fmt.Fprintf(w, "Unique Speakers (SK):     %d\n", len(uniqueSKs))
	fmt.Fprintf(w, "Unique Shabads:           %d\n\n", len(uniqueShabads))

	fmt.Fprintf(w, "SATSANG GHAR DETAILS\n")
	fmt.Fprintf(w, "--------------------\n\n")

	for _, ghar := range schedule.Ghars {
		liveCount := 0
		for _, e := range ghar.Entries {
			if e.SK != "VCD" && e.SK != "" {
				liveCount++
			}
		}
		fmt.Fprintf(w, "  %d. %s [%s] — %d live sessions, %d VCD sessions\n",
			ghar.SrNo, ghar.Name, ghar.Category, liveCount, len(ghar.Entries)-liveCount)
	}

	fmt.Fprintf(w, "\nALL UNIQUE SPEAKERS (Sewa Karta)\n")
	fmt.Fprintf(w, "---------------------------------\n")
	i := 1
	for sk := range uniqueSKs {
		fmt.Fprintf(w, "  %d. %s\n", i, sk)
		i++
	}

	fmt.Fprintf(w, "\nALL UNIQUE SHABADS\n")
	fmt.Fprintf(w, "------------------\n")
	i = 1
	for s := range uniqueShabads {
		fmt.Fprintf(w, "  %d. %s\n", i, s)
		i++
	}

	return nil
}

func main() {
	excelPath := "/home/z/my-project/upload/MAIN APRIL.xlsx"
	outputDir := "/home/z/my-project/download/satsang-extractor"

	if len(os.Args) > 1 {
		excelPath = os.Args[1]
	}

	// Extract data from Excel
	schedule, err := extractSchedule(excelPath)
	if err != nil {
		log.Fatalf("Error extracting schedule: %v", err)
	}

	// 1. Print formatted output to console
	fmt.Println("\n")
	printSchedule(schedule)
	fmt.Println(strings.Repeat("=", 100))
	fmt.Println("  EXTRACTION COMPLETE")
	fmt.Println(strings.Repeat("=", 100))
	fmt.Println()

	// 2. Generate CSV
	csvPath := outputDir + "/satsang_schedule.csv"
	if err := generateCSV(schedule, csvPath); err != nil {
		log.Printf("Error generating CSV: %v", err)
	} else {
		fmt.Printf("  CSV file saved:  %s\n", csvPath)
	}

	// 3. Generate JSON
	jsonPath := outputDir + "/satsang_schedule.json"
	if err := generateJSON(schedule, jsonPath); err != nil {
		log.Printf("Error generating JSON: %v", err)
	} else {
		fmt.Printf("  JSON file saved: %s\n", jsonPath)
	}

	// 4. Generate Summary
	summaryPath := outputDir + "/satsang_summary.txt"
	if err := generateSummary(schedule, summaryPath); err != nil {
		log.Printf("Error generating summary: %v", err)
	} else {
		fmt.Printf("  Summary saved:   %s\n", summaryPath)
	}

	fmt.Println()
	fmt.Println("  All output files generated successfully!")
	fmt.Println()
}
