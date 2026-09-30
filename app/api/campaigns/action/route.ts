import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { consent } from '@/lib/providers'
export async function POST(req:Request){return route(req,async()=>{
 const {id,action}=await req.json();const campaign=await prisma.campaign.findFirst({where:{id}});if(!campaign)fail(404,'Campanha não encontrada')
 if(action==='pause'||action==='cancel'){await prisma.campaign.updateMany({where:{id},data:{status:action==='pause'?'paused':'cancelled'}});return NextResponse.json({success:true})}
 if(action==='report'){const rows=await prisma.campaignRecipient.groupBy({by:['status'],where:{campaignId:id},_count:true});return NextResponse.json({rows})}
 if(action==='resume'&&campaign.status==='paused'){await prisma.campaign.updateMany({where:{id},data:{status:'scheduled'}});await prisma.job.updateMany({where:{type:'campaign',status:'paused',key:{startsWith:`campaign:${id}:`}},data:{status:'queued',runAt:new Date()}});return NextResponse.json({success:true})}
 if(action!=='launch'||campaign.status!=='draft')fail(409,'Campanha já agendada ou ação inválida')
 const channel=await prisma.channel.findFirst({where:{id:campaign.channelId}});if(!['whatsapp_official','email','sms'].includes(channel.type))fail(400,'Campanhas disponíveis para WhatsApp oficial, e-mail e SMS')
 if(channel.type==='whatsapp_official'&&!campaign.template)fail(400,'Informe um template aprovado')
 const contacts=await prisma.contact.findMany({where:{contactStatus:'active',...(campaign.tag?{tags:{has:campaign.tag}}:{})},take:10000});let count=0
 for(const contact of contacts){if(!consent(contact,channel.type))continue;const recipient=await prisma.campaignRecipient.create({data:{campaignId:id,contactId:contact.id}});await prisma.job.create({data:{key:`campaign:${id}:${recipient.id}`,type:'campaign',runAt:campaign.scheduledAt??new Date(),payload:{id:recipient.id}}});count++}
 if(!count)fail(400,'Nenhum contato com consentimento de marketing para este canal')
 await prisma.campaign.updateMany({where:{id},data:{status:'scheduled'}});return NextResponse.json({queued:count})
})}
