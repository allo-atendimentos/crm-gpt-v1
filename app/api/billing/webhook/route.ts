import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { equal } from '@/lib/crypto'
import { asaas,prices } from '@/lib/billing'
export async function POST(req:Request){
 if(!process.env.ASAAS_WEBHOOK_TOKEN||!equal(req.headers.get('asaas-access-token')??'',process.env.ASAAS_WEBHOOK_TOKEN))return new Response('Forbidden',{status:403})
 try{
  const b=await req.json();if(!b.id||!b.payment?.id)return NextResponse.json({received:true})
  const payment=await asaas('/payments/'+encodeURIComponent(b.payment.id),undefined,'GET')
  const prior=payment.subscription?await db.billing.findFirst({where:{pendingSubscriptionId:payment.subscription}}):null
  if(prior?.subscriptionId&&prior.subscriptionId!==payment.subscription&&['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(payment.status)){
   try{await asaas('/subscriptions/'+prior.subscriptionId,undefined,'DELETE')}catch{const old=await asaas('/subscriptions/'+prior.subscriptionId,undefined,'GET');if(old.status!=='INACTIVE'&&!old.deleted)throw Error('Não foi possível cancelar assinatura anterior')}
  }
  await db.$transaction(async tx=>{
   if(await tx.webhookEvent.findUnique({where:{id:b.id}}))return
   const billing=await tx.billing.findFirst({where:{OR:[{subscriptionId:payment.subscription},{pendingSubscriptionId:payment.subscription}]}});if(!billing)return
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${billing.tenantId}))`
   const pending=billing.pendingSubscriptionId===payment.subscription;const plan=pending?billing.pendingPlan!:billing.plan
   if(payment.customer!==billing.customerId||Number(payment.value)!==prices[plan])throw Error('Dados de pagamento divergentes')
   await tx.invoice.upsert({where:{id:payment.id},create:{id:payment.id,tenantId:billing.tenantId,amount:payment.value,status:payment.status,url:payment.invoiceUrl,dueAt:new Date(payment.dueDate)},update:{status:payment.status,url:payment.invoiceUrl}})
   if(['RECEIVED','CONFIRMED','RECEIVED_IN_CASH'].includes(payment.status)){
    const until=new Date(payment.dueDate);until.setUTCMonth(until.getUTCMonth()+1)
    await tx.billing.update({where:{id:billing.id},data:{status:'active',plan,subscriptionId:payment.subscription,paidUntil:billing.paidUntil&&billing.paidUntil>until?billing.paidUntil:until,...(pending?{pendingSubscriptionId:null,pendingPlan:null}:{})}})
    await tx.tenant.update({where:{id:billing.tenantId},data:{status:'active'}})
   }else if(['REFUNDED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE'].includes(payment.status))await tx.billing.update({where:{id:billing.id},data:{status:'review'}})
   else if(payment.status==='OVERDUE'&&!pending&&(!billing.paidUntil||billing.paidUntil<new Date()))await tx.billing.update({where:{id:billing.id},data:{status:'past_due'}})
   await tx.webhookEvent.create({data:{id:b.id,provider:'asaas'}})
  })
  return NextResponse.json({received:true})
 }catch{return NextResponse.json({error:'Evento não processado'},{status:500})}
}
