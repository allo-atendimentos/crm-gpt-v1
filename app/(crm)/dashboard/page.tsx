'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Target, CheckSquare, MessageSquare, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const DealsByStageChart = dynamic(() => import('@/components/crm/deals-chart'), { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> })

function KpiCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold font-display tracking-tight">{value ?? 0}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-2">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error,setError]=useState('')

  useEffect(() => {
    fetch('/api/dashboard').then(async r => {const d=await r.json();if(!r.ok)throw Error(d.error??'Não foi possível carregar o painel');return d}).then(setData).catch(e=>setError(e.message)).finally(() => setLoading(false))
  }, [])

  if(error)return <div className="boss-panel" role="alert"><h1>Não foi possível carregar o painel</h1><p>{error}</p><button className="secondary" onClick={()=>window.location.reload()}>Tentar novamente</button></div>

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Visão Geral' }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold tracking-tight">Olá, {session?.user?.name?.split(' ')?.[0] ?? 'usuário'} 👋</h1>
        <p className="text-muted-foreground text-sm">Aqui está o resumo do seu workspace</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />)
        ) : (
          <>
            <KpiCard icon={Users} label="Total de Contatos" value={data?.totalContacts ?? 0} color="bg-blue-600" />
            <KpiCard icon={Target} label="Negócios Abertos" value={data?.openDealsCount ?? 0} sub={formatCurrency(data?.openDealsValue ?? 0)} color="bg-[#0085ff]" />
            <KpiCard icon={CheckSquare} label="Tarefas Pendentes" value={data?.pendingTasks ?? 0} color="bg-purple-600" />
            <KpiCard icon={MessageSquare} label="Conversas abertas" value={data?.openConversations??0} sub={`${data?.pendingConversations??0} aguardando atendimento`} color="bg-emerald-600" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0085ff]" /> Negócios por Etapa</h2>
          {loading ? <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> : <DealsByStageChart data={data?.chartData ?? []} />}
        </div>

        {/* Tasks */}
        <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-[#0085ff]" /> Minhas Tarefas</h2>
          {(data?.todayTasks?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa pendente 🎉</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(data?.todayTasks ?? []).map((t: any) => (
                <div key={t?.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t?.priority === 'high' || t?.priority === 'urgent' ? 'bg-red-500' : t?.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="truncate flex-1">{t?.title ?? ''}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/tasks" className="flex items-center gap-1 text-xs text-[#0085ff] hover:underline mt-3">Ver todas <ArrowRight className="w-3 h-3" /></Link>
        </div>
      </div>

      {/* Recent deals */}
      <div className="mt-6 bg-card rounded-xl p-5 border border-border shadow-sm">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-[#0085ff]" /> Últimos Negócios</h2>
        {(data?.recentDeals?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum negócio criado ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-left">
                <th className="pb-2 font-medium">Título</th><th className="pb-2 font-medium">Contato</th><th className="pb-2 font-medium">Etapa</th><th className="pb-2 font-medium text-right">Valor</th>
              </tr></thead>
              <tbody>
                {(data?.recentDeals ?? []).map((d: any) => (
                  <tr key={d?.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2"><Link href={`/deals/${d?.id}`} className="text-foreground hover:text-[#0085ff] font-medium">{d?.title ?? ''}</Link></td>
                    <td className="py-2 text-muted-foreground">{d?.contact?.fullName ?? '—'}</td>
                    <td className="py-2"><span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: (d?.stage?.color ?? '#6B7280') + '20', color: d?.stage?.color ?? '#6B7280' }}>{d?.stage?.name ?? ''}</span></td>
                    <td className="py-2 text-right font-mono">{formatCurrency(d?.value ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Link href="/deals" className="flex items-center gap-1 text-xs text-[#0085ff] hover:underline mt-3">Ver todos <ArrowRight className="w-3 h-3" /></Link>
      </div>
    </div>
  )
}
