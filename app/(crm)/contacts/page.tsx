'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Search, Upload, Trash2, Edit, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { EmptyState } from '@/components/crm/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { clientApi } from '@/lib/client-api'

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 25

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search })
      const data = await clientApi<any>(`/api/contacts?${params}`)
      setContacts(data?.contacts ?? [])
      setTotal(data?.total ?? 0)
    } catch (error: any) { toast.error(error?.message || 'Erro ao carregar contatos') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return
    try {
      await clientApi(`/api/contacts/${id}`, 'DELETE')
      toast.success('Contato excluído')
      await fetchContacts()
    } catch (error: any) { toast.error(error?.message || 'Não foi possível excluir o contato') }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Contatos' }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Contatos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus contatos e leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/contacts/import')}>
            <Upload className="w-4 h-4 mr-1" /> Importar CSV
          </Button>
          <Button size="sm" onClick={() => router.push('/contacts/new')} className="bg-[#0085ff] hover:bg-[#d49018] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Contato
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      ) : (contacts?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="Nenhum contato encontrado" description="Comece adicionando seu primeiro contato" actionLabel="Novo Contato" onAction={() => router.push('/contacts/new')} />
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">E-mail</th>
                  <th className="p-3 font-medium">Telefone</th>
                  <th className="p-3 font-medium">Empresa</th>
                  <th className="p-3 font-medium">Responsável</th>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr></thead>
                <tbody>
                  {contacts.map((c: any) => (
                    <tr key={c?.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium">
                        <Link href={`/contacts/${c?.id}`} className="hover:text-[#0085ff]">{c?.fullName ?? ''}</Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{c?.email ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{c?.phone ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{c?.company?.name ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{c?.responsibleUser?.fullName ?? '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => router.push(`/contacts/${c?.id}`)} className="p-1.5 rounded hover:bg-muted"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => router.push(`/contacts/${c?.id}/edit`)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c?.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total} resultados</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
