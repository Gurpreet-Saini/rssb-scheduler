import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, withSuperAdmin } from '@/lib/api-auth';

// GET /api/centers - List all centers
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    if (session!.role === 'SUPER_ADMIN') {
      const centers = await db.center.findMany({
        include: {
          _count: { select: { users: true, pathis: true, savedSchedules: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ centers });
    }

    // CENTER_ADMIN - only their center
    if (session!.centerId) {
      const center = await db.center.findUnique({
        where: { id: session!.centerId },
        include: {
          _count: { select: { users: true, pathis: true, savedSchedules: true } },
        },
      });
      if (!center) {
        return NextResponse.json({ error: 'Center not found' }, { status: 404 });
      }
      return NextResponse.json({ centers: [center] });
    }

    return NextResponse.json({ centers: [] });
  } catch (error) {
    console.error('List centers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/centers - Create center (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const body = await request.json();
    const { name, category } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Center name is required' }, { status: 400 });
    }

    const existingCenter = await db.center.findUnique({ where: { name: name.trim() } });
    if (existingCenter) {
      return NextResponse.json({ error: 'Center with this name already exists' }, { status: 400 });
    }

    const center = await db.center.create({
      data: {
        name: name.trim(),
        category: category || 'C',
      },
    });

    return NextResponse.json({ center }, { status: 201 });
  } catch (error) {
    console.error('Create center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
