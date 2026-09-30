import {NextResponse} from 'next/server'
import {route,fail} from '@/lib/security'
import {context} from '@/lib/context'
import {prisma} from '@/lib/prisma'
export async function GET(req:Request){return route(req,async()=>{const c=context.getStore();return NextResponse.json({settings:(await c.tx.tenant.findUnique({where:{id:c.tenantId}})).settings})})}
export async function POST(req:Request){return route(req,async()=>{
 const c=context.getStore(),b=await req.json();if(!['admin','superadmin'].includes(c.role))fail(403,'Somente administradores')
 if(b.type==='user'){
  if(!['admin','manager','supervisor','agent','analyst','financial','guest'].includes(b.role)||!['active','inactive'].includes(b.status))fail(400,'Perfil inválido')
  const u=await prisma.user.findFirst({where:{id:b.id}});if(!u)fail(404,'Usuário não encontrado');if(u.id===c.userId&&(b.role!=='admin'||b.status!=='active'))fail(400,'Não altere seu próprio acesso nesta tela')
  if(u.role==='superadmin')fail(403,'Conta global protegida');const bill=await prisma.billing.findFirst();if(b.status==='active'&&u.status!=='active'&&bill?.plan!=='unlimited'&&await prisma.user.count({where:{status:'active'}})>=3)fail(409,'Limite do plano atingido')
  await prisma.user.updateMany({where:{id:b.id},data:{role:b.role,status:b.status}})
 }else if(b.type==='team'){
  if(!b.name)fail(400,'Nome obrigatório');const team=await prisma.team.create({data:{name:String(b.name).slice(0,100),supervisorId:b.supervisorId||null}})
  for(const id of b.members??[]){if(!await prisma.user.findFirst({where:{id}}))fail(400,'Membro inválido');await c.tx.teamMember.create({data:{teamId:team.id,userId:id}})}
 }else if(b.type==='stage'){
  if(!b.name||!Number.isFinite(Number(b.probability))||b.probability<0||b.probability>100)fail(400,'Dados inválidos')
  await prisma.stage.updateMany({where:{id:b.id},data:{name:b.name,probability:Number(b.probability),isWon:b.outcome==='won',isLost:b.outcome==='lost',position:Math.max(0,Number(b.position)||0)}})
 }else if(b.type==='fields'){
  const fields=b.fields;if(!Array.isArray(fields)||fields.length>50||fields.some((x:any)=>!['contacts','companies','deals','products'].includes(x.entity)||!['text','number','date'].includes(x.type)||!/^\w{1,50}$/.test(x.key)||!x.label))fail(400,'Definições de campos inválidas')
  const tenant=await c.tx.tenant.findUnique({where:{id:c.tenantId}});await c.tx.tenant.update({where:{id:c.tenantId},data:{settings:{...tenant.settings,customFields:fields}}});await c.tx.auditLog.create({data:{tenantId:c.tenantId,userId:c.userId,action:'settings.fields',resourceType:'tenant'}})
 }else fail(400,'Operação inválida')
 return NextResponse.json({success:true})
})}
