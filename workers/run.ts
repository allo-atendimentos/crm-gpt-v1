import { db } from '../lib/prisma'
import { send,consent } from '../lib/providers'
import { askAI } from '../lib/ai'
import { createHmac } from 'node:crypto'
const pause=(n:number)=>new Promise(r=>setTimeout(r,n))
export async function workOnce(){
 const job:any=await db.$transaction(async tx=>{const rows:any[]=await tx.$queryRaw`SELECT * FROM "Job" WHERE status='queued' AND "runAt" <= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') ORDER BY "runAt" FOR UPDATE SKIP LOCKED LIMIT 1`;if(!rows[0])return null;return tx.job.update({where:{id:rows[0].id},data:{status:'processing',lockedAt:new Date(),attempts:{increment:1}}})})
 if(!job)return false
 try{
  const p=job.payload as any,t=job.tenantId
  const tenant=await db.tenant.findUnique({where:{id:t}}),bill=await db.billing.findUnique({where:{tenantId:t}})
  if(tenant?.status==='suspended'||!((['active','cancelled'].includes(bill?.status??'')&&bill?.paidUntil&&bill?.paidUntil>new Date())||(tenant?.trialEndsAt&&tenant.trialEndsAt>new Date())))throw Error('Empresa sem assinatura ativa')
  if(job.type==='message'){
   const m=await db.message.findFirst({where:{id:p.id,tenantId:t,status:'queued'}});if(m){const conv=await db.conversation.findFirstOrThrow({where:{id:m.conversationId,tenantId:t}});if(p.bot&&!conv.botActive){await db.message.update({where:{id:m.id},data:{status:'cancelled'}})}else{
    const channel=await db.channel.findFirstOrThrow({where:{id:conv.channelId,tenantId:t}}),contact=await db.contact.findFirstOrThrow({where:{id:conv.contactId,tenantId:t}})
    if(channel.type==='whatsapp_official'&&!p.template){const last=await db.message.findFirst({where:{tenantId:t,conversationId:conv.id,direction:'inbound'},orderBy:{createdAt:'desc'}});if(!last||Date.now()-last.createdAt.getTime()>86400000)throw Error('Janela de atendimento encerrada')}
    const result=await send(channel,contact,m.content,{template:p.template,key:m.id})
    await db.message.update({where:{id:m.id},data:{status:'sent',externalId:result.id?channel.id+':'+result.id:null}})
    await db.conversation.update({where:{id:conv.id},data:{firstResponseAt:conv.firstResponseAt??new Date()}})
   }}
  }else if(job.type==='campaign'){
   const r=await db.campaignRecipient.findFirstOrThrow({where:{id:p.id,tenantId:t}}),campaign=await db.campaign.findFirstOrThrow({where:{id:r.campaignId,tenantId:t}})
   if(campaign.status==='paused'){await db.job.update({where:{id:job.id},data:{status:'paused'}});return true}
   const ch=await db.channel.findFirstOrThrow({where:{id:campaign.channelId,tenantId:t}}),contact=await db.contact.findFirstOrThrow({where:{id:r.contactId,tenantId:t}})
   if(campaign.status==='cancelled'||!consent(contact,ch.type)){await db.campaignRecipient.update({where:{id:r.id},data:{status:'skipped'}})}else if(r.status==='queued'){
    const unsub=createHmac('sha256',process.env.AUTH_SECRET!).update(t+':'+contact.id+':'+ch.type).digest('hex')
    const content=campaign.content.replaceAll('{{nome}}',contact.fullName)+(ch.type==='email'?`\n\nCancelar recebimento: ${process.env.APP_URL}/unsubscribe?tenant=${t}&contact=${contact.id}&channel=${ch.type}&token=${unsub}`:'')
    const result=await send(ch,contact,content,{template:campaign.template,key:r.id,subject:campaign.name})
    await db.campaignRecipient.update({where:{id:r.id},data:{status:'sent',externalId:result.id?ch.id+':'+result.id:null,sentAt:new Date()}})
   }
   const remaining=await db.campaignRecipient.count({where:{campaignId:campaign.id,status:'queued'}});if(!remaining)await db.campaign.update({where:{id:campaign.id},data:{status:'completed'}})
  }else if(job.type==='event'){
   const flows=await db.automation.findMany({where:{tenantId:t,active:true,trigger:p.event}})
   for(const flow of flows){const definition=flow.definition as any;const root=definition.nodes.find((x:any)=>x.data.kind==='trigger');if(!root)continue
    const run=await db.execution.upsert({where:{automationId_eventId:{automationId:flow.id,eventId:job.id}},create:{tenantId:t,automationId:flow.id,eventId:job.id,version:flow.version},update:{}})
    await db.job.upsert({where:{key:`flow:${run.id}:${root.id}`},create:{tenantId:t,key:`flow:${run.id}:${root.id}`,type:'flow',payload:{executionId:run.id,definition,nodeId:root.id,record:p.record}},update:{}})
   }
   const hooks=await db.webhookEndpoint.findMany({where:{tenantId:t,active:true}});for(const hook of hooks)await db.job.upsert({where:{key:`hook:${job.id}:${hook.id}`},create:{tenantId:t,key:`hook:${job.id}:${hook.id}`,type:'webhook',payload:{endpointId:hook.id,event:p}},update:{}})
  }else if(job.type==='flow'){
   const run=await db.execution.findFirstOrThrow({where:{id:p.executionId,tenantId:t}}),flow=await db.automation.findFirstOrThrow({where:{id:run.automationId,tenantId:t}});if(!flow.active)throw Error('Automação pausada')
   const n=p.definition.nodes.find((x:any)=>x.id===p.nodeId),data=n.data,record=p.record??{};let branch='true',delay=0
   if(data.kind==='condition')branch=String(record[data.field]??'')===String(data.value)?'true':'false'
   if(data.kind==='delay')delay=Math.min(43200,Math.max(0,Number(data.minutes)||0))*60000
   if(data.kind==='task')await db.task.create({data:{tenantId:t,title:data.title??'Acompanhar lead',contactId:p.definition.event==='deal'?record.contactId:record.contactId??(await db.contact.findFirst({where:{id:record.id,tenantId:t}}))?.id,dueAt:new Date(Date.now()+86400000)}})
   if(data.kind==='stage'){
    const stage=await db.stage.findFirst({where:{id:data.stageId,tenantId:t}});if(!stage)throw Error('Etapa inválida');await db.deal.updateMany({where:{id:record.id,tenantId:t},data:{stageId:stage.id,pipelineId:stage.pipelineId,dealStatus:stage.isWon?'won':stage.isLost?'lost':'open',closedAt:stage.isWon||stage.isLost?new Date():null}})
   }
   if(data.kind==='handoff')await db.conversation.updateMany({where:{id:record.conversationId??record.id,tenantId:t},data:{botActive:false,status:'pending'}})
   if(data.kind==='message'){
    const conv=await db.conversation.findFirst({where:{id:record.conversationId??record.id,tenantId:t}});if(!conv)throw Error('Evento sem conversa vinculada')
    const message=await db.message.create({data:{tenantId:t,conversationId:conv.id,direction:'outbound',content:String(data.content??'')}});await db.job.create({data:{tenantId:t,type:'message',key:'message:'+message.id,payload:{id:message.id,template:data.template}}})
   }
   const next=p.definition.edges.filter((e:any)=>e.source===n.id&&(data.kind!=='condition'||(e.sourceHandle??'true')===branch))
   for(const edge of next)await db.job.upsert({where:{key:`flow:${run.id}:${edge.target}`},create:{tenantId:t,type:'flow',key:`flow:${run.id}:${edge.target}`,runAt:new Date(Date.now()+delay),payload:{...p,nodeId:edge.target}},update:{}})
   const outstanding=await db.job.count({where:{tenantId:t,type:'flow',status:{in:['queued','processing']},id:{not:job.id},payload:{path:['executionId'],equals:run.id}}});
   await db.execution.update({where:{id:run.id},data:{status:outstanding?'running':'completed',log:[...(Array.isArray(run.log)?run.log:[]),{node:n.id,kind:data.kind,at:new Date().toISOString()}]}})
  }else if(job.type==='agent'){
   const conv=await db.conversation.findFirst({where:{id:p.conversationId,tenantId:t,botActive:true}});if(conv){const agent=await db.agent.findFirst({where:{tenantId:t,channelId:conv.channelId,active:true}});if(agent){
    const messages=await db.message.findMany({where:{tenantId:t,conversationId:conv.id,internal:false},take:20,orderBy:{createdAt:'desc'}})
    try{const result=await askAI(t,messages.reverse().map(m=>`${m.direction}: ${m.content}`).join('\n'),agent,{conversationId:conv.id})
     if(await db.conversation.findFirst({where:{id:conv.id,botActive:true}})){const m=await db.message.create({data:{tenantId:t,conversationId:conv.id,direction:'outbound',content:result.text}});await db.job.create({data:{tenantId:t,type:'message',key:'message:'+m.id,payload:{id:m.id,bot:true}}})}
    }catch(e){await db.conversation.update({where:{id:conv.id},data:{botActive:false,status:'pending'}});throw e}
   }}
  }else if(job.type==='webhook'){
   const hook=await db.webhookEndpoint.findFirst({where:{id:p.endpointId,tenantId:t,active:true}});if(hook){const url=new URL(hook.url);const allowed=(process.env.WEBHOOK_ALLOWED_ORIGINS??'').split(',');if(!allowed.includes(url.origin))throw Error('Destino de webhook não autorizado pela plataforma');const raw=JSON.stringify(p.event);const res=await fetch(hook.url,{method:'POST',headers:{'Content-Type':'application/json','X-Boss-Signature':createHmac('sha256',hook.secret).update(raw).digest('hex'),'X-Boss-Event-Id':job.id},body:raw,redirect:'error',signal:AbortSignal.timeout(15000)});if(!res.ok)throw Error('Webhook externo recusado')}
  }
  await db.job.update({where:{id:job.id},data:{status:'completed',error:null}})
 }catch(e:any){
  const error=String(e.message).slice(0,500);await db.job.update({where:{id:job.id},data:{status:'failed',error}})
  if(job.type==='message')await db.message.updateMany({where:{id:(job.payload as any).id,tenantId:job.tenantId},data:{status:'failed',error}})
  if(job.type==='campaign')await db.campaignRecipient.updateMany({where:{id:(job.payload as any).id,tenantId:job.tenantId},data:{status:'failed',error}})
  if(job.type==='flow')await db.execution.updateMany({where:{id:(job.payload as any).executionId,tenantId:job.tenantId},data:{status:'failed',log:[{error}]}})
 }
 return true
}
async function main(){console.log('Worker Boss iniciado');await db.job.updateMany({where:{status:'processing',lockedAt:{lt:new Date(Date.now()-300000)}},data:{status:'failed',error:'Execução interrompida; revisar antes de reenviar para evitar duplicidade'}});for(;;){try{if(!await workOnce())await pause(1000)}catch{await pause(3000)}}}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/workers/run.ts'))main()
