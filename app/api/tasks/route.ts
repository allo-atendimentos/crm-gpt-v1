import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const tenantId = session.user.tenantId
  const url = new URL(req.url)
  const filter = url.searchParams.get('filter') ?? 'mine'
  const status = url.searchParams.get('status') ?? ''
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = parseInt(url.searchParams.get('limit') ?? '50')

  const where: any = { tenantId }
  if (filter === 'mine') where.assignedToId = session.user.id
  if (status) where.taskStatus = status

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where, skip: (page - 1) * limit, take: limit,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        contact: { select: { id: true, fullName: true } },
        deal: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, fullName: true } },
      },
    }),
    prisma.task.count({ where }),
  ])
  return NextResponse.json({ tasks, total })
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 })
  const optionalId = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  const task = await prisma.task.create({
    data: {
      tenantId: session.user.tenantId,
      title: body.title,
      description: body.description ?? null,
      type: body.type ?? 'task',
      priority: body.priority ?? 'medium',
      assignedToId: optionalId(body.assignedToId) ?? session.user.id,
      contactId: optionalId(body.contactId),
      dealId: optionalId(body.dealId),
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      createdById: session.user.id,
    },
  })
  return NextResponse.json(task, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
