import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { context } from '@/lib/context'
import { schemas,models,proposalTotal,validateFlow } from '@/lib/modules'
import { seal } from '@/lib/crypto'
export async function PUT(req:Request,{params}:any){return route(req,async()=>{
 const {resource,id}=await params,m=models[resource];if(!m||!schemas[resource])fail(404,'Módulo inexistente')
 if(['channels','automations','agents','api-keys','webhook-endpoints'].includes(resource)&&!['admin','manager','superadmin'].includes(context.getStore().role))fail(403,'Sem permissão')
 const old=await prisma[m].findFirst({where:{id}});if(!old)fail(404,'Registro não encontrado')
 if(resource==='campaigns'&&old.status!=='draft')fail(409,'Somente rascunhos podem ser editados')
 if(resource==='proposals'&&old.status==='accepted')fail(409,'Proposta aceita é imutável')
 const parsed=schemas[resource].partial().safeParse(await req.json());if(!parsed.success)fail(400,'Campos inválidos')
 const data:any=parsed.data
 if(resource==='channels'){delete data.type;if(data.credentials&&Object.keys(data.credentials).length)data.credentials=seal(data.credentials);else delete data.credentials}
 if(resource==='proposals'&&data.items){for(const item of data.items)if(!await prisma.product.findFirst({where:{id:item.productId}}))fail(400,'Produto inválido');data.total=proposalTotal(data.items)}
 if(resource==='automations'){validateFlow(data.definition??old.definition);data.version={increment:1}}
 await prisma[m].updateMany({where:{id},data});return NextResponse.json({success:true})
})}
export async function DELETE(req:Request,{params}:any){return route(req,async()=>{
 const {resource,id}=await params,m=models[resource];if(!m||!schemas[resource])fail(404,'Módulo inexistente')
 if(!['admin','manager','superadmin'].includes(context.getStore().role))fail(403,'Somente gestores podem excluir')
 if(['campaigns','proposals'].includes(resource)){const old=await prisma[m].findFirst({where:{id}});if(old?.status!=='draft')fail(409,'Somente rascunhos podem ser excluídos')}
 await prisma[m].deleteMany({where:{id}});return NextResponse.json({success:true})
})}
