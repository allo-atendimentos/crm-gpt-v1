'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Target, Plus, List, LayoutGrid } from 'lucide-react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { EmptyState } from '@/components/crm/empty-state'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { clientApi } from '@/lib/client-api'

const KanbanBoard = dynamic(() => import('@/components/crm/kanban-board'), { ssr: false, loading: () => <div className="h-96 bg-muted/30 rounded-lg animate-pulse" /> })

export default function DealsPage() {
  const searchParams = useSearchParams()
  const initialOpenHandled = useRef(false)
  const [pipelines, setPipelines] = useState<any[]>([])
  const [options, setOptions] = useState<any>({ contacts: [], companies: [], users: [] })
  const [activePipeline, setActivePipeline] = useState<string>('')
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [newDealStageId, setNewDealStageId] = useState('')
  const emptyForm = { title: '', value: '', contactId: '', companyId: '', responsibleUserId: '', expectedCloseDate: '', priority: 'medium', source: '' }
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    clientApi<any[]>('/api/pipelines').then((data: any) => {
      const pipes = Array.isArray(data) ? data : []
      setPipelines(pipes)
      if (pipes.length > 0) setActivePipeline(pipes[0]?.id ?? '')
    }).catch((e: any) => toast.error(e.message))
    clientApi('/api/options').then(setOptions).catch((e: any) => toast.error(e.message))
  }, [])

  useEffect(() => {
    if (initialOpenHandled.current || !pipelines.length) return
    if (searchParams.get('new') === '1') {
      initialOpenHandled.current = true
      setForm((current: any) => ({
        ...current,
        contactId: searchParams.get('contactId') ?? '',
        companyId: searchParams.get('companyId') ?? '',
      }))
      setNewDealStageId(pipelines[0]?.stages?.[0]?.id ?? '')
      setShowNewDeal(true)
    }
  }, [pipelines, searchParams])

  const fetchDeals = useCallback(async () => {
    if (!activePipeline) return
    setLoading(true)
    try {
      const data = await clientApi<any>(`/api/deals?pipelineId=${activePipeline}&status=open`)
      setDeals(data?.deals ?? [])
    } catch (error: any) { toast.error(error?.message || 'Erro ao carregar negócios') }
    finally { setLoading(false) }
  }, [activePipeline])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const currentPipeline = pipelines.find((p: any) => p?.id === activePipeline)
  const stages = currentPipeline?.stages ?? []

  const handleMoveDeal = async (dealId: string, newStageId: string) => {
    const previous = deals
    setDeals(prev => prev.map((d: any) => d?.id === dealId ? { ...d, stageId: newStageId, stage: stages.find((s: any) => s?.id === newStageId) } : d))
    try {
      await clientApi(`/api/deals/${dealId}`, 'PUT', { stageId: newStageId })
    } catch (error: any) {
      setDeals(previous)
      toast.error(error?.message || 'Não foi possível mover o negócio')
      throw error
    }
  }

  const handleNewDeal = async () => {
    if (!form.title) { toast.error('Título obrigatório'); return }
    if (!activePipeline || !stages?.length) { toast.error('Selecione um funil com pelo menos uma etapa'); return }
    setSaving(true)
    try {
      const stageId = newDealStageId || stages?.[0]?.id
      await clientApi('/api/deals', 'POST', {
        ...form,
        contactId: form.contactId || null,
        pipelineId: activePipeline,
        stageId,
        value: parseFloat(form.value) || 0,
      })
      toast.success('Negócio criado!')
      setShowNewDeal(false)
      setForm(emptyForm)
      setNewDealStageId('')
      await fetchDeals()
    } catch (error: any) { toast.error(error?.message || 'Erro ao criar negócio') }
    finally { setSaving(false) }
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Negócios' }]} />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Negócios</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus negócios e funis de vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-card shadow-sm' : ''}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-card shadow-sm' : ''}`}><List className="w-4 h-4" /></button>
          </div>
          <Button size="sm" onClick={() => { setNewDealStageId(stages?.[0]?.id ?? ''); setShowNewDeal(true) }} className="bg-[#0085ff] hover:bg-[#d49018] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Negócio
          </Button>
        </div>
      </div>

      {/* Pipeline tabs */}
      {pipelines.length > 1 && (
        <div className="flex gap-1 mb-4">
          {pipelines.map((p: any) => (
            <button key={p?.id} onClick={() => setActivePipeline(p?.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activePipeline === p?.id ? 'bg-[#062a45] text-white' : 'bg-muted/50 hover:bg-muted'}`}>
              {p?.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="h-96 bg-muted/30 rounded-lg animate-pulse" />
      ) : stages.length === 0 ? (
        <EmptyState icon={Target} title="Nenhum funil configurado" description="Configure um funil nas configurações" />
      ) : viewMode === 'kanban' ? (
        <KanbanBoard stages={stages} deals={deals} onMoveDeal={handleMoveDeal} onNewDeal={(stageId: string) => { setNewDealStageId(stageId); setShowNewDeal(true) }} formatCurrency={formatCurrency} />
      ) : (
        /* List view */
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
              <th className="p-3 font-medium">Título</th><th className="p-3 font-medium">Etapa</th>
              <th className="p-3 font-medium">Contato</th><th className="p-3 font-medium">Responsável</th>
              <th className="p-3 font-medium text-right">Valor</th>
            </tr></thead>
            <tbody>
              {deals.map((d: any) => (
                <tr key={d?.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3 font-medium"><a href={`/deals/${d?.id}`} className="hover:text-[#0085ff]">{d?.title}</a></td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: (d?.stage?.color ?? '#6B7280') + '20', color: d?.stage?.color }}>{d?.stage?.name}</span></td>
                  <td className="p-3 text-muted-foreground">{d?.contact?.fullName ?? '—'}</td>
                  <td className="p-3 text-muted-foreground">{d?.responsibleUser?.fullName ?? '—'}</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(Number(d?.value ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Deal Modal */}
      <Dialog open={showNewDeal} onOpenChange={setShowNewDeal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Negócio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium mb-1">Título *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Valor (R$)</label>
                <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Previsão de Fechamento</label>
                <input type="date" value={form.expectedCloseDate} onChange={e => setForm({ ...form, expectedCloseDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Contato</label>
                <select value={form.contactId} onChange={e => setForm({ ...form, contactId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Sem contato</option>
                  {(options.contacts ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Empresa</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Sem empresa</option>
                  {(options.companies ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Responsável</label>
                <select value={form.responsibleUserId} onChange={e => setForm({ ...form, responsibleUserId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="">Eu</option>
                  {(options.users ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Prioridade</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                  <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                </select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Origem</label>
              <input type="text" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                placeholder="Ex.: Indicação, Instagram, Site"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg" /></div>
            <div><label className="block text-sm font-medium mb-1">Etapa</label>
              <select value={newDealStageId} onChange={e => setNewDealStageId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg">
                {stages.map((s: any) => <option key={s?.id} value={s?.id}>{s?.name}</option>)}
              </select></div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewDeal(false)}>Cancelar</Button>
            <Button onClick={handleNewDeal} disabled={saving} className="bg-[#0085ff] hover:bg-[#d49018] text-white">{saving ? 'Salvando...' : 'Criar Negócio'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
