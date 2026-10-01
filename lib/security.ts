import { auth } from '@/auth'
import { db } from './prisma'
import { context } from './context'
import { NextResponse } from 'next/server'
export function fail(code:number,message:string):never { throw new Error(`${code}:${message}`) }

function parsedOrigin(value:string|null|undefined){
 try { return value?new URL(value):null } catch { return null }
}

function writeOriginAllowed(req:Request,origin:string|null){
 if(!origin)return true
 const requestOrigin=parsedOrigin(req.url)
 const appOrigin=parsedOrigin(process.env.APP_URL)
 if(origin===requestOrigin?.origin||origin===appOrigin?.origin)return true
 const source=parsedOrigin(origin)
 if(!source)return false
 const loopback=new Set(['localhost','127.0.0.1','[::1]'])
 const equivalentLoopback=[requestOrigin,appOrigin].some(target=>
  !!target&&loopback.has(source.hostname)&&loopback.has(target.hostname)&&source.protocol===target.protocol&&source.port===target.port
 )
 if(equivalentLoopback)return true
 if(process.env.NODE_ENV==='production')return false
 return false
}

export async function route(req:Request,fn:()=>Promise<any>){
 try {
  const session=await auth();if(!session?.user?.id)fail(401,'Entre na sua conta')
  const user=await db.user.findUnique({where:{id:session.user.id},include:{tenant:true}})
  if(!user||user.status!=='active'||!user.tenantId)fail(401,'Sessão revogada')
  const path=new URL(req.url).pathname
  if(user.tenant?.status==='suspended'&&!path.includes('/billing'))fail(403,'Empresa suspensa')
  if(/\/api\/(settings|channels|integrations|automations|api-keys|webhook-endpoints)/.test(path)&&!['admin','superadmin','manager'].includes(user.role))fail(403,'Sem permissão de gestão')
  if(path.startsWith('/api/admin')&&user.role!=='superadmin')fail(403,'Acesso restrito à plataforma')
  if(path.includes('/billing')&&!['admin','superadmin','financial'].includes(user.role))fail(403,'Sem acesso ao faturamento')
  if(user.role==='financial'&&!/billing|proposals|products|options/.test(path))fail(403,'Perfil financeiro')
  if(!['GET','HEAD'].includes(req.method)){
   const origin=req.headers.get('origin');if(!writeOriginAllowed(req,origin))fail(403,'Origem não autorizada')
   if(['analyst','guest'].includes(user.role))fail(403,'Perfil somente leitura')
   if(user.role==='financial'&&!/billing|proposals/.test(path))fail(403,'Perfil financeiro')
   if(!/billing/.test(path)){
    const billing=await db.billing.findUnique({where:{tenantId:user.tenantId}})
    if(!(['active','cancelled'].includes(billing?.status??'')&&billing?.paidUntil&&billing?.paidUntil>new Date())&&(!user.tenant?.trialEndsAt||user.tenant.trialEndsAt<new Date()))fail(402,'Assinatura necessária. Acesse Assinatura.')
   }
  }
  return await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.tenantId!}))`
   return context.run({tx,tenantId:user.tenantId,userId:user.id,role:user.role},fn)
  },{timeout:25000,maxWait:10000})
 }catch(e:any){ if(process.env.NODE_ENV!=='production')console.error('API diagnostic:',e.message); const m=/^(\d{3}):(.*)$/s.exec(e.message??'');return NextResponse.json({error:m?.[2]??'Não foi possível concluir a operação'},{status:m?+m[1]:400}) }
}
export async function limit(key:string,max=10){
 const id=key+':'+Math.floor(Date.now()/900000)
 const row=await db.rateLimit.upsert({where:{id},create:{id,count:1,expiresAt:new Date(Date.now()+900000)},update:{count:{increment:1}}})
 if(row.count>max)fail(429,'Muitas tentativas. Tente novamente mais tarde.')
}
