'use client'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {api} from '@/components/crm/resource-manager'
import CustomFields from '@/components/crm/custom-fields'
export default function CompanyDetail(){
 const {id}=useParams<{id:string}>(),[company,setCompany]=useState<any>(null),[error,setError]=useState('')
 useEffect(()=>{api('/api/companies/'+id).then(setCompany).catch(e=>setError(e.message))},[id])
 if(error)return <div className="boss-panel" role="alert">{error}</div>
 if(!company)return <p>Carregando empresa…</p>
 return <section className="boss-page"><Link href="/companies" className="text-sm text-blue-600">← Empresas</Link><div className="boss-title mt-4"><div><span className="eyebrow">RELACIONAMENTO COMERCIAL</span><h1>{company.name}</h1><p>{company.industry||'Setor não informado'}</p></div></div><div className="grid gap-6 lg:grid-cols-2"><div className="boss-panel"><h2>Cadastro</h2><dl className="grid grid-cols-2 gap-3 mt-4"><dt>CNPJ</dt><dd>{company.cnpj||'Não informado'}</dd><dt>Porte</dt><dd>{company.size||'Não informado'}</dd><dt>Responsável</dt><dd>{company.responsibleUser?.fullName||'Não atribuído'}</dd><dt>Site</dt><dd className="break-all">{company.website||'Não informado'}</dd></dl>{company.notes&&<p className="mt-5 whitespace-pre-wrap">{company.notes}</p>}</div><CustomFields entity="companies" id={id} initial={company.customFields}/><div className="boss-panel"><h2>Contatos vinculados</h2><ul className="divide-y">{company.contacts.map((c:any)=><li className="py-3" key={c.id}><Link className="text-blue-600" href={'/contacts/'+c.id}>{c.fullName}</Link></li>)}</ul>{!company.contacts.length&&<p className="mt-4 text-sm text-muted-foreground">Nenhum contato vinculado disponível para seu perfil.</p>}</div><div className="boss-panel"><h2>Negócios vinculados</h2><ul className="divide-y">{company.deals.map((d:any)=><li className="py-3 flex justify-between gap-3" key={d.id}><Link className="text-blue-600" href={'/deals/'+d.id}>{d.title}</Link><span>{d.stage?.name}</span></li>)}</ul>{!company.deals.length&&<p className="mt-4 text-sm text-muted-foreground">Nenhum negócio vinculado disponível para seu perfil.</p>}</div></div></section>
}
