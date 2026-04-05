import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';

// GET /api/schedules/saved/[id] - Load a specific saved schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { id } = await params;

    const schedule = await db.savedSchedule.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // CENTER_ADMIN can only access their own center's schedules
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== schedule.centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Load saved schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/schedules/saved/[id] - Delete a saved schedule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { id } = await params;

    const existing = await db.savedSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // CENTER_ADMIN can only delete their own center's schedules
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== existing.centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.savedSchedule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete saved schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
