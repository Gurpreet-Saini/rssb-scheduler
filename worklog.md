---
Task ID: 1
Agent: Main Agent
Task: Write a Go program to extract Satsang Schedule data from MAIN APRIL.xlsx

Work Log:
- Examined the Excel file structure: 1 sheet "Table 1", 24 rows x 17 columns
- Identified structure: 5 Satsang Ghars (BADHOUR, BHOOD, HANGOLA, RAIPUR RANI, TIKKAR TAAL), each with 13 date columns (Apr-Jun 2026)
- Each ghar has 4 rows: SK Name, Shabad, Bani, Book Reference
- Installed Go 1.22.0 and excelize library (v2.10.1)
- Wrote main.go with full extraction logic, CSV output, JSON output, and summary report generation
- Built and ran the program successfully

Stage Summary:
- Program: /home/z/my-project/download/satsang-extractor/main.go
- Binary: /home/z/my-project/download/satsang-extractor/satsang-extractor
- Outputs: satsang_schedule.csv, satsang_schedule.json, satsang_summary.txt
- Extracted: 5 Satsang Ghars, 65 sessions (50 live + 15 VCD), 40 unique speakers, 44 unique shabads
---
Task ID: 2
Agent: Main Agent
Task: Convert Go Satsang extractor into React/Next.js web application

Work Log:
- Initialized fullstack-dev environment (Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui)
- Installed xlsx (SheetJS) library for Excel parsing
- Created Excel parser library (src/lib/excel-parser.ts) with TypeScript interfaces and parsing logic
- Built API route (src/app/api/parse-excel/route.ts) to handle file uploads and return parsed JSON
- Built FileUpload component with drag & drop support and file validation
- Built SummaryCards component showing 6 key stats (ghars, sessions, VCD, live, speakers, shabads)
- Built SatsangGharCard component with expandable schedule and tabbed view (Full Schedule / Details)
- Built ListsDisplay component showing unique speakers and shabads in scrollable cards
- Built main page with upload flow, schedule display, and CSV/JSON export buttons
- Fixed newline character handling in book/bani fields
- Verified API endpoint returns correct data (5 ghars, 65 sessions, 40 speakers, 44 shabads)
- Lint passes clean, dev server compiles successfully

Stage Summary:
- Complete Next.js web app for Excel upload and schedule extraction
- Preview URL: https://preview-chat-fd6634eb-9b4e-4061-a58f-df7638ce26ba.space.z.ai/
---
Task ID: 3
Agent: Main Agent
Task: Build unified Satsang Schedule Management System with pathi assignment engine

Work Log:
- Created `src/lib/types.ts` — Unified TypeScript type definitions for the entire system including PathiConfig, AssignedScheduleEntry, SlotMetrics, PathiSlotInfo, SKDistribution, PathiMetrics, GharAssignmentSummary, GeneratedSchedule, and API request/response types
- Created `src/lib/pathi-engine.ts` — Core pathi assignment algorithm implementing:
  - Date-by-date processing to prevent same-date double-booking
  - Load balancing via least-assigned pathi selection with random tie-breaking
  - VCD handling (Pathi-A = "N/A", still assigns Pathi-B and Pathi-C)
  - Baal Satsang support (Pathi-D slot for enabled ghars)
  - Comprehensive metrics calculation (per-slot distribution, SK distribution, ghar summaries)
  - Standard deviation calculation for balance indicators
- Created `src/app/api/generate-schedule/route.ts` — POST API endpoint that validates input, deduplicates pathis, runs the engine, and returns generated schedule with metrics
- Created `src/components/satsang/step-indicator.tsx` — 3-step horizontal progress bar with Upload/Configure/Generate steps, amber/emerald color coding, connector lines, and checkmark for completed steps
- Created `src/components/satsang/pathi-manager.tsx` — Two-panel configuration component:
  - Left panel: Pathi list management (add/remove with input field, slot count calculations)
  - Right panel: Baal Satsang toggles per Satsang Ghar with purple highlighting, generate button
- Created `src/components/satsang/schedule-table.tsx` — Full sortable/filterable schedule table:
  - Columns: Date, Place, SK, Shabad, Pathi-A/B/C/D
  - Sortable by date, place, and each pathi column
  - Filterable by Satsang Ghar via dropdown
  - Color-coded: VCD rows dimmed, Baal Satsang rows purple-tinted, N/A in gray italic
  - CSV export with dynamic column inclusion based on Baal Satsang presence
  - Legend showing visual indicators
- Created `src/components/satsang/analytics-dashboard.tsx` — Comprehensive analytics:
  - Top stats cards (Total Programs, Live Sessions, VCD Sessions, Pathis count)
  - SK Distribution table with live/VCD/total breakdown
  - Pathi Load Distribution with mini bar charts per slot and balance indicators (green/amber/red)
  - Per-Pathi Summary table showing slot-by-slot assignment counts
  - Satsang Ghar Summary cards grid
- Rewrote `src/app/page.tsx` — 3-step wizard flow:
  - Step 1: Upload Excel file, preview extracted data with SummaryCards and SatsangGharCards
  - Step 2: Configure pathis and Baal Satsang, then generate
  - Step 3: View generated schedule table + analytics dashboard
  - Sticky header with app title, step indicator always visible, navigation buttons
- Fixed ESLint error: moved SortIcon component outside parent component definition
- Lint passes clean, dev server compiles successfully

Stage Summary:
- Complete unified Satsang Schedule Management System with Excel upload → Pathi configuration → Schedule generation workflow
- All 8 files created/rewritten successfully
- Pathi engine handles all business rules: VCD N/A, Baal Satsang Pathi-D, load balancing, conflict prevention
- Clean warm color scheme (amber primary, emerald success, rose alerts, purple for Baal Satsang)

---
Task ID: 3
Agent: Main Agent
Task: Fix UI for generate schedule, add pathi insufficiency errors, ensure equal distribution

Work Log:
- Identified root cause: bookedOnDate set was shared across ALL slots, blocking a pathi from different slots on the same date — preventing equal distribution
- Rewrote pathi-engine.ts with per-slot booking (bookedSlot["A"], bookedSlot["B"], etc.) — each slot tracks independently
- Added calculateMinPathis() function to compute minimum/recommended pathis needed
- Updated API route with validation: blocks if pathis < minimum (400), warns if < recommended
- Rewrote pathi-manager.tsx: red error banner for insufficient, amber warning for below recommended, slot requirements panel
- Rewrote schedule-table.tsx: color-coded pathi badges per slot (A=sky, B=emerald, C=amber, D=purple), includes bani/book in CSV export
- Rewrote analytics-dashboard.tsx: distribution quality banner, per-slot bar charts with counts, color-coded per-pathi summary
- Updated page.tsx: Regenerate button, Edit Config navigation, warning display, proper header controls

Stage Summary:
- Equal distribution verified: with 6 pathis, range is only 1 per slot (e.g., Slot-A: 8-9, Slot-B: 10-11)
- Per-pathi totals: 34-35 total (very balanced)
- Zero same-slot conflicts
- Insufficient pathis (< 5): returns clear error with minimum count
- Below recommended (< 7): returns warning but still generates
- ESLint passes clean, dev server compiles

---
Task ID: 1
Agent: main
Task: Fix UI overlapping, add insufficient pathis error, implement equal distribution for Pathi A/B/C

Work Log:
- Analyzed screenshot using VLM to identify overlapping UI elements
- Fixed ScheduleTable component: restructured CardHeader layout from single flex-row to two separate rows (title+actions row, filter row) to prevent title overlapping with filter controls
- Fixed AnalyticsDashboard: added relative z-index, changed banner layout to items-start for proper text alignment
- Fixed StepIndicator: added bottom margin and responsive connector line positioning
- Fixed Page Step 3 layout: changed header to flex-col/sm:flex-row for responsive behavior, increased spacing from space-y-4 to space-y-6
- Enhanced insufficient pathis error in PathiManager: upgraded to larger, more prominent error card with icon circle, bold title, and detailed explanation
- Improved generate button states: shows "Cannot Generate — Need X Pathis" when insufficient, "Add Pathis to Generate" when empty, with disabled gray styling
- Enhanced API validation: more detailed error message explaining why X pathis are needed per date
- Rewrote pathi-engine.ts: replaced random tiebreaking with deterministic per-slot rotation index, ensuring strict equal distribution across Pathi A, B, C slots
- Removed random shuffling of entries — now uses deterministic sorted order for reproducible results
- Extended toast duration for error messages to 6000ms

Stage Summary:
- UI overlapping fixed across ScheduleTable, AnalyticsDashboard, StepIndicator, and main page
- Insufficient pathis validation is now prominently displayed with clear error messaging and disabled generate button
- Equal distribution algorithm now uses deterministic rotation instead of random selection for tighter balance
- Build passes successfully

---
Task ID: 7
Agent: main
Task: Fix remaining UI overlapping issues (user reported "still overlapping")

Work Log:
- Analyzed user's two new screenshots using VLM and browser automation
- Discovered critical bug: layout.tsx imported `<Toaster />` from shadcn/ui but all components use `toast` from `sonner` - this caused sonner toasts to auto-render at default top-right position, overlapping with the sticky header buttons on Step 3
- Fixed layout.tsx to import `<Toaster />` from `@/components/ui/sonner` instead of `@/components/ui/toaster`
- Updated sonner.tsx to use `position="bottom-right"` so toasts no longer overlap with header
- Rewrote header: fixed height `h-14` instead of auto padding, compact button labels (JSON/Redo/Reset), `min-w-0` and `shrink-0` to prevent overflow
- Rewrote step indicator: removed all negative margins, used clean `flex items-start` layout with `pt-[18px]` for connector alignment, separate mobile/desktop labels
- Main content: changed from `py-6 space-y-6` to `pt-6 pb-12` with explicit `mb-6` around step indicator
- Step 3: simplified header row, removed duplicate buttons (kept in header only)
- Removed test page and test-schedule.json that were created for debugging

Stage Summary:
- Fixed sonner/shadcn toast system mismatch - root cause of header overlap
- Rewrote step indicator with zero negative margins
- Compacted header to fixed height to prevent layout shift
- Build passes successfully

---
Task ID: 8
Agent: Main Agent
Task: Fix all UI overflow and overlapping issues across PathiManager, AnalyticsDashboard, and ScheduleTable

Work Log:
- Fixed PathiManager (pathi-manager.tsx): Added `overflow-hidden` to both Card components to prevent pathi entries from escaping the card boundary. Changed grid from `md:grid-cols-2` to `lg:grid-cols-2` for better spacing on medium screens.
- Rewrote AnalyticsDashboard (analytics-dashboard.tsx):
  - Improved Pathi Slot Distribution UI: redesigned as full-width card with colored bordered sections per slot, taller bars with rounded tops, larger count labels (10px bold), clearer stats (avg/spread), full pathi names with truncation, color-coded backgrounds per slot (sky/emerald/amber/purple)
  - Fixed Per-Pathi Summary overflow: Added `overflow-hidden` to Card, moved `p-0` to CardContent, constrained pathi names to `max-w-[120px]` with truncation
  - Fixed Satsang Ghar Summary overflow: Moved from a side-by-side grid card to full-width Card with ScrollArea (`max-h-[300px]`) and divide-y list layout with proper padding
  - Changed Per-Pathi + SK Distribution grid from `md:grid-cols-2` to `lg:grid-cols-2`
  - All Cards now have `overflow-hidden` class
- Completely rewrote ScheduleTable (schedule-table.tsx) for center-grouped display:
  - Entries grouped by Satsang Ghar (center) with collapsible sections
  - Centers sorted by category (SP → SC → C) then alphabetically
  - Each center shows: category badge, name, session count, expand/collapse chevron
  - Expanded view: bordered table with all entries for that center only
  - "Expand All" / "Collapse All" button
  - Auto-expand when filtering to a specific center
  - Filter dropdown, CSV export maintained
  - Slot legend per expanded center
  - No overlapping between center sections (divide-y separators)
  - Removed flat table design in favor of grouped layout

Stage Summary:
- All UI overflow issues resolved: pathi entries contained, per-pathi summary contained, ghar summary contained
- Pathi Slot Distribution UI significantly improved with color-coded sections and larger bars
- ScheduleTable completely redesigned to center-grouped layout showing one center at a time without overlapping
- Build passes successfully

---
Task ID: 9
Agent: Main Agent
Task: Change schedule view to group by CENTER with entries sorted by DATE within each center

Work Log:
- Rewrote schedule-table.tsx to group entries by CENTER (gharName) instead of by date
- Centers sorted by category (SP → SC → C) then alphabetically
- Within each center, entries sorted chronologically by date (improved parseDateSortable to handle "03 May 2026" and "03 May" formats)
- Each center header shows: MapPin icon, category badge, center name, session counts (total/live/VCD), date range
- Expanded view shows Date + Time + SK + Shabad + Pathi A/B/C/D columns
- Filter auto-expands the selected center
- CSV export now sorts by center name, then by date within center
- Removed unused Calendar import, replaced with MapPin icon
- Removed date-keyed expand/collapse state, replaced with center-keyed
- Build passes successfully

Stage Summary:
- Complete Schedule now groups all satsang for each center by date chronologically
- Each collapsible section shows all entries for one center, sorted by date
- Date range displayed in center header (e.g., "03-May → 31-May")
- Build passes successfully

---
Task ID: 10
Agent: Main Agent
Task: Fix critical bug — same pathi assigned to both Pathi-B and Pathi-C at same place on same date

Work Log:
- Analyzed user's screenshot using VLM — confirmed nearly every row had identical Pathi-B and Pathi-C values
- Root cause: pathi-engine.ts used per-slot booking (bookedSlot["A"], bookedSlot["B"], bookedSlot["C"]) which tracked each slot independently. This meant a pathi booked for Slot-B at Place-1 was NOT excluded when picking Slot-C at Place-1 on the same date.
- Fixed pathi-engine.ts: Changed from per-slot booking to per-place-per-date booking (bookedPerGhar). Now when assigning any slot (A, B, C, D) for a ghar on a date, the pathi is added to a shared bookedPerGhar[gharName] set. Subsequent slot assignments at the same ghar on the same date will exclude all already-assigned pathis.
- Updated calculateMinPathis(): Changed minimum from maxGharsPerDate to slotsPerGhar (3 for live, 4 with Baal Satsang), since per-ghar constraint only needs 3-4 unique pathis per ghar per date. Updated recommended to max(min+2, maxGharsPerDate+1).
- Updated API route error messages to explain per-ghar constraint clearly
- Updated PathiManager: minimum pathis display now shows "unique pathis per ghar", error/warning messages updated
- Added conflict detection in calculateMetrics() that logs to console.error if any same-ghar same-date slot conflicts are found (safety check)
- Build passes successfully

Stage Summary:
- Core bug fixed: per-ghar booking ensures same pathi cannot fill both Slot-B and Slot-C (or any two slots) at the same place on the same date
- Cross-place still allowed: same pathi CAN do Slot-B at Place-1 and Slot-C at Place-2 on same date
- Minimum pathis reduced to 3 (or 4 with Baal) from previous maxGharsPerDate
- Conflict detection logging added for safety verification
- Build passes successfully

---
## Task ID: 11 - backend-engineer
### Work Task
Set up Prisma DB schema, auth API, and CRUD API routes for the Satsang Schedule Management System.

### Work Summary

**Files Created/Modified:**

1. **`prisma/schema.prisma`** — Replaced with new schema: User, Center, Pathi, SavedSchedule models with proper relations and indexes.
2. **`prisma/seed.ts`** — Seeds default super admin (username: superadmin, password: admin123).
3. **`src/lib/auth.ts`** — JWT auth utilities using jose (HS256, 7-day expiry, httpOnly cookie).
4. **`src/lib/api-auth.ts`** — Auth middleware helpers: `withAuth()` and `withSuperAdmin()`.
5. **Auth API Routes:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
6. **Centers CRUD:** `GET/POST /api/centers`, `PUT/DELETE /api/centers/[id]` — SUPER_ADMIN only for mutations, CENTER_ADMIN sees own center.
7. **Users CRUD:** `GET/POST /api/users`, `PUT/DELETE /api/users/[id]` — SUPER_ADMIN only, passwords excluded from responses, self-deletion blocked.
8. **Pathis CRUD:** `GET/POST /api/pathis`, `PUT/DELETE /api/pathis/[id]` — Both roles, CENTER_ADMIN restricted to own center.
9. **Saved Schedules CRUD:** `GET/POST /api/schedules/saved`, `GET/DELETE /api/schedules/saved/[id]` — Both roles, CENTER_ADMIN restricted to own center.

All 13 new files pass ESLint with zero errors. No existing UI components or page.tsx were modified.

---
## Task ID: 12 - frontend-engineer
### Work Task
Build complete Auth UI + Admin Dashboard for the Satsang Schedule Management System.

### Work Summary

**Files Created:**

1. **`src/lib/store.ts`** — Zustand global state store with auth state, navigation views, data caches (centers, users, pathis, savedSchedules), schedule state, and session initialization via `GET /api/auth/me`.

2. **`src/components/admin/login-view.tsx`** — Clean login form with gradient background, username/password inputs, show/hide password toggle, amber-themed submit button, error display, and session creation.

3. **`src/components/admin/admin-layout.tsx`** — Responsive sidebar + main content layout. Desktop: fixed 60-width sidebar with nav items, user info, logout. Mobile: Sheet-based slide-in sidebar with hamburger trigger. Breadcrumb bar with back-to-dashboard navigation. Role-based nav items (SUPER_ADMIN sees all 6 views, CENTER_ADMIN sees 4).

4. **`src/components/admin/dashboard-view.tsx`** — Overview dashboard with stats cards (Centers, Users, Pathis, Saved Reports), quick action buttons, and centers overview table. CENTER_ADMIN sees own center info. Asynchronous data fetching with proper cleanup.

5. **`src/components/admin/centers-view.tsx`** — Full CRUD for centers (SUPER_ADMIN only). Table with category badges, user/pathi/report counts. Add/Edit dialogs with name + category select (SP/SC/C). Delete with AlertDialog confirmation.

6. **`src/components/admin/users-view.tsx`** — Full CRUD for users (SUPER_ADMIN only). Table with display name, username, role badge, center, actions. Create/Edit dialogs with username, password, display name, role select, center select. Delete with confirmation. Current user badge shown.

7. **`src/components/admin/pathis-view.tsx`** — Pathi management with slot toggles. Center selector (SUPER_ADMIN) or auto-selected (CENTER_ADMIN). Pathi list with interactive slot badges (A/B/C/D) for enabling/disabling eligibility. Active/Inactive switch per pathi. Add pathi input, delete with confirmation. Stats showing active count, total, and total slots enabled.

8. **`src/components/admin/schedule-wizard-view.tsx`** — Modified 3-step wizard integrating with DB pathis. Step 1: Upload Excel (same FileUpload component). Step 2: Center selector, DB-loaded pathi list with slot indicators, Baal Satsang toggles per ghar, generate button. Step 3: AnalyticsDashboard + ScheduleTable with Save Report dialog (enter name → POST to saved schedules API), JSON export, regenerate, reset.

9. **`src/components/admin/saved-reports-view.tsx`** — Saved schedules list. Table with report name, saved date, actions (Load, Export JSON, Delete). Center filter for SUPER_ADMIN. Load sets generated schedule in store and navigates to schedule view. Delete with confirmation.

**Files Modified:**

10. **`src/app/page.tsx`** — Conditional renderer: loading spinner → LoginView (if no user) → AdminLayout with view router (dashboard/centers/users/pathis/schedule/saved-reports).

11. **`src/lib/pathi-engine.ts`** — Added `PathiSlotConfig` interface with optional `pathiSlots: Record<string, string[]>` map. Modified `assignPathis()` to accept extended config. Modified `pickPathiBalanced()` to filter available pathis by slot eligibility when pathiSlots map is provided. Backward compatible — works without pathiSlots.

12. **`src/components/satsang/schedule-table.tsx`** — Fixed lint error: converted `useMemo` with `setState` to derived value in `expandedSet` computation (removed effect-based auto-expand in favor of useMemo with placeFilter dependency).

**Lint:** All files pass `bun run lint` with zero errors.

---
Task ID: 11
Agent: Main Agent
Task: Add authentication, user/center management, pathi slot toggles, and report save/load

Work Log:
- Installed bcryptjs, jose, @types/bcryptjs for JWT auth
- Rewrote Prisma schema with User, Center, Pathi, SavedSchedule models
- Ran db:push to create tables
- Created seed.ts with default super admin (username: superadmin, password: admin123)
- Created src/lib/auth.ts — JWT utilities (hashPassword, verifyPassword, createToken, verifyToken, getSession)
- Created src/lib/api-auth.ts — withAuth() and withSuperAdmin() middleware helpers
- Created 13 API routes:
  - Auth: POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
  - Centers: GET/POST /api/centers, PUT/DELETE /api/centers/[id]
  - Users: GET/POST /api/users, PUT/DELETE /api/users/[id]
  - Pathis: GET/POST /api/pathis, PUT/DELETE /api/pathis/[id]
  - Saved Schedules: GET/POST /api/schedules/saved, GET/DELETE /api/schedules/saved/[id]
- Created Zustand store (src/lib/store.ts) with auth state, navigation, data caches, schedule state
- Created 9 UI components in src/components/admin/:
  - login-view.tsx: Clean login form with gradient bg, password toggle
  - admin-layout.tsx: Responsive sidebar (desktop fixed, mobile Sheet) + main content
  - dashboard-view.tsx: Stats cards, quick actions, centers overview
  - centers-view.tsx: Full CRUD with add/edit/delete dialogs
  - users-view.tsx: Full CRUD with role/center selects, role badges
  - pathis-view.tsx: Pathi management with interactive A/B/C/D slot toggles
  - schedule-wizard-view.tsx: 3-step wizard using DB pathis, Save Report, export JSON
  - saved-reports-view.tsx: Saved schedules list with Load/Export/Delete
- Modified src/app/page.tsx: Conditional renderer (loading → login → admin layout)
- Modified src/lib/pathi-engine.ts: Added PathiSlotConfig for slot-based filtering
- Fixed lint in schedule-table.tsx: converted useMemo+setState to derived value
- All passes lint clean, dev server compiles successfully

Stage Summary:
- Complete auth system with JWT cookies (7-day expiry)
- Super Admin can manage centers, users, pathis for all centers
- Center Admin can only manage their own center's pathis and schedules
- Pathi slot toggles: each pathi can be toggled ON/OFF for slots A/B/C/D
- Reports can be saved to DB and loaded later for viewing
- JSON export of generated schedules
- Default credentials: superadmin / admin123

---
Task ID: 1
Agent: Main Agent
Task: Fix pathi assignment bug - same person assigned at multiple places on same date

Work Log:
- Analyzed uploaded CSV files showing conflicts (e.g., Amarjeet kaur at HANGOLA + TIKKAR TAAL on 10 May 2026)
- Root cause: Engine used `bookedPerGhar` (per-place-per-date) allowing cross-place assignments
- All satsangs happen at same time (09:30/09:00 AM) so person cannot be at 2 places
- Changed engine from `bookedPerGhar` to `bookedForDate` (Set<string> per date across ALL places)
- Updated `calculateMinPathis`: minimum = max total slots on busiest date (was max slots per single ghar)
- Updated `pickPathiBalanced`: receives `bookedForDate` instead of `bookedForGhar`
- Added cross-ghar conflict detection in `calculateMetrics`
- Updated API validation messages to explain per-date constraint
- Updated pathi-manager.tsx validation UI messages
- Tested with 65-session real-world schedule: 0 conflicts, 17 pathis, 15 minimum

Stage Summary:
- Fixed critical bug where same person was assigned to multiple places on same date
- New minimum pathis = total slots on busiest date (e.g., 15 for 5 ghars)
- Each pathi can fill exactly 1 slot across all ghars on any given date
- Files modified: pathi-engine.ts, generate-schedule/route.ts, pathi-manager.tsx
---
Task ID: 1-4
Agent: Main Agent
Task: Fix cross-location bug + implement per-pathi per-center (ghar) exclusion feature

Work Log:
- Read all relevant source files: pathi-engine.ts, schedule-wizard-view.tsx, generate-schedule/route.ts, pathis-view.tsx, store.ts, types.ts
- Confirmed cross-location bug was ALREADY FIXED: `bookedForDate: Set<string>` on line 212 of pathi-engine.ts prevents any pathi from being at multiple places on the same date
- Found that `pathiExcludedGhars` was partially defined in the interface but not wired through
- Updated `pickPathiBalanced()` function signature to accept `pathiExcludedGhars` and `currentGharName` parameters
- Added filtering logic in `pickPathiBalanced()` to exclude pathis banned from the current ghar
- Updated all 4 callers of `pickPathiBalanced()` (slots A, B, C, D) to pass the new parameters
- Updated API route to accept and forward `pathiExcludedGhars`
- Added `pathiGharExclusions` state to wizard component
- Added `handleToggleGharExclusion` and `isPathiExcludedFromGhar` callbacks
- Added full "Pathi Place Assignments" card UI with interactive toggle matrix table
- Updated generate, regenerate, and save report to pass exclusions
- Fixed JSX parsing error (unclosed `<span>` tag)
- Build verified successfully

Stage Summary:
- Cross-location same-day duplicate bug: Already fixed in engine (bookedForDate per-date Set)
- Per-pathi per-ghar exclusion feature: Fully implemented
  - Engine: pathiExcludedGhars map filters out excluded pathis per ghar
  - API: Accepts and forwards pathiExcludedGhars parameter
  - UI: Interactive matrix table with Check/Ban toggle buttons per pathi per ghar
  - Shows "Avail X/Y" counter per pathi row
  - Reset All Exclusions button
  - Exclusion data persisted with saved reports

---
Task ID: 5
Agent: Main Agent
Task: Add scrolling for ghar cards, fix step navigation, equal per-center distribution

Work Log:
- Added scrollable container (max-h-[600px]) for ghar cards list in Step 1
- Added "Back to Configure" button in Step 3 for back-and-forth navigation
- Updated pathi-engine.ts with gharSlotCounts: per-slot per-ghar assignment tracking
- Modified pickPathiBalanced() with secondary per-center balance: after filtering by global minimum, further filters by per-ghar minimum to ensure equal distribution across all centers
- All 4 slot callers (A/B/C/D) now increment gharSlotCounts after assignment
- Built and deployed successfully

Stage Summary:
- Step 1 ghars list now scrollable with custom scrollbar
- Navigation: Step 1 ↔ Step 2 ↔ Step 3 all have back/forward buttons
- Pathi distribution now balanced both globally AND per-center
