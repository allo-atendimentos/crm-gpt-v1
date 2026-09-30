import { prisma } from '@/lib/prisma'

export async function logAudit(params: {
  tenantId?: string | null
  userId?: string | null
  action: string
  resourceType: string
  resourceId?: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId ?? undefined,
        userId: params.userId ?? undefined,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        oldValue: params.oldValue ?? undefined,
        newValue: params.newValue ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}
