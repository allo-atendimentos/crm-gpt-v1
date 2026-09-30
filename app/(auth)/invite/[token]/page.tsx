'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function InvitePage() {
  const { token } = useParams() as { token: string }
  const router = useRouter()
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/invite/${token}`).then(r => r.json()).then(d => { setInvitation(d); setLoading(false) }).catch(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || password.length < 8) { toast.error('Preencha todos os campos (senha mínimo 8 caracteres)'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data?.error ?? 'Erro'); return }
      const login = await signIn('credentials', { email: invitation?.email, password, redirect: false })
      if (!login?.error) { router.replace('/dashboard') }
      else { router.push('/login') }
    } catch { toast.error('Erro ao aceitar convite') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="w-full max-w-md"><div className="h-64 bg-white/10 rounded-2xl animate-pulse" /></div>
  if (!invitation || invitation?.error) return (
    <div className="w-full max-w-md text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4"><UserPlus className="w-6 h-6 text-red-400" /></div>
      <h1 className="text-xl font-bold text-white">Convite inválido ou expirado</h1>
      <p className="text-white/60 mt-2">Solicite um novo convite ao administrador do workspace.</p>
    </div>
  )

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-[#0085ff] flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">A</div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight">Aceitar Convite</h1>
        <p className="text-white/60 mt-1">Você foi convidado para o workspace</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
        <p className="text-sm text-white/80 mb-4">E-mail: <strong>{invitation?.email}</strong></p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Seu nome completo</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Defina sua senha</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#0085ff] pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full mt-6 py-2.5 bg-[#0085ff] hover:bg-[#d49018] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> Entrar no Workspace</>}
        </button>
      </form>
    </div>
  )
}
