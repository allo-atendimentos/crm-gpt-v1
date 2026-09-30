import {Prisma} from '@prisma/client'
export const owners:Record<string,string>={contact:'responsibleUserId',company:'responsibleUserId',deal:'responsibleUserId',task:'assignedToId',conversation:'assignedToId'}
const modelName=(name:string)=>name[0].toLowerCase()+name.slice(1)
const models=Object.fromEntries(Prisma.dmmf.datamodel.models.map(m=>[modelName(m.name),m]))
export async function accessFilters(c:any){
 if(c.accessFilters)return c.accessFilters
 let ids:string[]|null=null
 if(['agent','guest'].includes(c.role))ids=[c.userId]
 if(c.role==='supervisor'){
  const teams=await c.tx.team.findMany({where:{tenantId:c.tenantId,supervisorId:c.userId},select:{id:true}})
  const members=await c.tx.teamMember.findMany({where:{teamId:{in:teams.map((t:any)=>t.id)}},select:{userId:true}})
  ids=[c.userId,...members.map((m:any)=>m.userId)]
 }
 const filters:Record<string,any>={}
 for(const [model,field]of Object.entries(owners))filters[model]={tenantId:c.tenantId,...(ids?{[field]:{in:ids}}:{})}
 if(ids){
  const deals=await c.tx.deal.findMany({where:filters.deal,select:{id:true}})
  filters.proposal={tenantId:c.tenantId,dealId:{in:deals.map((d:any)=>d.id)}}
  filters.message={tenantId:c.tenantId,conversation:{is:filters.conversation}}
 }
 c.accessFilters=filters
 return filters
}
// Apply scope to nested lists and relation counts before the query is executed.
export function scopeSelections(model:string,args:any,filters:Record<string,any>){
 const selection=args.include??args.select;if(!selection)return
 for(const field of models[model]?.fields??[]){
  if(field.kind!=='object'||!selection[field.name])continue
  const related=modelName(field.type),value=selection[field.name]===true?{}:selection[field.name]
  if(value.select&&!value.select.id)value.select.id=true
  if(field.isList&&filters[related])value.where={AND:[value.where??{},filters[related]]}
  scopeSelections(related,value,filters);selection[field.name]=value
 }
 if(selection._count){
  if(selection._count===true)selection._count={select:Object.fromEntries((models[model]?.fields??[]).filter(f=>f.kind==='object'&&f.isList).map(f=>[f.name,true]))}
  for(const [name,value]of Object.entries(selection._count.select??{})){
   const field=models[model]?.fields.find(f=>f.name===name);if(!field||!value)continue
   const filter=filters[modelName(field.type)];if(filter)selection._count.select[name]={where:{AND:[typeof value==='object'?(value as any).where??{}:{},filter]}}
  }
 }
}
// To-one relations are redacted after loading, avoiding invalid required-relation queries.
export async function redactRelations(model:string,result:any,c:any,filters:Record<string,any>){
 const requested=new Map<string,Set<string>>()
 function gather(m:string,v:any){for(const row of Array.isArray(v)?v:[v]){if(!row||typeof row!=='object')continue
  for(const f of models[m]?.fields??[]){if(f.kind!=='object'||!row[f.name])continue;const related=modelName(f.type)
   for(const item of Array.isArray(row[f.name])?row[f.name]:[row[f.name]]){if(filters[related]&&item.id){if(!requested.has(related))requested.set(related,new Set());requested.get(related)!.add(item.id)}gather(related,item)}
  }
 }}
 gather(model,result)
 const allowed=new Map<string,Set<string>>()
 for(const [related,ids]of requested){const rows=await c.tx[related].findMany({where:{AND:[filters[related],{id:{in:[...ids]}}]},select:{id:true}});allowed.set(related,new Set(rows.map((r:any)=>r.id)))}
 function clean(m:string,v:any):any{if(Array.isArray(v))return v.map(row=>clean(m,row));if(!v||typeof v!=='object')return v
  for(const f of models[m]?.fields??[]){if(f.kind!=='object'||!v[f.name])continue;const related=modelName(f.type),accept=(item:any)=>!allowed.has(related)||allowed.get(related)!.has(item.id)
   v[f.name]=Array.isArray(v[f.name])?v[f.name].filter(accept).map((item:any)=>clean(related,item)):accept(v[f.name])?clean(related,v[f.name]):null
  }return v
 }
 return clean(model,result)
}
