import { db } from './db';

type AuditAction =
  | 'GENERATED_SCHEDULE'
  | 'UPDATED_SCHEDULE'
  | 'DELETED_SCHEDULE'
  | 'SHARED_SCHEDULE'
  | 'CREATED_PATHI'
  | 'UPDATED_PATHI'
  | 'DELETED_PATHI'
  | 'UPDATED_CENTER';

export async function logAudit({
  action,
  entityId,
  entityType,
  userId,
  centerId,
  description,
  metadata,
}: {
  action: AuditAction;
  entityId?: string;
  entityType?: 'SavedSchedule' | 'Pathi' | 'Center' | 'User';
  userId: string;
  centerId?: string;
  description: string;
  metadata?: any;
}) {
  try {
    await db.auditLog.create({
      data: {
        action,
        entityId,
        entityType,
        userId,
        centerId,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit logging should not block core operations
  }
}
