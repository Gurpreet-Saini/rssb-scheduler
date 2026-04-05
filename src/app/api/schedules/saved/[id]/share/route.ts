import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { logAudit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';

// POST /api/schedules/saved/[id]/share
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { isPublic } = body;

    const existing = await db.savedSchedule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== existing.centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate or wipe token based on isPublic
    const shareToken = isPublic ? (existing.shareToken || uuidv4().replace(/-/g, '').substring(0, 16)) : null;

    const updated = await db.savedSchedule.update({
      where: { id },
      data: { isPublic, shareToken },
    });

    await logAudit({
      action: 'SHARED_SCHEDULE',
      entityId: id,
      entityType: 'SavedSchedule',
      userId: session!.userId,
      centerId: existing.centerId,
      description: isPublic ? `Generated share link for schedule: ${existing.name}` : `Revoked share link for schedule: ${existing.name}`,
    });

    return NextResponse.json({ success: true, shareToken: updated.shareToken, isPublic: updated.isPublic });
  } catch (error) {
    console.error('Update share settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
