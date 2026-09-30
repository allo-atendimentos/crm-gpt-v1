import { db } from './prisma'
export async function inbound(channel:any,externalId:string,sender:string,name:string,content:string){
 if(!sender||!content)return
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${channel.tenantId}))`
  if(await tx.message.findFirst({where:{tenantId:channel.tenantId,externalId:channel.id+':'+sender+':'+externalId}}))return
  const type=channel.type,phone=['whatsapp_official','whatsapp_session','sms'].includes(type)?sender.replace(/\D/g,''):null
  const email=type==='email'?sender.toLowerCase():null
  let contact=await tx.contact.findFirst({where:{tenantId:channel.tenantId,...(phone?{phone}:email?{email}:{socialProfiles:{path:[type],equals:sender}})}})
  if(!contact)contact=await tx.contact.create({data:{tenantId:channel.tenantId,fullName:name||sender,phone,email,source:type,socialProfiles:{[type]:sender}}})
  const agent=await tx.agent.findFirst({where:{tenantId:channel.tenantId,channelId:channel.id,active:true}})
  const conversation=await tx.conversation.upsert({where:{tenantId_channelId_contactId:{tenantId:channel.tenantId,channelId:channel.id,contactId:contact.id}},create:{tenantId:channel.tenantId,channelId:channel.id,contactId:contact.id,subject:contact.fullName,botActive:!!agent},update:{updatedAt:new Date(),status:'open'}})
  const m=await tx.message.create({data:{tenantId:channel.tenantId,conversationId:conversation.id,externalId:channel.id+':'+sender+':'+externalId,direction:'inbound',content,status:'received'}})
  if(/^(sair|parar|stop|cancelar)$/i.test(content.trim())){const consents=Array.isArray(contact.consents)?contact.consents:[];await tx.contact.update({where:{id:contact.id},data:{consents:consents.map((c:any)=>c.channel===type?{...c,optedOutAt:new Date().toISOString(),granted:false}:c)}});await tx.conversation.update({where:{id:conversation.id},data:{botActive:false}});return}
  await tx.job.create({data:{tenantId:channel.tenantId,key:'inbound:'+m.id,type:'event',payload:{event:'message.received',record:{id:m.id,conversationId:conversation.id,contactId:contact.id,content}}}})
  if(conversation.botActive)await tx.job.create({data:{tenantId:channel.tenantId,key:'agent:'+m.id,type:'agent',payload:{conversationId:conversation.id}}})
 })
}
