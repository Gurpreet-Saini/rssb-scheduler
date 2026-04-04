import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withSuperAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';

// GET /api/users - List all users (SUPER_ADMIN only)
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const users = await db.user.findMany({
      include: {
        center: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Don't send passwords back
    const safeUsers = users.map(({ password: _, ...user }) => user);

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create user (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const { session, response } = await withSuperAdmin(request);
    if (response) return response;

    const body = await request.json();
    const { username, password, displayName, role, centerId } = body;

    if (!username || !password || !displayName) {
      return NextResponse.json(
        { error: 'Username, password, and displayName are required' },
        { status: 400 }
      );
    }

    if (!['SUPER_ADMIN', 'CENTER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Role must be SUPER_ADMIN or CENTER_ADMIN' }, { status: 400 });
    }

    // Check username uniqueness
    const existingUser = await db.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    // If centerId is provided, verify the center exists
    if (centerId) {
      const center = await db.center.findUnique({ where: { id: centerId } });
      if (!center) {
        return NextResponse.json({ error: 'Center not found' }, { status: 400 });
      }
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        displayName,
        role,
        centerId: centerId || null,
      },
      include: {
        center: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    const { password: _, ...safeUser } = user;

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
