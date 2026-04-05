import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ScheduleTable } from '@/components/satsang/schedule-table';
import { AnalyticsDashboard } from '@/components/satsang/analytics-dashboard';

export default async function SharedSchedulePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const token = params.token;
  
  if (!token) return notFound();

  const schedule = await db.savedSchedule.findUnique({
    where: { shareToken: token },
    include: { center: true },
  });

  if (!schedule || !schedule.isPublic) {
    return notFound();
  }

  const generatedData = JSON.parse(schedule.scheduleData);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between h-auto md:h-14 px-4 md:px-6 py-3 md:py-0 gap-2">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="RSSB" className="h-8 w-8 rounded-md object-cover" />
            <div>
              <h1 className="text-sm font-bold truncate">Satsang Schedule: {schedule.name}</h1>
              <p className="text-[11px] text-muted-foreground">{schedule.center.name} Center • Public Link</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            Shared on {new Date(schedule.createdAt).toLocaleDateString()}
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-sm">
          <strong>Read-Only Mode</strong>: This is a generated schedule. Interactive editing tools are disabled.
        </div>
        
        <AnalyticsDashboard schedule={generatedData} />
        <ScheduleTable schedule={generatedData} readOnly />
      </main>
    </div>
  );
}
