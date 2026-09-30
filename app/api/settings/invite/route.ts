import { route as secureRoute } from '@/lib/security'
export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function handlerPOST(req: Request) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'NÃ£o autenticado' }, { status: 401 })
  if (!['admin', 'superadmin'].includes(session.user.role)) return NextResponse.json({ error: 'Sem permissÃ£o' }, { status: 403 })
  const body = await req.json()
  if (!body.email) return NextResponse.json({ error: 'E-mail obrigatÃ³rio' }, { status: 400 })
  if(!['admin','manager','supervisor','agent','analyst','financial','guest'].includes(body.role??'agent')) return NextResponse.json({error:'Papel inválido'},{status:403})
  body.email=String(body.email).trim().toLowerCase()
  const billing=await prisma.billing.findUnique({where:{tenantId:session.user.tenantId}})
  const seats=await prisma.user.count({where:{tenantId:session.user.tenantId,status:'active'}})
  const invites=await prisma.userInvitation.count({where:{acceptedAt:null,expiresAt:{gt:new Date()}}})
  if(billing?.plan!=='unlimited'&&seats+invites>=3)return NextResponse.json({error:'Limite de 3 usuários/convites atingido'},{status:409})
  const existing = await prisma.userInvitation.findFirst({
    where: { tenantId: session.user.tenantId, email: body.email, acceptedAt: null },
  })
  if (existing) return NextResponse.json({ error: 'Convite jÃ¡ enviado para este e-mail' }, { status: 409 })
  const invitation = await prisma.userInvitation.create({
    data: {
      tenantId: session.user.tenantId,
      email: body.email,
      role: body.role ?? 'agent',
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  return NextResponse.json({ invitation, inviteUrl: `/invite/${invitation.token}` }, { status: 201 })
}

export async function POST(req: Request, ctx: any) { return secureRoute(req,()=> (handlerPOST as any)(req,ctx)) }
