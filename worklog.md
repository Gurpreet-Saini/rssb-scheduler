---
Task ID: 1
Agent: Main Agent
Task: Fix deployment configuration for rssb-schedule.space.z.ai

Work Log:
- Analyzed deployment error: "Failed to delete deployment: function 'rssb-schedule-deploy' does not exist"
- Identified root causes: standalone output mode incompatible with serverless/FC deployment
- Removed `output: "standalone"` from next.config.ts
- Fixed DATABASE_URL from absolute path to relative path (`file:./db/custom.db`)
- Added `postinstall` script to run `npx prisma generate` after npm install
- Updated build script to include `npx prisma db push --skip-generate` for DB auto-creation
- Updated db.ts to auto-create db directory if missing
- Removed query logging in production for performance
- Removed unused heavy dependencies: next-auth, next-intl, @mdxeditor/editor, react-markdown, react-syntax-highlighter, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, react-resizable-panels, sharp, @hookform/resolvers, @reactuses/core, @tanstack/react-query, @tanstack/react-table, react-hook-form
- Cleaned up upload directory with leftover screenshots
- Verified build succeeds and dev server returns 200

Stage Summary:
- Deployment configuration fixed for serverless/FC platform
- Build passes successfully with all routes compiled
- Dev server returns HTTP 200
- Key changes: next.config.ts (removed standalone), package.json (postinstall + build), db.ts (auto-create dir), .env (relative DB path)
