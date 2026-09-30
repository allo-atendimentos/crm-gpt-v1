import {db} from '@/lib/prisma'
import {seal,unseal} from '@/lib/crypto'
import {NextResponse} from 'next/server'
import {inbound} from '@/lib/inbound'
import {limit} from '@/lib/security'
export async function POST(req:Request,{params}:any){try{const {id}=await params,ch=await db.channel.findFirst({where:{id,type:'webchat'}});if(!ch)return new Response('Not found',{status:404});const b=await req.json();await limit('chat:'+id+':'+(req.headers.get('x-forwarded-for')??'local'),100);const c=unseal(ch.credentials)
 if(!b.token){const origin=new URL(b.origin).origin;if(!(c.origins??'').split(',').map((s:string)=>s.trim()).includes(origin))return NextResponse.json({error:'Site não autorizado para este chat'},{status:403});if(!b.name||String(b.name).length>150)return NextResponse.json({error:'Informe seu nome'},{status:400});const visitor=crypto.randomUUID();return NextResponse.json({token:seal({channel:id,visitor,name:b.name,expires:Date.now()+86400000})})}
 const token=unseal(b.token);if(token.channel!==id||token.expires<Date.now())throw Error('Sessão expirada')
 if(b.content){if(typeof b.content!=='string'||b.content.length>4000)throw Error('Mensagem inválida');await inbound(ch,crypto.randomUUID(),token.visitor,token.name,b.content)}
 const contact=await db.contact.findFirst({where:{tenantId:ch.tenantId,socialProfiles:{path:['webchat'],equals:token.visitor}}});const conv=contact?await db.conversation.findFirst({where:{tenantId:ch.tenantId,channelId:id,contactId:contact.id}}):null
 return NextResponse.json({messages:conv?await db.message.findMany({where:{tenantId:ch.tenantId,conversationId:conv.id,internal:false},select:{id:true,content:true,direction:true,createdAt:true},orderBy:{createdAt:'asc'},take:100}):[]})
 }catch{return NextResponse.json({error:'Sessão inválida ou limite atingido'},{status:400})}}
