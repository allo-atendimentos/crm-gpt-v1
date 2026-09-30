'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { Target, User, Building2, Calendar, Award, XCircle, CheckSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import CustomFields from '@/components/crm/custom-fields'
import { clientApi } from '@/lib/client-api'

export default function DealDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')

  useEffect(() => {
    clientApi(`/api/deals/${id}`).then(setDeal).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false))
  }, [id])

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

  const markWon = async () => {
    try {
      await clientApi(`/api/deals/${id}`, 'PUT', { dealStatus: 'won' })
      toast.success('Negócio marcado como ganho!')
      router.push('/deals')
    } catch (e: any) { toast.error(e.message) }
  }

  const markLost = async () => {
    if (!lostReason) { toast.error('Informe o motivo da perda'); return }
    try {
      await clientApi(`/api/deals/${id}`, 'PUT', { dealStatus: 'lost', lostReason })
      toast.success('Negócio marcado como perdido')
      router.push('/deals')
    } catch (e: any) { toast.error(e.message) }
  }

  if (loading) return <div className="h-64 bg-muted/30 rounded-xl animate-pulse" />
  if (!deal) return <p>Negócio não encontrado</p>

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Negócios', href: '/deals' }, { label: deal?.title ?? '' }]} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6"><CustomFields entity="deals" id={id} initial={deal.customFields??{}}/>
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-display font-bold tracking-tight">{deal?.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${deal?.dealStatus === 'won' ? 'bg-green-100 text-green-700' : deal?.dealStatus === 'lost' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {deal?.dealStatus === 'won' ? 'Ganho' : deal?.dealStatus === 'lost' ? 'Perdido' : 'Aberto'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold font-mono">{formatCurrency(Number(deal?.value ?? 0))}</p>
                <p className="text-xs text-muted-foreground">Valor</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{deal?.probability ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Probabilidade</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-lg font-semibold" style={{ color: deal?.stage?.color ?? '#6B7280' }}>{deal?.stage?.name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Etapa</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-lg font-semibold capitalize">{deal?.priority ?? 'medium'}</p>
                <p className="text-xs text-muted-foreground">Prioridade</p>
              </div>
            </div>
            {deal?.dealStatus === 'open' && (
              <div className="flex gap-2 mt-4">
                <Button onClick={markWon} className="bg-green-600 hover:bg-green-700 text-white"><Award className="w-4 h-4 mr-1" /> Marcar como Ganho</Button>
                <Button onClick={() => setShowLostModal(true)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"><XCircle className="w-4 h-4 mr-1" /> Marcar como Perdido</Button>
              </div>
            )}
          </div>
          {/* Notes */}
          {deal?.notes && <div className="bg-card rounded-xl p-6 border border-border shadow-sm"><h2 className="font-semibold mb-2">Notas</h2><p className="text-sm text-muted-foreground">{deal.notes}</p></div>}
          {/* Tasks */}
          <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
            <div className="flex items-center justify-between mb-3"><h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Tarefas</h2><Button size="sm" variant="outline" onClick={() => router.push(`/tasks?new=1&dealId=${encodeURIComponent(id)}`)}><Plus className="w-4 h-4 mr-1" /> Nova</Button></div>
            {(deal?.tasks?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tarefa</p> : (
              <div className="space-y-2">
                {deal.tasks.map((t: any) => (
                  <div key={t?.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <div className={`w-2 h-2 rounded-full ${t?.taskStatus === 'done' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm flex-1">{t?.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Detalhes</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> <div><p className="text-xs text-muted-foreground">Contato</p><p className="font-medium">{deal?.contact?.fullName ?? '—'}</p></div></div>
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> <div><p className="text-xs text-muted-foreground">Empresa</p><p className="font-medium">{deal?.company?.name ?? '—'}</p></div></div>
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> <div><p className="text-xs text-muted-foreground">Responsável</p><p className="font-medium">{deal?.responsibleUser?.fullName ?? '—'}</p></div></div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <div><p className="text-xs text-muted-foreground">Previsão</p><p className="font-medium">{deal?.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR') : '—'}</p></div></div>
              <div className="flex items-center gap-2"><Target className="w-4 h-4 text-muted-foreground" /> <div><p className="text-xs text-muted-foreground">Pipeline</p><p className="font-medium">{deal?.pipeline?.name ?? '—'}</p></div></div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showLostModal} onOpenChange={setShowLostModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Motivo da Perda</DialogTitle></DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-1">Por que o negócio foi perdido?</label>
            <select value={lostReason} onChange={e => setLostReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg mb-3">
              <option value="">Selecione...</option>
              <option value="preco">Preço alto</option><option value="concorrente">Escolheu concorrente</option>
              <option value="timing">Timing/Momento errado</option><option value="desistiu">Desistiu da compra</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowLostModal(false)}>Cancelar</Button>
            <Button onClick={markLost} className="bg-red-600 hover:bg-red-700 text-white">Confirmar Perda</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
