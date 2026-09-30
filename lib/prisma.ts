import { PrismaClient } from '@prisma/client'
import { context } from './context'
import {accessFilters,scopeSelections,redactRelations} from './access'
const g=globalThis as unknown as { bossDb: PrismaClient }
export const db=g.bossDb ?? new PrismaClient()
if(process.env.NODE_ENV!=='production') g.bossDb=db
const scoped=new Set(['team','company','contact','pipeline','stage','deal','task','auditLog','userInvitation','product','proposal','channel','conversation','message','automation','execution','campaign','campaignRecipient','knowledge','agent','integration','usage','billing','invoice','job','apiKey','webhookEndpoint'])
const owner:any={contact:'responsibleUserId',company:'responsibleUserId',deal:'responsibleUserId',task:'assignedToId',conversation:'assignedToId'}
const refs:any={companyId:'company',contactId:'contact',dealId:'deal',pipelineId:'pipeline',stageId:'stage',responsibleUserId:'user',assignedToId:'user',teamId:'team',channelId:'channel',conversationId:'conversation',campaignId:'campaign',automationId:'automation',supervisorId:'user'}
export const prisma:any=new Proxy(db,{get(target,model:string){
 const ctx=context.getStore();const client=ctx?.tx??target
 if(!scoped.has(model)&&model!=='user') { const v=client[model]; return typeof v==='function'?v.bind(client):v }
 return new Proxy(client[model],{get(delegate,op:string){return async(args:any={})=>{
  const c=context.getStore(); if(!c) return delegate[op](args)
  const write=/^(create|update|delete|upsert)/.test(op)
  if(model==='user'&&write&& !['admin','superadmin'].includes(c.role)) throw new Error('403:Sem permissão')
  if(['analyst','guest'].includes(c.role)&&write) throw new Error('403:Perfil somente leitura')
  const filter:any={tenantId:c.tenantId}
  if(args.take!==undefined)args.take=Math.min(10000,Math.max(1,Number(args.take)||25))
  if(args.skip!==undefined)args.skip=Math.max(0,Number(args.skip)||0)
  const filters=await accessFilters(c)
  Object.assign(filter,filters[model]??{})
  scopeSelections(model,args,filters)
  if(op==='findUnique') op='findFirst'
  if(op==='findUniqueOrThrow') op='findFirstOrThrow'
  if(!op.startsWith('create')) args.where={...args.where,...filter}
  const data=args.data
  if(data){
   if(Array.isArray(data)) throw new Error('400:Use importação validada')
   if(data.tenantId&&data.tenantId!==c.tenantId) throw new Error('403:Empresa inválida')
   if(op.startsWith('create')) data.tenantId=c.tenantId
   if(owner[model]&&['agent','guest'].includes(c.role)) data[owner[model]]=c.userId
   for(const [key,value] of Object.entries(data)) {
    if(value&&typeof value==='object'&&['connect','connectOrCreate','create','update'].some(x=>x in (value as any))) throw new Error('400:Relação inválida')
    if(refs[key]&&value){const found=await c.tx[refs[key]].findFirst({where:{AND:[{id:value,tenantId:c.tenantId},filters[refs[key]]??{}]}});if(!found)throw new Error('400:Registro relacionado não pertence à empresa')}
   }
   if(model==='user'||model==='userInvitation') {
    if(data.role&&!['admin','manager','supervisor','agent','analyst','financial','guest'].includes(data.role))throw new Error('403:Papel não permitido')
   }
   if(model==='deal'&&(Object.prototype.hasOwnProperty.call(data,'stageId')||Object.prototype.hasOwnProperty.call(data,'pipelineId'))){
    const existing=args.where?.id?await c.tx.deal.findFirst({where:{id:args.where.id,tenantId:c.tenantId}}):null
    const sid=Object.prototype.hasOwnProperty.call(data,'stageId')?data.stageId:existing?.stageId
    const pid=Object.prototype.hasOwnProperty.call(data,'pipelineId')?data.pipelineId:existing?.pipelineId
    if(!sid||!pid)throw new Error('400:Negócio exige funil e etapa')
    const stage=await c.tx.stage.findFirst({where:{id:sid,tenantId:c.tenantId}})
    if(!stage||stage.pipelineId!==pid)throw new Error('400:Etapa não pertence ao funil')
    if(Object.prototype.hasOwnProperty.call(data,'stageId')){data.dealStatus=stage.isWon?'won':stage.isLost?'lost':'open';data.closedAt=data.dealStatus==='open'?null:new Date()}
   }
   if(model==='deal'&&data.dealStatus==='open')data.closedAt=null
  }
  if(write&&data?.value!==undefined&&(!Number.isFinite(Number(data.value))||Number(data.value)<0))throw new Error('400:Valor inválido')
  if(write&&data?.probability!==undefined&&(Number(data.probability)<0||Number(data.probability)>100))throw new Error('400:Probabilidade inválida')
  const result=await delegate[op](args)
  if(args.include||args.select)await redactRelations(model,result,c,filters)
  if(write&&['updateMany','deleteMany'].includes(op)&&result.count===0&&args.where?.id)throw new Error('404:Registro não encontrado')
  if(write&&!['auditLog','job','usage','execution'].includes(model)){
   await c.tx.auditLog.create({data:{tenantId:c.tenantId,userId:c.userId??null,action:`${model}.${op}`,resourceType:model,resourceId:result?.id??args.where?.id??null,newValue:{fields:Object.keys(data??{})}}})
   if(['contact','deal','task'].includes(model)){
    const event=op.startsWith('create')?`${model}.created`:model==='deal'&&data?.stageId?'deal.stage_changed':`${model}.updated`
    await c.tx.job.create({data:{tenantId:c.tenantId,type:'event',key:crypto.randomUUID(),payload:{event,record:{...data,id:result?.id??args.where?.id}}}})
   }
  }
  if(write)delete c.accessFilters
  return result
 }}})
}})
