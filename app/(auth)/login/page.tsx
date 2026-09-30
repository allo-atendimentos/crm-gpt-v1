'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Preencha todos os campos'); return }
    setLoading(true)
    try {
      const res = await signIn('credentials', { email, password, redirect: false })
      if (res?.error) { toast.error('E-mail ou senha inválidos') }
      else { router.replace('/dashboard') }
    } catch { toast.error('Erro ao fazer login') }
    finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#0085ff] flex items-center justify-center text-white font-bold text-xl">A</div>
        </div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">Bem-vindo ao Boss CRM</h1>
        <p className="text-white/60 mt-1">Faça login para acessar sua conta</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
              placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Senha</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff] pr-10"
                placeholder="Sua senha" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full mt-6 py-2.5 bg-[#0085ff] hover:bg-[#d49018] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn className="w-4 h-4" /> Entrar</>}
        </button>
        <p className="text-center text-sm text-white/60 mt-4">
          Não tem conta? <Link href="/signup" className="text-[#0085ff] hover:underline font-medium">Criar workspace</Link>
        </p>
      <a href="/reset-password" className="block mt-4 text-sm text-white/70">Esqueci minha senha</a></form>
    </div>
  )
}
