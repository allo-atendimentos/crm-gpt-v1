'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !email || !password || !companyName) { toast.error('Preencha todos os campos'); return }
    if (password.length < 8) { toast.error('A senha deve ter no mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, companyName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Erro ao criar conta'); return }
      const login = await signIn('credentials', { email, password, redirect: false })
      if (login?.error) { toast.error('Conta criada! Faça login.'); router.push('/login') }
      else { toast.success('Workspace criado!'); router.replace('/dashboard') }
    } catch { toast.error('Erro ao criar conta') }
    finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0085ff] flex items-center justify-center text-white font-bold text-xl">A</div>
        </div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">Crie seu Workspace</h1>
        <p className="text-white/60 mt-1">Comece a usar o Boss CRM gratuitamente</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Seu nome completo</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
              placeholder="João Silva" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
              placeholder="joao@empresa.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Senha</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff] pr-10"
                placeholder="Mínimo 8 caracteres" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Nome da empresa</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
              placeholder="Minha Empresa Ltda" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full mt-6 py-2.5 bg-[#0085ff] hover:bg-[#d49018] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> Criar Workspace</>}
        </button>
        <p className="text-center text-sm text-white/60 mt-4">
          Já tem conta? <Link href="/login" className="text-[#0085ff] hover:underline font-medium">Fazer login</Link>
        </p>
      </form>
    </div>
  )
}
