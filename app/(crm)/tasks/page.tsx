'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckSquare, Plus, Calendar, Phone, Mail, Target, ClipboardList } from 'lucide-react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { EmptyState } from '@/components/crm/empty-state'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { clientApi } from '@/lib/client-api'

const priorityColors: Record<string, string> = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', urgent: 'bg-red-500' }
const priorityLabels: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' }
const typeIcons: Record<string, any> = { call: Phone, meeting: Calendar, email: Mail, follow_up: Target, task: ClipboardList }
const typeLabels: Record<string, string> = { call: 'Ligação', meeting: 'Reunião', email: 'E-mail', follow_up: 'Follow-up', task: 'Tarefa' }

export default function TasksPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const initialOpenHandled = useRef(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [options, setOptions] = useState<any>({ contacts: [], deals: [], users: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('mine')
  const [showModal, setShowModal] = useState(false)
  const emptyForm = { title: '', description: '', type: 'task', priority: 'medium', dueAt: '', contactId: '', dealId: '', assignedToId: '' }
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi<any>(`/api/tasks?filter=${filter}`)
      setTasks(data?.tasks ?? [])
    } catch (error: any) { toast.error(error?.message || 'Erro ao carregar tarefas') }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchTasks() }, [fetchTasks])
  useEffect(() => { clientApi('/api/options').then(setOptions).catch((e: any) => toast.error(e.message)) }, [])
  useEffect(() => {
    if (initialOpenHandled.current || searchParams.get('new') !== '1') return
    initialOpenHandled.current = true
    setForm((current: any) => ({ ...current, contactId: searchParams.get('contactId') ?? '', dealId: searchParams.get('dealId') ?? '' }))
    setShowModal(true)
  }, [searchParams])

  const toggleDone = async (task: any) => {
    const newStatus = task?.taskStatus === 'done' ? 'pending' : 'done'
    try {
      await clientApi(`/api/tasks/${task?.id}`, 'PUT', { taskStatus: newStatus })
      await fetchTasks()
    } catch (error: any) { toast.error(error?.message || 'Não foi possível atualizar a tarefa') }
  }

  const handleSave = async () => {
    if (!form.title) { toast.error('Título obrigatório'); return }
    setSaving(true)
    try {
      await clientApi('/api/tasks', 'POST', form)
      toast.success('Tarefa criada!')
      setShowModal(false)
      setForm(emptyForm)
      await fetchTasks()
    } catch (error: any) { toast.error(error?.message || 'Erro ao criar tarefa') }
    finally { setSaving(false) }
  }

  const isOverdue = (d: string | null) => {
    if (!d) return false
    return new Date(d) < new Date()
  }
  const isToday = (d: string | null) => {
    if (!d) return false
    const t = new Date(d)
    const n = new Date()
    return t.toDateString() === n.toDateString()
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Tarefas' }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe suas atividades e follow-ups</p>
        </div>
        <Button size="sm" onClick={() => setShowModal(true)} className="bg-[#0085ff] hover:bg-[#d49018] text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Tarefa
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ key: 'mine', label: 'Minhas' }, { key: 'all', label: 'Todas' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-[#0085ff] text-white' : 'bg-muted/50 hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      ) : (tasks?.length ?? 0) === 0 ? (
        <EmptyState icon={CheckSquare} title="Nenhuma tarefa" description="Crie sua primeira tarefa" actionLabel="Nova Tarefa" onAction={() => setShowModal(true)} />
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
              <th className="p-3 w-10"></th>
              <th className="p-3 font-medium">Título</th><th className="p-3 font-medium">Tipo</th>
              <th className="p-3 font-medium">Prioridade</th><th className="p-3 font-medium">Vencimento</th>
              <th className="p-3 font-medium">Vinculado a</th>
            </tr></thead>
            <tbody>
              {tasks.map((t: any) => {
                const Icon = typeIcons[t?.type ?? 'task'] ?? ClipboardList
                const overdue = t?.taskStatus !== 'done' && isOverdue(t?.dueAt)
                const today = t?.taskStatus !== 'done' && isToday(t?.dueAt)
                return (
                  <tr key={t?.id} className={`border-b border-border/50 hover:bg-muted/20 ${t?.taskStatus === 'done' ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <input type="checkbox" checked={t?.taskStatus === 'done'} onChange={() => toggleDone(t)}
                        className="w-4 h-4 rounded border-border accent-[#0085ff]" />
                    </td>
                    <td className="p-3 font-medium">{t?.title}</td>
                    <td className="p-3"><span className="flex items-center gap-1 text-muted-foreground"><Icon className="w-3 h-3" /> {typeLabels[t?.type ?? 'task'] ?? t?.type}</span></td>
                    <td className="p-3"><span className={`inline-flex items-center gap-1`}><span className={`w-2 h-2 rounded-full ${priorityColors[t?.priority ?? 'medium']}`} /> {priorityLabels[t?.priority ?? 'medium']}</span></td>
                    <td className={`p-3 ${overdue ? 'text-red-500 font-medium' : today ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                      {t?.dueAt ? new Date(t.dueAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {t?.contact?.fullName ?? t?.deal?.title ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium mb-1">Título *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="task">Tarefa</option><option value="call">Ligação</option>
                  <option value="meeting">Reunião</option><option value="email">E-mail</option>
                  <option value="follow_up">Follow-up</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Prioridade</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="low">Baixa</option><option value="medium">Média</option>
                  <option value="high">Alta</option><option value="urgent">Urgente</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Vencimento</label>
                <input type="date" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className="block text-sm font-medium mb-1">Contato</label>
                <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Sem contato</option>{(options.contacts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Negócio</label>
                <select value={form.dealId} onChange={e => setForm({ ...form, dealId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Sem negócio</option>{(options.deals ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Responsável</label>
                <select value={form.assignedToId} onChange={e => setForm({ ...form, assignedToId: e.target.value })} className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Eu</option>{(options.users ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0085ff] hover:bg-[#d49018] text-white">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
