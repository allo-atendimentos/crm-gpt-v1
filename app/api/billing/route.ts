import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { context } from '@/lib/context'
import { prisma } from '@/lib/prisma'
import { asaas,prices } from '@/lib/billing'
export async function GET(req:Request){return route(req,async()=>{const c=context.getStore();return NextResponse.json({billing:await prisma.billing.findFirst(),invoices:await prisma.invoice.findMany({orderBy:{dueAt:'desc'},take:50}),tenant:await c.tx.tenant.findUnique({where:{id:c.tenantId},select:{name:true,trialEndsAt:true}}),users:await prisma.user.count({where:{status:'active'}}),channels:await prisma.channel.count(),configured:!!process.env.ASAAS_API_KEY})})}
export async function POST(req:Request){return route(req,async()=>{
 const c=context.getStore(),b=await req.json(),billing=await prisma.billing.findFirst();if(!billing)fail(400,'Assinatura não encontrada')
 if(b.action==='cancel'){if(billing.subscriptionId)await asaas('/subscriptions/'+billing.subscriptionId,undefined,'DELETE');if(billing.pendingSubscriptionId)await asaas('/subscriptions/'+billing.pendingSubscriptionId,undefined,'DELETE');await prisma.billing.updateMany({where:{id:billing.id},data:{status:'cancelled',pendingSubscriptionId:null,pendingPlan:null}});return NextResponse.json({success:true})}
 if(!prices[b.plan])fail(400,'Plano inválido')
 if(b.plan==='essential'&&(await prisma.user.count({where:{status:'active'}})>3||await prisma.channel.count()>2))fail(409,'Reduza para 3 usuários e 2 canais antes de mudar de plano')
 if(billing.pendingSubscriptionId&&billing.pendingPlan===b.plan&&billing.checkoutUrl)return NextResponse.json({url:billing.checkoutUrl})
 if(billing.pendingSubscriptionId)fail(409,'Existe uma cobrança pendente. Cancele antes de criar outra')
 let customerId=billing.customerId
 if(!customerId){if(!/^\d{11}$|^\d{14}$/.test(String(b.document??'').replace(/\D/g,'')))fail(400,'Informe CPF ou CNPJ do pagador');const tenant=await c.tx.tenant.findUnique({where:{id:c.tenantId}});const user=await c.tx.user.findUnique({where:{id:c.userId}});const customers=await asaas('/customers?externalReference='+encodeURIComponent(c.tenantId),undefined,'GET');const customer=customers.data?.[0]??await asaas('/customers',{name:tenant.name,email:user.email,cpfCnpj:String(b.document).replace(/\D/g,''),externalReference:c.tenantId});customerId=customer.id;await prisma.billing.updateMany({where:{id:billing.id},data:{customerId}})}
 const existing=await asaas('/subscriptions?customer='+encodeURIComponent(customerId!),undefined,'GET');
 const subscription=existing.data?.find((s:any)=>s.externalReference===c.tenantId+':'+b.plan&&s.status==='ACTIVE')??await asaas('/subscriptions',{customer:customerId,billingType:'UNDEFINED',cycle:'MONTHLY',value:prices[b.plan],nextDueDate:new Date().toISOString().slice(0,10),description:'Boss CRM — '+(b.plan==='essential'?'Essencial':'Ilimitado'),externalReference:c.tenantId+':'+b.plan})
 const payments=await asaas('/subscriptions/'+subscription.id+'/payments',undefined,'GET');const url=payments.data?.[0]?.invoiceUrl??null
 await prisma.billing.updateMany({where:{id:billing.id},data:{pendingSubscriptionId:subscription.id,pendingPlan:b.plan,checkoutUrl:url}})
 return NextResponse.json({url,message:url?undefined:'Assinatura criada. A fatura aparecerá após processamento do provedor.'})
})}
