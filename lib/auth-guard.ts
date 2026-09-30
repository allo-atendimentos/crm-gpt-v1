import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function getAuthSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session
}

export async function requireAuth() {
  const session = await getAuthSession()
  if (!session) throw new Error('Não autenticado')
  return session
}

export async function requireTenant() {
  const session = await requireAuth()
  if (!session.user.tenantId) throw new Error('Sem workspace vinculado')
  return { session, tenantId: session.user.tenantId }
}

export async function requireRole(roles: string[]) {
  const { session, tenantId } = await requireTenant()
  if (!roles.includes(session.user.role)) throw new Error('Sem permissão')
  return { session, tenantId }
}

export function tenantFilter(tenantId: string) {
  return { tenantId }
}
