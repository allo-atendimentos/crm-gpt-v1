import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerPUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const data: any = {}
  const optionalId = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.type !== undefined) data.type = body.type
  if (body.priority !== undefined) data.priority = body.priority
  if (body.assignedToId !== undefined) data.assignedToId = optionalId(body.assignedToId)
  if (body.contactId !== undefined) data.contactId = optionalId(body.contactId)
  if (body.dealId !== undefined) data.dealId = optionalId(body.dealId)
  if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null
  if (body.taskStatus !== undefined) {
    data.taskStatus = body.taskStatus
    if (body.taskStatus === 'done') {
      data.completedAt = new Date()
      data.completedById = session.user.id
    } else {
      data.completedAt = null
      data.completedById = null
    }
  }
  await prisma.task.updateMany({ where: { id, tenantId: session.user.tenantId }, data })
  return NextResponse.json({ success: true })
}

async function handlerDELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await prisma.task.deleteMany({ where: { id, tenantId: session.user.tenantId } })
  return NextResponse.json({ success: true })
}

export async function PUT(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPUT as any)(req,ctx)) }

export async function DELETE(req: Request, ctx: any) { return secureRoute(req,()=> (handlerDELETE as any)(req,ctx)) }
