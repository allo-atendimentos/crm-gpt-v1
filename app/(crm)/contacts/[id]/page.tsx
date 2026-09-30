'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { Users, Building2, Mail, Phone, Tag, Target, CheckSquare, Plus, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { clientApi } from '@/lib/client-api'

export default function ContactDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [contact, setContact] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    clientApi(`/api/contacts/${id}`).then(setContact).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />)}</div>
  if (!contact) return <p className="text-muted-foreground">Contato não encontrado</p>

  const initials = (contact?.fullName ?? 'C').split(' ').map((w: string) => w?.[0] ?? '').join('').toUpperCase().substring(0, 2)
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Contatos', href: '/contacts' }, { label: contact?.fullName ?? '' }]} />
      {/* Header */}
      <div className="bg-card rounded-xl p-6 border border-border shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#062a45] text-white flex items-center justify-center text-xl font-bold">{initials}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold tracking-tight">{contact?.fullName}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              {contact?.jobTitle && <span>{contact.jobTitle}</span>}
              {contact?.company && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{contact.company.name}</span>}
            </div>
            <div className="flex gap-3 mt-2">
              {contact?.email && <span className="flex items-center gap-1 text-sm"><Mail className="w-3 h-3" /> <span suppressHydrationWarning>{contact.email}</span></span>}
              {contact?.phone && <span className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3" /> <span suppressHydrationWarning>{contact.phone}</span></span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/contacts/${id}/edit`)}><Edit className="w-4 h-4 mr-1" /> Editar</Button>
        </div>
        {(contact?.tags?.length ?? 0) > 0 && (
          <div className="flex gap-1.5 mt-3">
            {contact.tags.map((t: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded-full bg-[#0085ff]/10 text-[#0085ff] text-xs">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[{ key: 'overview', label: 'Visão Geral' }, { key: 'deals', label: 'Negócios' }, { key: 'tasks', label: 'Tarefas' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#0085ff] text-white' : 'bg-muted/50 hover:bg-muted'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Origem:</span> <span className="ml-2 font-medium">{contact?.source ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Responsável:</span> <span className="ml-2 font-medium">{contact?.responsibleUser?.fullName ?? '—'}</span></div>
            <div><span className="text-muted-foreground">CPF:</span> <span className="ml-2 font-medium">{contact?.cpf ?? '—'}</span></div>
            <div><span className="text-muted-foreground">Idioma:</span> <span className="ml-2 font-medium">{contact?.language ?? '—'}</span></div>
          </div>
          {contact?.notes && <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">{contact.notes}</div>}
        </div>
      )}

      {tab === 'deals' && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Target className="w-4 h-4" /> Negócios</h2>
            <Button size="sm" onClick={() => router.push(`/deals?new=1&contactId=${encodeURIComponent(id)}`)} className="bg-[#0085ff] hover:bg-[#d49018] text-white"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
          </div>
          {(contact?.deals?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Nenhum negócio vinculado</p> : (
            <div className="space-y-2">
              {contact.deals.map((d: any) => (
                <Link key={d?.id} href={`/deals/${d?.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div><p className="font-medium text-sm">{d?.title}</p><p className="text-xs text-muted-foreground">{d?.stage?.name ?? ''}</p></div>
                  <span className="font-mono text-sm">{formatCurrency(Number(d?.value ?? 0))}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Tarefas</h2>
            <Button size="sm" onClick={() => router.push(`/tasks?new=1&contactId=${encodeURIComponent(id)}`)} className="bg-[#0085ff] hover:bg-[#d49018] text-white"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
          </div>
          {(contact?.tasks?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada</p> : (
            <div className="space-y-2">
              {contact.tasks.map((t: any) => (
                <div key={t?.id} className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50">
                  <div className={`w-2 h-2 rounded-full ${t?.taskStatus === 'done' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-sm flex-1">{t?.title}</span>
                  <span className="text-xs text-muted-foreground">{t?.taskStatus === 'done' ? 'Concluída' : 'Pendente'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
