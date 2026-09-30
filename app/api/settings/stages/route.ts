import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.name || !body.pipelineId) return NextResponse.json({ error: 'Nome e pipeline obrigatórios' }, { status: 400 })
  const maxPos = await prisma.stage.findFirst({ where: { pipelineId: body.pipelineId }, orderBy: { position: 'desc' } })
  const stage = await prisma.stage.create({
    data: {
      tenantId: session.user.tenantId,
      pipelineId: body.pipelineId,
      name: body.name,
      color: body.color ?? '#6B7280',
      position: (maxPos?.position ?? -1) + 1,
      probability: body.probability ?? 50,
    },
  })
  return NextResponse.json(stage, { status: 201 })
}

async function handlerPUT(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.stages || !Array.isArray(body.stages)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  for (const s of body.stages) {
    await prisma.stage.updateMany({
      where: { id: s.id, tenantId: session.user.tenantId },
      data: { position: s.position, name: s.name, color: s.color },
    })
  }
  return NextResponse.json({ success: true })
}

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }

export async function PUT(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPUT as any)(req,ctx)) }
