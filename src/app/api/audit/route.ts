import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';

// GET /api/audit
export async function GET(request: NextRequest) {
  try {
    const { session, response } = await withAuth(request);
    if (response) return response;

    // Only SUPER_ADMIN can view audit logs across all centers
    // CENTER_ADMIN can view logs for their own center
    const { searchParams } = new URL(request.url);
    const centerFilter = searchParams.get('centerId');

    let whereClause: any = {};
    
    if (session!.role === 'CENTER_ADMIN') {
      whereClause.centerId = session!.centerId;
    } else if (centerFilter) {
      whereClause.centerId = centerFilter;
    }

    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const logs = await db.auditLog.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
