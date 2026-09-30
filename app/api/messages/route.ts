import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
export async function POST(req:Request){return route(req,async()=>{
 const b=await req.json();if(typeof b.content!=='string'||!b.content.trim()||b.content.length>10000)fail(400,'Mensagem inválida')
 const conversation=await prisma.conversation.findFirst({where:{id:b.conversationId}});if(!conversation)fail(404,'Conversa não encontrada')
 const channel=await prisma.channel.findFirst({where:{id:conversation.channelId}})
 if(channel.type==='whatsapp_official'&&!b.internal&&!b.template){const inbound=await prisma.message.findFirst({where:{conversationId:conversation.id,direction:'inbound'},orderBy:{createdAt:'desc'}});if(!inbound||Date.now()-inbound.createdAt.getTime()>86400000)fail(400,'Fora da janela de atendimento: use um template aprovado')}
 const message=await prisma.message.create({data:{conversationId:conversation.id,direction:'outbound',content:b.content,internal:!!b.internal,status:b.internal?'internal':'queued'}})
 await prisma.conversation.updateMany({where:{id:conversation.id},data:{botActive:false,updatedAt:new Date()}})
 if(!b.internal)await prisma.job.create({data:{key:'message:'+message.id,type:'message',payload:{id:message.id,template:b.template}}})
 return NextResponse.json(message)
})}
