'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { BarChart3, Target, CheckSquare, TrendingUp } from 'lucide-react'

export default function ReportsCharts({ data }: { data: any }) {
  const taskData = [
    { name: 'Concluídas', value: data?.tasksDone ?? 0, color: '#10B981' },
    { name: 'Pendentes', value: data?.tasksPending ?? 0, color: '#F59E0B' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Deals by Stage */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#0085ff]" /> Negócios por Etapa</h2>
        {(data?.dealsByStageChart?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dealsByStageChart ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 25 }}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(data?.dealsByStageChart ?? []).map((e: any, i: number) => <Cell key={i} fill={e?.color ?? '#6B7280'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Conversion */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0085ff]" /> Taxa de Conversão</h2>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <p className="text-5xl font-bold font-display text-[#0085ff]">{data?.conversionRate ?? 0}%</p>
            <p className="text-sm text-muted-foreground mt-2">{data?.wonDeals ?? 0} ganhos de {data?.totalDeals ?? 0} total</p>
          </div>
        </div>
      </div>

      {/* Value by stage */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-[#0085ff]" /> Valor por Etapa (R$)</h2>
        {(data?.dealsByStageChart?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dealsByStageChart ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
                <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v), 'Valor']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {(data?.dealsByStageChart ?? []).map((e: any, i: number) => <Cell key={i} fill={e?.color ?? '#6B7280'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-[#0085ff]" /> Tarefas</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={taskData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" label={({ name, value }: any) => `${name}: ${value}`}>
                {taskData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
