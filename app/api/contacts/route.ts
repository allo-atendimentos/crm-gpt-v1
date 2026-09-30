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
  const tag = url.searchParams.get('tag') ?? ''
  const responsible = url.searchParams.get('responsible') ?? ''
  const companyId = url.searchParams.get('companyId') ?? ''

  const where: any = { tenantId, contactStatus: 'active' }
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }
  if (tag) where.tags = { has: tag }
  if (responsible) where.responsibleUserId = responsible
  if (companyId) where.companyId = companyId

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      include: { company: { select: { id: true, name: true } }, responsibleUser: { select: { id: true, fullName: true } } },
    }),
    prisma.contact.count({ where }),
  ])
  return NextResponse.json({ contacts, total, page, limit })
}

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const tenantId = session.user.tenantId
  const body = await req.json()
  if (!body.fullName) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  const contact = await prisma.contact.create({
    data: {
      tenantId,
      fullName: body.fullName,
      email: body.email ?? null,
      phone: body.phone ?? null,
      phones: body.phones ?? [],
      emails: body.emails ?? [],
      companyId: body.companyId ?? null,
      jobTitle: body.jobTitle ?? null,
      source: body.source ?? null,
      tags: body.tags ?? [],
      customFields: body.customFields ?? {},
      responsibleUserId: body.responsibleUserId ?? session.user.id,
      notes: body.notes ?? null,
      cpf: body.cpf ?? null,
      consents: body.consents ?? [],
      createdById: session.user.id,
    },
  })
  return NextResponse.json(contact, { status: 201 })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
