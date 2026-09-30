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
  const pipelineId = url.searchParams.get('pipelineId') ?? ''
  const status = url.searchParams.get('status') ?? 'open'
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = parseInt(url.searchParams.get('limit') ?? '100')

  const where: any = { tenantId, dealStatus: status }
  if (pipelineId) where.pipelineId = pipelineId

  const deals = await prisma.deal.findMany({
    where, skip: (page - 1) * limit, take: limit,
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: {
      stage: true,
      contact: { select: { id: true, fullName: true } },
      company: { select: { id: true, name: true } },
      responsibleUser: { select: { id: true, fullName: true } },
    },
  })
  const total = await prisma.deal.count({ where })
  return NextResponse.json({ deals, total })
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  const optionalId = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  const pipelineId = optionalId(body.pipelineId)
  const stageId = optionalId(body.stageId)
  if (!pipelineId || !stageId) return NextResponse.json({ error: 'Funil e etapa são obrigatórios' }, { status: 400 })
  const deal = await prisma.deal.create({
    data: {
      tenantId: session.user.tenantId,
      title: body.title,
      pipelineId,
      stageId,
      contactId: optionalId(body.contactId),
      companyId: optionalId(body.companyId),
      responsibleUserId: optionalId(body.responsibleUserId) ?? session.user.id,
      value: body.value ?? 0,
      probability: body.probability ?? 50,
      expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      priority: body.priority ?? 'medium',
      source: body.source ?? null,
      tags: body.tags ?? [],
      notes: body.notes ?? null,
      position: body.position ?? 0,
      createdById: session.user.id,
    },
  })
  return NextResponse.json(deal, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
