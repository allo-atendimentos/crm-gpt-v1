import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const teams = await prisma.team.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      supervisor: { select: { id: true, fullName: true } },
      members: { include: { user: { select: { id: true, fullName: true, email: true } } } },
    },
  })
  return NextResponse.json({ teams })
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  const team = await prisma.team.create({
    data: { tenantId: session.user.tenantId, name: body.name, description: body.description ?? null, color: body.color ?? '#3B82F6' },
  })
  return NextResponse.json(team, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
