import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const pipelines = await prisma.pipeline.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { position: 'asc' },
    include: { stages: { orderBy: { position: 'asc' } } },
  })
  return NextResponse.json(pipelines)
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const pipeline = await prisma.pipeline.create({
    data: { tenantId: session.user.tenantId, name: body.name, type: body.type ?? 'sales', color: body.color ?? '#3B82F6' },
  })
  return NextResponse.json(pipeline, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
