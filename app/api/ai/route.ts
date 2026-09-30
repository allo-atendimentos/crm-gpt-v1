import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db,prisma } from '@/lib/prisma'
import { route,fail } from '@/lib/security'
import { context } from '@/lib/context'
import { seal } from '@/lib/crypto'
import { askAI } from '@/lib/ai'
export async function PUT(req:Request){return route(req,async()=>{const c=context.getStore();if(!['admin','superadmin'].includes(c.role))fail(403,'Somente administrador');const b=await req.json();if(!b.key||b.key.length<20)fail(400,'Chave inválida');const credentials=seal({key:b.key,model:b.model??'gpt-4.1-mini',monthlyLimit:Math.min(100000,Math.max(1,Number(b.monthlyLimit)||1000))});await c.tx.integration.upsert({where:{tenantId_provider:{tenantId:c.tenantId,provider:'openai'}},create:{tenantId:c.tenantId,provider:'openai',credentials},update:{credentials}});return NextResponse.json({success:true})})}
export async function POST(req:Request){
 let payload:any
 const result=await route(req,async()=>{const c=context.getStore(),b=await req.json();if(typeof b.prompt!=='string'||!b.prompt.trim())fail(400,'Informe a pergunta');let prompt=b.prompt
 if(b.conversationId){const conv=await prisma.conversation.findFirst({where:{id:b.conversationId}});if(!conv)fail(404,'Conversa não encontrada');const msgs=await prisma.message.findMany({where:{conversationId:conv.id},take:30,orderBy:{createdAt:'desc'}});prompt+='\nCONVERSA:\n'+msgs.reverse().map((m:any)=>`${m.direction}: ${m.content}`).join('\n')}
 const totals=await prisma.deal.groupBy({by:['dealStatus'],_sum:{value:true},_count:true});prompt+='\nDADOS COMERCIAIS REAIS:\n'+JSON.stringify(totals);payload={tenantId:c.tenantId,prompt};return null})
 if(result)return result;try{return NextResponse.json(await askAI(payload.tenantId,payload.prompt))}catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}
