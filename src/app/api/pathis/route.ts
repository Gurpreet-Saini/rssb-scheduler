import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, withSuperAdmin } from '@/lib/api-auth';

// GET /api/pathis?centerId=xxx - List pathis for a center
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');

    if (!centerId) {
      return NextResponse.json({ error: 'centerId query parameter is required' }, { status: 400 });
    }

    // CENTER_ADMIN can only see their own center's pathis
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pathis = await db.pathi.findMany({
      where: { centerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ pathis });
  } catch (error) {
    console.error('List pathis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/pathis - Create pathi
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const body = await request.json();
    const { name, centerId, slots } = body;

    if (!name || !centerId) {
      return NextResponse.json({ error: 'Name and centerId are required' }, { status: 400 });
    }

    // CENTER_ADMIN can only create pathis for their own center
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify center exists
    const center = await db.center.findUnique({ where: { id: centerId } });
    if (!center) {
      return NextResponse.json({ error: 'Center not found' }, { status: 400 });
    }

    const pathi = await db.pathi.create({
      data: {
        name,
        centerId,
        slots: slots ? JSON.stringify(slots) : '["A","B","C"]',
      },
    });

    return NextResponse.json({ pathi }, { status: 201 });
  } catch (error) {
    console.error('Create pathi error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
