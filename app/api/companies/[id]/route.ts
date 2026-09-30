import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const company = await prisma.company.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      responsibleUser: { select: { id: true, fullName: true } },
      contacts: { take: 20, orderBy: { createdAt: 'desc' } },
      deals: { take: 20, include: { stage: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
  return NextResponse.json(company)
}

async function handlerPUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  await prisma.company.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: { name: body.name, cnpj: body.cnpj, industry: body.industry, size: body.size, website: body.website, address: body.address, phones: body.phones, emails: body.emails, responsibleUserId: body.responsibleUserId, tags: body.tags, notes: body.notes, revenueRange: body.revenueRange, customFields: body.customFields },
  })
  return NextResponse.json({ success: true })
}

async function handlerDELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await prisma.company.deleteMany({ where: { id, tenantId: session.user.tenantId } })
  return NextResponse.json({ success: true })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function PUT(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPUT as any)(req,ctx)) }

export async function DELETE(req: Request, ctx: any) { return secureRoute(req,()=> (handlerDELETE as any)(req,ctx)) }
