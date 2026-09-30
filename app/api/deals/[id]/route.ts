import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const deal = await prisma.deal.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      stage: true, pipeline: true,
      contact: true, company: true,
      responsibleUser: { select: { id: true, fullName: true, email: true } },
      tasks: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!deal) return NextResponse.json({ error: 'Negócio não encontrado' }, { status: 404 })
  return NextResponse.json(deal)
}

async function handlerPUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const data: any = {}
  const optionalId = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
  if (body.title !== undefined) data.title = body.title
  if (body.stageId !== undefined) data.stageId = optionalId(body.stageId)
  if (body.pipelineId !== undefined) data.pipelineId = optionalId(body.pipelineId)
  if (body.contactId !== undefined) data.contactId = optionalId(body.contactId)
  if (body.companyId !== undefined) data.companyId = optionalId(body.companyId)
  if (body.responsibleUserId !== undefined) data.responsibleUserId = optionalId(body.responsibleUserId)
  if (body.value !== undefined) data.value = body.value
  if (body.probability !== undefined) data.probability = body.probability
  if (body.expectedCloseDate !== undefined) data.expectedCloseDate = body.expectedCloseDate ? new Date(body.expectedCloseDate) : null
  if (body.priority !== undefined) data.priority = body.priority
  if (body.dealStatus !== undefined) {
    data.dealStatus = body.dealStatus
    if (body.dealStatus === 'won' || body.dealStatus === 'lost') data.closedAt = new Date()
    if (body.dealStatus === 'lost') {
      data.lostReason = body.lostReason ?? null
      data.lostReasonDetail = body.lostReasonDetail ?? null
    }
  }
  if (body.notes !== undefined) data.notes = body.notes
  if (body.tags !== undefined) data.tags = body.tags
  if (body.position !== undefined) data.position = body.position
  if (body.source !== undefined) data.source = body.source

  await prisma.deal.updateMany({ where: { id, tenantId: session.user.tenantId }, data })
  return NextResponse.json({ success: true })
}

async function handlerDELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await prisma.deal.deleteMany({ where: { id, tenantId: session.user.tenantId } })
  return NextResponse.json({ success: true })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function PUT(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPUT as any)(req,ctx)) }

export async function DELETE(req: Request, ctx: any) { return secureRoute(req,()=> (handlerDELETE as any)(req,ctx)) }
