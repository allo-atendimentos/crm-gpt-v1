'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DealsByStageChart({ data }: { data: any[] }) {
  if (!data?.length) return <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 25 }}>
          <XAxis dataKey="stage" tickLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={50} />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => [v, 'Negócios']} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {(data ?? []).map((entry: any, i: number) => (
              <Cell key={i} fill={entry?.color ?? '#6B7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
