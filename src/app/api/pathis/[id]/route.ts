import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';

// PUT /api/pathis/[id] - Update pathi
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { name, slots, isActive } = body;

    const existing = await db.pathi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pathi not found' }, { status: 404 });
    }

    // CENTER_ADMIN can only update their own center's pathis
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== existing.centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slots !== undefined) updateData.slots = JSON.stringify(slots);
    if (isActive !== undefined) updateData.isActive = isActive;

    const pathi = await db.pathi.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ pathi });
  } catch (error) {
    console.error('Update pathi error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/pathis/[id] - Delete pathi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    const { id } = await params;

    const existing = await db.pathi.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Pathi not found' }, { status: 404 });
    }

    // CENTER_ADMIN can only delete their own center's pathis
    if (session!.role === 'CENTER_ADMIN' && session!.centerId !== existing.centerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.pathi.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete pathi error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
