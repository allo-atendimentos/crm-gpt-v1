import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const dealsByStage = await prisma.deal.groupBy({
    by: ['stageId'], where: { tenantId, dealStatus: 'open' },
    _sum: { value: true }, _count: true,
  })
  const stageIds = dealsByStage.map((d: any) => d?.stageId).filter(Boolean)
  const stages = stageIds.length > 0 ? await prisma.stage.findMany({ where: { id: { in: stageIds } } }) : []
  const stageMap = Object.fromEntries(stages.map((s: any) => [s.id, s]))

  const dealsByStageChart = dealsByStage.map((d: any) => ({
    name: stageMap[d?.stageId ?? '']?.name ?? 'Sem etapa',
    count: d?._count ?? 0,
    value: Number(d?._sum?.value ?? 0),
    color: stageMap[d?.stageId ?? '']?.color ?? '#6B7280',
    position: stageMap[d?.stageId ?? '']?.position ?? 99,
  })).sort((a: any, b: any) => a.position - b.position)

  const totalDeals = await prisma.deal.count({ where: { tenantId } })
  const wonDeals = await prisma.deal.count({ where: { tenantId, dealStatus: 'won' } })
  const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0

  const doneTasks = await prisma.task.count({ where: { tenantId, taskStatus: 'done' } })
  const pendingTasks = await prisma.task.count({ where: { tenantId, taskStatus: { in: ['pending', 'in_progress'] } } })

  return NextResponse.json({
    dealsByStageChart,
    conversionRate,
    totalDeals,
    wonDeals,
    tasksDone: doneTasks,
    tasksPending: pendingTasks,
  })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }
