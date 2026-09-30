'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {CustomFieldInputs} from '@/components/crm/custom-fields'
import {api} from '@/components/crm/resource-manager'
import { Building2, Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import { Breadcrumbs } from '@/components/crm/breadcrumbs'
import { EmptyState } from '@/components/crm/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { clientApi } from '@/lib/client-api'

export default function CompaniesPage() {
  const [editingId,setEditingId]=useState<string|null>(null)
  const emptyForm={name:'',cnpj:'',industry:'',size:'',website:'',notes:'',customFields:{}}
  function openCompany(company:any=null){setEditingId(company?.id??null);setForm(company??emptyForm);setShowModal(true)}
  const [companies, setCompanies] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)
  const limit = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clientApi<any>(`/api/companies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`)
      setCompanies(data?.companies ?? [])
      setTotal(data?.total ?? 0)
    } catch (error: any) { toast.error(error?.message || 'Erro ao carregar empresas') }
    finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome é obrigatório'); return }
    setSaving(true)
    try {
      await clientApi(editingId?`/api/companies/${editingId}`:'/api/companies', editingId?'PUT':'POST', form)
      toast.success(editingId?'Empresa atualizada!':'Empresa criada!')
      setShowModal(false)
      setForm(emptyForm)
      await fetchData()
    } catch (error: any) { toast.error(error?.message || (editingId ? 'Erro ao atualizar empresa' : 'Erro ao criar empresa')) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta empresa?')) return
    try{await api(`/api/companies/${id}`,'DELETE');toast.success('Empresa excluída');fetchData()}catch(e:any){toast.error(e.message)}
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Empresas' }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Empresas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as empresas do seu CRM</p>
        </div>
        <Button size="sm" onClick={() => openCompany()} className="bg-[#0085ff] hover:bg-[#006fd6] text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Empresa
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar empresas..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />)}</div>
      ) : (companies?.length ?? 0) === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma empresa encontrada" description="Adicione sua primeira empresa" actionLabel="Nova Empresa" onAction={() => openCompany()} />
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30 text-muted-foreground text-left">
                <th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">CNPJ</th>
                <th className="p-3 font-medium">Setor</th><th className="p-3 font-medium">Contatos</th>
                <th className="p-3 font-medium">Negócios</th><th className="p-3 font-medium text-right">Ações</th>
              </tr></thead>
              <tbody>
                {companies.map((c: any) => (
                  <tr key={c?.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-medium"><Link href={`/companies/${c.id}`} className="hover:underline">{c?.name}</Link></td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{c?.cnpj ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{c?.industry ?? '—'}</td>
                    <td className="p-3">{c?._count?.contacts ?? 0}</td>
                    <td className="p-3">{c?._count?.deals ?? 0}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button aria-label="Editar empresa" onClick={()=>openCompany(c)} className="p-1.5 rounded hover:bg-muted"><Edit className="w-4 h-4"/></button>
                        <button aria-label="Excluir empresa" onClick={() => handleDelete(c?.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Mostrando {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} de {total}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId?'Editar empresa':'Nova empresa'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium mb-1">Nome *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-sm font-medium mb-1">CNPJ</label>
              <input type="text" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Setor</label>
                <input type="text" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm font-medium mb-1">Porte</label>
                <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option><option value="micro">Micro</option><option value="small">Pequena</option>
                  <option value="medium">Média</option><option value="large">Grande</option><option value="enterprise">Enterprise</option>
                </select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Website</label>
              <input type="url" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
          <CustomFieldInputs entity="companies" values={form.customFields??{}} onChange={customFields=>setForm({...form,customFields})}/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#0085ff] hover:bg-[#006fd6] text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
