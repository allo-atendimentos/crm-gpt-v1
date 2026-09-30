export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server'
import { signIn } from '@/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }
}
