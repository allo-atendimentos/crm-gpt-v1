'use client'

import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Plus, User, Calendar } from 'lucide-react'
import Link from 'next/link'

function DealCard({ deal, formatCurrency }: { deal: any; formatCurrency: (v: number) => string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal?.id ?? '' })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-card border border-border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
      <Link href={`/deals/${deal?.id}`} className="block" onClick={e => e.stopPropagation()}>
        <p className="font-medium text-sm mb-1 hover:text-[#0085ff]">{deal?.title ?? ''}</p>
      </Link>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {deal?.contact?.fullName ?? deal?.responsibleUser?.fullName ?? '—'}</span>
        <span className="font-mono font-medium text-foreground">{formatCurrency(Number(deal?.value ?? 0))}</span>
      </div>
      {deal?.expectedCloseDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Calendar className="w-3 h-3" /> {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  )
}

function StageColumn({ stage, deals, formatCurrency, onNewDeal }: any) {
  const { setNodeRef } = useDroppable({ id: stage?.id ?? '' })
  const stageDeals = (deals ?? []).filter((d: any) => d?.stageId === stage?.id)
  const totalValue = stageDeals.reduce((s: number, d: any) => s + Number(d?.value ?? 0), 0)

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-72 bg-muted/30 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage?.color ?? '#6B7280' }} />
          <h3 className="font-semibold text-sm">{stage?.name ?? ''}</h3>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{stageDeals.length}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3 font-mono">{formatCurrency(totalValue)}</p>
      <SortableContext items={stageDeals.map((d: any) => d?.id ?? '')} strategy={verticalListSortingStrategy}>
        <div className="min-h-[100px]">
          {stageDeals.map((d: any) => <DealCard key={d?.id} deal={d} formatCurrency={formatCurrency} />)}
        </div>
      </SortableContext>
      <button onClick={() => onNewDeal?.(stage?.id)}
        className="w-full py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg flex items-center justify-center gap-1 transition-colors mt-1">
        <Plus className="w-3 h-3" /> Adicionar
      </button>
    </div>
  )
}

export default function KanbanBoard({ stages, deals, onMoveDeal, onNewDeal, formatCurrency }: any) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: any) {
    const { active, over } = event ?? {}
    setActiveId(null)
    if (!active?.id || !over?.id) return
    const dealId = active.id
    const deal = deals?.find((d: any) => d?.id === dealId)
    if (!deal) return
    // over could be a stage id or another deal id
    let targetStageId = over.id
    const isStage = stages?.some((s: any) => s?.id === over.id)
    if (!isStage) {
      const overDeal = deals?.find((d: any) => d?.id === over.id)
      targetStageId = overDeal?.stageId ?? deal?.stageId
    }
    if (targetStageId && targetStageId !== deal?.stageId) {
      onMoveDeal?.(dealId, targetStageId)
    }
  }

  const activeDeal = deals?.find((d: any) => d?.id === activeId)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e: any) => setActiveId(e?.active?.id ?? null)} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {(stages ?? []).map((s: any) => (
          <StageColumn key={s?.id} stage={s} deals={deals} formatCurrency={formatCurrency} onNewDeal={onNewDeal} />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? (
          <div className="bg-card border-2 border-[#0085ff] rounded-lg p-3 shadow-xl w-72">
            <p className="font-medium text-sm">{activeDeal?.title}</p>
            <span className="text-xs font-mono">{formatCurrency(Number(activeDeal?.value ?? 0))}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
