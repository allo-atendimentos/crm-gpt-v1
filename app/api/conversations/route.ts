import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { context } from '@/lib/context'
export async function GET(req:Request){return route(req,async()=>{
 const url=new URL(req.url),id=url.searchParams.get('id');if(id){const item=await prisma.conversation.findFirst({where:{id}});if(!item)fail(404,'Conversa não encontrada');return NextResponse.json({item,messages:await prisma.message.findMany({where:{conversationId:id},orderBy:{createdAt:'asc'},take:500})})}
 const items=await prisma.conversation.findMany({where:url.searchParams.get('status')?{status:url.searchParams.get('status')}:{},orderBy:{updatedAt:'desc'},take:100});const enriched=[]
 for(const item of items)enriched.push({...item,contact:await prisma.contact.findFirst({where:{id:item.contactId}}),channel:await prisma.channel.findFirst({where:{id:item.channelId},select:{id:true,name:true,type:true}})})
 return NextResponse.json({items:enriched})
})}
export async function POST(req:Request){return route(req,async()=>{const b=await req.json();const c=context.getStore();if(!b.channelId||!b.contactId)fail(400,'Escolha canal e contato');const old=await prisma.conversation.findFirst({where:{channelId:b.channelId,contactId:b.contactId}});if(old)return NextResponse.json(old);return NextResponse.json(await prisma.conversation.create({data:{channelId:b.channelId,contactId:b.contactId,subject:b.subject??'Atendimento',assignedToId:c.userId}}))})}
export async function PATCH(req:Request){return route(req,async()=>{const b=await req.json(),c=context.getStore();const old=await prisma.conversation.findFirst({where:{id:b.id}});if(!old)fail(404,'Conversa não encontrada');const data:any={};if(['open','pending','resolved'].includes(b.status)){data.status=b.status;data.resolvedAt=b.status==='resolved'?new Date():null}if(b.takeover){data.assignedToId=c.userId;data.botActive=false}if(typeof b.botActive==='boolean'&&['admin','manager','superadmin'].includes(c.role))data.botActive=b.botActive;if(b.assignedToId&&['admin','manager','superadmin'].includes(c.role))data.assignedToId=b.assignedToId;await prisma.conversation.updateMany({where:{id:b.id},data});return NextResponse.json({success:true})})}
