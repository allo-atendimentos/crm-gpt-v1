import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

async function handlerGET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const tenantId = session.user.tenantId
  const day=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo"}).format(new Date())
  const today=new Date(day+"T00:00:00-03:00"), tomorrow=new Date(today.getTime()+86400000)

  const [totalContacts, openDeals, pendingTasks, recentDeals, todayTasks, dealsByStage, openConversations, pendingConversations] = await Promise.all([
    prisma.contact.count({ where: { tenantId, contactStatus: 'active' } }),
    prisma.deal.findMany({ where: { tenantId, dealStatus: 'open' }, select: { value: true } }),
    prisma.task.count({ where: { tenantId, taskStatus: { in: ['pending', 'in_progress'] } } }),
    prisma.deal.findMany({
      where: { tenantId }, take: 5, orderBy: { createdAt: 'desc' },
      include: { stage: true, contact: { select: { fullName: true } }, responsibleUser: { select: { fullName: true } } },
    }),
    prisma.task.findMany({
      where: { tenantId, assignedToId: session.user.id, dueAt:{gte:today,lt:tomorrow}, taskStatus: { in: ['pending', 'in_progress'] } },
      take: 10, orderBy: { dueAt: 'asc' },
      include: { contact: { select: { fullName: true } }, deal: { select: { title: true } } },
    }),
    prisma.deal.groupBy({
      by: ['stageId'],
      where: { tenantId, dealStatus: 'open' },
      _sum: { value: true },
      _count: true,
    }),
    prisma.conversation.count({where:{status:{in:['open','pending']}}}),
    prisma.conversation.count({where:{status:'pending'}}),
  ])

  const openDealsValue = Number(openDeals.reduce((sum: any, d: any) => sum.add(d.value), new Prisma.Decimal(0)).toFixed(2))

  // Get stage names for chart
  const stageIds = dealsByStage.map((d: any) => d?.stageId).filter(Boolean)
  const stages = stageIds.length > 0
    ? await prisma.stage.findMany({ where: { id: { in: stageIds } }, select: { id: true, name: true, color: true, position: true } })
    : []
  const stageMap = Object.fromEntries(stages.map((s: any) => [s.id, s]))

  const chartData = dealsByStage
    .map((d: any) => ({
      stage: stageMap[d?.stageId ?? '']?.name ?? 'Sem etapa',
      color: stageMap[d?.stageId ?? '']?.color ?? '#6B7280',
      position: stageMap[d?.stageId ?? '']?.position ?? 99,
      count: d?._count ?? 0,
      value: Number(d?._sum?.value ?? 0),
    }))
    .sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0))

  return NextResponse.json({
    totalContacts,
    openConversations,
    pendingConversations,
    openDealsCount: openDeals?.length ?? 0,
    openDealsValue,
    pendingTasks,
    recentDeals: recentDeals.map((d: any) => ({ ...d, value: Number(d?.value ?? 0) })),
    todayTasks,
    chartData,
  })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }
