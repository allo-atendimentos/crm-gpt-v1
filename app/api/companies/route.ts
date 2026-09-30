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
  const page = parseInt(url.searchParams.get('page') ?? '1')
  const limit = parseInt(url.searchParams.get('limit') ?? '25')
  const search = url.searchParams.get('search') ?? ''
  const where: any = { tenantId }
  if (search) {
    where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { cnpj: { contains: search } }]
  }
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      include: {
        responsibleUser: { select: { id: true, fullName: true } },
        _count: { select: { contacts: true, deals: true } },
      },
    }),
    prisma.company.count({ where }),
  ])
  return NextResponse.json({ companies, total, page, limit })
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  const company = await prisma.company.create({
    data: {
      tenantId: session.user.tenantId,
      name: body.name,
      cnpj: body.cnpj ?? null,
      industry: body.industry ?? null,
      size: body.size ?? null,
      website: body.website ?? null,
      address: body.address ?? {},
      phones: body.phones ?? [],
      emails: body.emails ?? [],
      responsibleUserId: body.responsibleUserId ?? session.user.id,
      tags: body.tags ?? [],
      notes: body.notes ?? null,
      revenueRange: body.revenueRange ?? null,
      customFields: body.customFields ?? {},
      createdById: session.user.id,
    },
  })
  return NextResponse.json(company, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
