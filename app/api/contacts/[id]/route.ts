import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      company: true,
      responsibleUser: { select: { id: true, fullName: true, email: true } },
      deals: { include: { stage: true }, orderBy: { createdAt: 'desc' } },
      tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!contact) return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 })
  return NextResponse.json(contact)
}

async function handlerPUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json()
  const contact = await prisma.contact.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: {
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
      responsibleUserId: body.responsibleUserId ?? null,
      notes: body.notes ?? null,
      cpf: body.cpf ?? null,
      consents: body.consents ?? [],
    },
  })
  return NextResponse.json({ success: true })
}

async function handlerDELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  await prisma.contact.updateMany({ where: { id, tenantId: session.user.tenantId }, data: { contactStatus: 'deleted' } })
  return NextResponse.json({ success: true })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }

export async function PUT(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPUT as any)(req,ctx)) }

export async function DELETE(req: Request, ctx: any) { return secureRoute(req,()=> (handlerDELETE as any)(req,ctx)) }
