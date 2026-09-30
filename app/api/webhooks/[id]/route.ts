import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'
import { unseal,equal } from '@/lib/crypto'
import { createHmac } from 'node:crypto'
import { inbound } from '@/lib/inbound'
export async function GET(req:Request,{params}:any){const {id}=await params,c=await db.channel.findUnique({where:{id}}),q=new URL(req.url).searchParams;if(!c||!equal(q.get('hub.verify_token')??'',c.webhookSecret))return new Response('Forbidden',{status:403});return new Response(q.get('hub.challenge'))}
export async function POST(req:Request,{params}:any){
 const {id}=await params,channel=await db.channel.findUnique({where:{id}});if(!channel)return new Response('Not found',{status:404})
 try{
 const raw=await req.text();if(raw.length>2000000)return new Response('Too large',{status:413});const c=unseal(channel.credentials)
 if(channel.provider==='meta'){
  const sig='sha256='+createHmac('sha256',c.appSecret??'').update(raw).digest('hex');if(!c.appSecret||!equal(sig,req.headers.get('x-hub-signature-256')??''))return new Response('Forbidden',{status:403})
  const body=JSON.parse(raw)
  for(const entry of body.entry??[])for(const change of entry.changes??[]){const v=change.value??{};if(v.metadata?.phone_number_id&&String(v.metadata.phone_number_id)!==channel.externalId)continue
   for(const status of v.statuses??[]){if(!['sent','delivered','read','failed'].includes(status.status))continue;const ext=id+':'+status.id;await db.message.updateMany({where:{tenantId:channel.tenantId,externalId:ext,status:{not:'read'}},data:{status:status.status}});await db.campaignRecipient.updateMany({where:{tenantId:channel.tenantId,externalId:ext,status:{not:'read'}},data:{status:status.status}})}
   for(const m of v.messages??[])await inbound(channel,m.id,m.from,v.contacts?.[0]?.profile?.name??m.from,m.text?.body??m.button?.text??`[${m.type}]`)
  }
  for(const entry of body.entry??[]){if(String(entry.id)!==channel.externalId)continue;for(const e of entry.messaging??[])if(e.message&&!e.message.is_echo)await inbound(channel,e.message.mid,String(e.sender.id),'',e.message.text??'[anexo]')}
 }else if(channel.provider==='telegram'){
  if(!equal(req.headers.get('x-telegram-bot-api-secret-token')??'',channel.webhookSecret))return new Response('Forbidden',{status:403})
  const b=JSON.parse(raw),m=b.message;if(m)await inbound(channel,String(m.message_id),String(m.chat.id),m.from?.first_name??'',m.text??'[anexo]')
 }else if(channel.provider==='evolution'){
  if(!equal(new URL(req.url).searchParams.get('token')??'',channel.webhookSecret))return new Response('Forbidden',{status:403})
  const b=JSON.parse(raw);if(b.instance!==channel.externalId)return new Response('Wrong instance',{status:403});const d=b.data;if(d?.key&&!d.key.fromMe)await inbound(channel,d.key.id,d.key.remoteJid.split('@')[0],d.pushName??'',d.message?.conversation??d.message?.extendedTextMessage?.text??'[anexo]')
 }else if(channel.provider==='twilio'){
  const data=new URLSearchParams(raw);let signed=`${process.env.APP_URL}/api/webhooks/${id}`;for(const key of [...data.keys()].sort())signed+=key+data.get(key)
  if(!equal(createHmac('sha1',c.token).update(signed).digest('base64'),req.headers.get('x-twilio-signature')??''))return new Response('Forbidden',{status:403})
  if(data.get('Body'))await inbound(channel,data.get('MessageSid')!,data.get('From')!,'',data.get('Body')!)
  else if(data.get('MessageStatus'))await db.message.updateMany({where:{tenantId:channel.tenantId,externalId:id+':'+data.get('MessageSid')},data:{status:data.get('MessageStatus')!}})
 }else if(channel.provider==='resend'){
  const stamp=req.headers.get('svix-timestamp')??'',eventId=req.headers.get('svix-id')??'';if(Math.abs(Date.now()/1000-Number(stamp))>300||!c.webhookKey)return new Response('Forbidden',{status:403})
  const expected=createHmac('sha256',Buffer.from(c.webhookKey.replace(/^whsec_/,''),'base64')).update(eventId+'.'+stamp+'.'+raw).digest('base64');if(!(req.headers.get('svix-signature')??'').split(' ').some(s=>equal(s,'v1,'+expected)))return new Response('Forbidden',{status:403})
  const b=JSON.parse(raw)
  if(b.type==='email.received'){const res=await fetch('https://api.resend.com/emails/receiving/'+encodeURIComponent(b.data.email_id),{headers:{Authorization:'Bearer '+c.token},signal:AbortSignal.timeout(10000)});if(!res.ok)throw Error('E-mail indisponível');const email=await res.json();await inbound(channel,b.data.email_id,email.from,'',email.text??'[E-mail sem texto]')}
  else {const status:any={'email.delivered':'delivered','email.bounced':'failed','email.complained':'failed','email.opened':'read'};if(status[b.type])await db.campaignRecipient.updateMany({where:{tenantId:channel.tenantId,externalId:id+':'+b.data.email_id},data:{status:status[b.type]}})}
 }else return new Response('Unsupported',{status:400})
 return NextResponse.json({received:true})
 }catch{return NextResponse.json({error:'Falha ao processar evento'},{status:500})}
}
