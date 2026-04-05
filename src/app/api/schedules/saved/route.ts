import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';

// GET /api/schedules/saved?centerId=xxx - List saved schedules for a center
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');

    if (!centerId) {
      return NextResponse.json({ error: 'centerId query parameter is required' }, { status: 400 });
    }

    // CENTER_ADMIN can only see their own center's schedules
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schedules = await db.savedSchedule.findMany({
      where: { centerId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        centerId: true,
        shareToken: true,
        isPublic: true,
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('List saved schedules error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/schedules/saved - Save schedule
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const body = await request.json();
    const { name, centerId, scheduleData, pathiConfig, excelData } = body;

    if (!name || !centerId || !scheduleData || !pathiConfig) {
      return NextResponse.json(
        { error: 'name, centerId, scheduleData, and pathiConfig are required' },
        { status: 400 }
      );
    }

    // CENTER_ADMIN can only save schedules for their own center
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify center exists
    const center = await db.center.findUnique({ where: { id: centerId } });
    if (!center) {
      return NextResponse.json({ error: 'Center not found' }, { status: 400 });
    }

    const schedule = await db.savedSchedule.create({
      data: {
        name,
        centerId,
        userId: session!.userId,
        scheduleData: typeof scheduleData === 'string' ? scheduleData : JSON.stringify(scheduleData),
        pathiConfig: typeof pathiConfig === 'string' ? pathiConfig : JSON.stringify(pathiConfig),
        excelData: excelData ? (typeof excelData === 'string' ? excelData : JSON.stringify(excelData)) : null,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    await logAudit({
      action: 'GENERATED_SCHEDULE',
      entityId: schedule.id,
      entityType: 'SavedSchedule',
      userId: session!.userId,
      centerId: centerId,
      description: `Generated and saved schedule: ${name}`,
    });

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Save schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
