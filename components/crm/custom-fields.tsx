 'use client'
import {useEffect,useState} from 'react'
import {api} from './resource-manager'
import {toast} from 'sonner'
export default function CustomFields({entity,id,initial={}}:{entity:string,id:string,initial?:any}){const [fields,setFields]=useState<any[]>([]),[values,setValues]=useState(initial);useEffect(()=>{api('/api/preferences').then(d=>setFields(d.fields.filter((x:any)=>x.entity===entity))).catch(()=>{})},[entity]);if(!fields.length)return null;return <div className="boss-panel"><h2>Informações personalizadas</h2><div className="boss-fields">{fields.map(f=><label key={f.key}>{f.label}<input type={f.type} value={values[f.key]??''} onChange={e=>setValues({...values,[f.key]:e.target.value})}/></label>)}</div><button type="button" className="secondary" onClick={async()=>{try{await api(`/api/custom-fields/${entity}/${id}`,'PUT',{values});toast.success('Campos salvos')}catch(e:any){toast.error(e.message)}}}>Salvar informações</button></div>}

export function CustomFieldInputs({entity,values,onChange}:{entity:string,values:any,onChange:(v:any)=>void}){
 const [fields,setFields]=useState<any[]>([])
 useEffect(()=>{api('/api/preferences').then(d=>setFields(d.fields.filter((x:any)=>x.entity===entity))).catch(()=>{})},[entity])
 if(!fields.length)return null
 return <div className="boss-fields">{fields.map(f=><label key={f.key}>{f.label}<input type={f.type} value={values?.[f.key]??''} onChange={e=>onChange({...values,[f.key]:e.target.value})}/></label>)}</div>
}
