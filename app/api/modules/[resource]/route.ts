import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { context } from '@/lib/context'
import { schemas,models,proposalTotal,validateFlow } from '@/lib/modules'
import { seal,hash } from '@/lib/crypto'
import { randomBytes } from 'node:crypto'
export async function GET(req:Request,{params}:any){return route(req,async()=>{
 const {resource}=await params,m=models[resource];if(!m)fail(404,'Módulo inexistente')
 const c=context.getStore();if(['channels','audit','api-keys','webhook-endpoints'].includes(resource)&&!['admin','manager','superadmin'].includes(c.role))fail(403,'Sem permissão')
 const q=new URL(req.url).searchParams;const page=Math.max(1,Number(q.get('page'))||1);const where:any={};const search=q.get('q');if(search)where[resource==='knowledge'||resource==='proposals'?'title':'name']={contains:search,mode:'insensitive'}
 const items=await prisma[m].findMany({where,orderBy:{[resource==='audit'?'createdAt':'id']:'desc'},take:100,skip:(page-1)*100})
 return NextResponse.json({items:items.map((x:any)=>{const {credentials,hash:secretHash,secret,...safe}=x;return {...safe,...(resource==='channels'?{configured:!!credentials,webhookUrl:`${process.env.APP_URL}/api/webhooks/${x.id}`}:{})}}),total:await prisma[m].count({where})})
})}
export async function POST(req:Request,{params}:any){return route(req,async()=>{
 const {resource}=await params,m=models[resource],schema=schemas[resource];if(!m||!schema)fail(404,'Módulo inexistente')
 const c=context.getStore();if(['channels','automations','agents','api-keys','webhook-endpoints'].includes(resource)&&!['admin','manager','superadmin'].includes(c.role))fail(403,'Sem permissão')
 const parsed=schema.safeParse(await req.json());if(!parsed.success)fail(400,parsed.error.issues.map((x:any)=>x.path.join('.')+': '+x.message).join('; '))
 const data:any=parsed.data;let once:any={}
 if(resource==='channels'){
  const bill=await prisma.billing.findFirst();if(bill?.plan!=='unlimited'&&await prisma.channel.count()>=2)fail(409,'O Essencial permite 2 conexões')
  data.provider={whatsapp_official:'meta',whatsapp_session:'evolution',instagram:'meta',messenger:'meta',telegram:'telegram',email:'resend',sms:'twilio',webchat:'internal'}[data.type as string]
  data.webhookSecret=randomBytes(24).toString('hex');data.credentials=seal(data.credentials);once.webhookSecret=data.webhookSecret
 }
 if(resource==='proposals'){for(const item of data.items)if(!await prisma.product.findFirst({where:{id:item.productId}}))fail(400,'Produto não encontrado');data.total=proposalTotal(data.items)}
 if(resource==='automations')validateFlow(data.definition)
 if(resource==='api-keys'){once.token='boss_'+randomBytes(32).toString('hex');data.hash=hash(once.token)}
 if(resource==='webhook-endpoints'){data.secret=randomBytes(32).toString('hex');once.secret=data.secret}
 const item=await prisma[m].create({data});const {credentials,hash:secretHash,secret,...safe}=item
 return NextResponse.json({...safe,...once},{status:201})
})}
