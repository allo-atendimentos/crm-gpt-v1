import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerGET(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ results: [] })
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })
  const tenantId = session.user.tenantId
  const results: any[] = []
  const contacts = await prisma.contact.findMany({
    where: { tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] },
    take: 5, select: { id: true, fullName: true },
  })
  contacts.forEach((c: any) => results.push({ type: 'Contato', label: c.fullName, href: `/contacts/${c.id}` }))
  const deals = await prisma.deal.findMany({
    where: { tenantId, title: { contains: q, mode: 'insensitive' } },
    take: 5, select: { id: true, title: true },
  })
  deals.forEach((d: any) => results.push({ type: 'Negócio', label: d.title, href: `/deals/${d.id}` }))
  const companies = await prisma.company.findMany({
    where: { tenantId, name: { contains: q, mode: 'insensitive' } },
    take: 5, select: { id: true, name: true },
  })
  companies.forEach((c: any) => results.push({ type: 'Empresa', label: c.name, href: `/companies/${c.id}` }))
  return NextResponse.json({ results })
}

export async function GET(req: Request, ctx: any) { return secureRoute(req,()=> (handlerGET as any)(req,ctx)) }
