import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withSuperAdmin } from '@/lib/api-auth';

// PUT /api/centers/[id] - Update center (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { name, category } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Center name is required' }, { status: 400 });
    }

    // Check if center exists
    const existing = await db.center.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 });
    }

    // Check uniqueness if name changed
    if (name.trim() !== existing.name) {
      const duplicate = await db.center.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return NextResponse.json({ error: 'Center with this name already exists' }, { status: 400 });
      }
    }

    const center = await db.center.update({
      where: { id },
      data: {
        name: name.trim(),
        category: category || existing.category,
      },
    });

    return NextResponse.json({ center });
  } catch (error) {
    console.error('Update center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/centers/[id] - Delete center (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const { id } = await params;

    const existing = await db.center.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 });
    }

    await db.center.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
