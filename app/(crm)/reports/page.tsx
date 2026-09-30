'use client'

import { useEffect, useState } from 'react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { BarChart3, TrendingUp, CheckSquare, Target } from 'lucide-react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { clientApi } from '@/lib/client-api'

const ReportsCharts = dynamic(() => import('@/components/crm/reports-charts'), { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> })

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi('/api/reports').then(setData).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Relatórios' }]} />
      <h1 className="text-2xl font-display font-bold tracking-tight mb-2">Relatórios</h1>
      <p className="text-sm text-muted-foreground mb-6">Análise de desempenho do seu CRM</p>
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-muted/30 rounded-xl animate-pulse" />)}</div>
      ) : data ? (
        <ReportsCharts data={data} />
      ) : (
        <div className="bg-card rounded-xl border border-border p-8 text-sm text-muted-foreground">Não foi possível carregar os relatórios.</div>
      )}
    </div>
  )
}
