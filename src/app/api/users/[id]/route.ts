import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withSuperAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';

// PUT /api/users/[id] - Update user (SUPER_ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const { id } = await params;
    const body = await request.json();
    const { displayName, role, centerId, password } = body;

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (role && !['SUPER_ADMIN', 'CENTER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Role must be SUPER_ADMIN or CENTER_ADMIN' }, { status: 400 });
    }

    // If centerId is provided, verify the center exists
    if (centerId) {
      const center = await db.center.findUnique({ where: { id: centerId } });
      if (!center) {
        return NextResponse.json({ error: 'Center not found' }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (displayName) updateData.displayName = displayName;
    if (role) updateData.role = role;
    if (centerId !== undefined) updateData.centerId = centerId || null;
    if (password) updateData.password = await hashPassword(password);

    const user = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        center: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user (SUPER_ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const { id } = await params;

    // Cannot delete self
    if (id === session!.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
