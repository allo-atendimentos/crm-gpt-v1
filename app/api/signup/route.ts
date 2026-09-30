export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/prisma'
import { limit } from '@/lib/security'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { password, fullName, companyName } = body
    const email = String(body.email ?? "").trim().toLowerCase()
    await limit("signup:"+email,5)
    return await db.$transaction(async (prisma) => {

    if (!email || !password || !fullName || !companyName) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter no mínimo 8 caracteres' }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 409 })
    }

    let baseSlug = generateSlug(companyName)
    let slug = baseSlug
    let counter = 1
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const trialPlan = await prisma.plan.findFirst({ where: { name: 'Essencial' } })

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        status: 'trial',
        planId: trialPlan?.id ?? undefined,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        settings: { locale: 'pt-BR', timezone: 'America/Sao_Paulo' },
      },
    })

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        fullName,
        role: 'admin',
        status: 'active',
        tenantId: tenant.id,
      },
    })

    // Create default pipeline
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId: tenant.id,
        name: 'Funil de Vendas',
        type: 'sales',
        color: '#3B82F6',
        isDefault: true,
        position: 0,
      },
    })

    const stageNames = [
      { name: 'Prospecção', color: '#6B7280', prob: 10 },
      { name: 'Qualificação', color: '#3B82F6', prob: 25 },
      { name: 'Proposta', color: '#F59E0B', prob: 50 },
      { name: 'Negociação', color: '#8B5CF6', prob: 75 },
      { name: 'Fechamento', color: '#10B981', prob: 90 },
    ]

    for (let i = 0; i < stageNames.length; i++) {
      await prisma.stage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId: tenant.id,
          name: stageNames[i].name,
          color: stageNames[i].color,
          position: i,
          probability: stageNames[i].prob,
          isWon: i === stageNames.length - 1,
        },
      })
    }

    await prisma.billing.create({data:{tenantId:tenant.id}})
    return NextResponse.json({ success: true, userId: user.id, tenantId: tenant.id })
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 })
  }
}
