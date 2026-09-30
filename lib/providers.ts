import { unseal } from './crypto'
export async function request(url:string,body:any,headers:any={},method='POST'){
 const res=await fetch(url,{method,headers:{'Content-Type':'application/json',...headers},body:method==='GET'?undefined:JSON.stringify(body),signal:AbortSignal.timeout(18000),redirect:'error'})
 const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(`Provedor recusou a operação (${res.status})`);return data
}
export async function send(channel:any,contact:any,content:string,options:any={}){
 const c=unseal(channel.credentials),id=encodeURIComponent(channel.externalId??'')
 if(channel.type==='webchat')return {id:crypto.randomUUID()}
 if(channel.type==='telegram'){const chat=(contact.socialProfiles as any)?.telegram;if(!chat)throw Error('Contato sem chat Telegram');const r=await request(`https://api.telegram.org/bot${c.token}/sendMessage`,{chat_id:chat,text:content});if(!r.ok)throw Error('Telegram recusou a mensagem');return {id:String(chat)+':'+String(r.result.message_id)}}
 if(['whatsapp_official','instagram','messenger'].includes(channel.type)){
  if(!c.token||!channel.externalId)throw Error('Configure token e identificação da conta Meta')
  const base=`https://graph.facebook.com/${process.env.META_API_VERSION??'v25.0'}/${id}/messages`
  let body:any
  if(channel.type==='whatsapp_official')body={messaging_product:'whatsapp',to:contact.phone,type:options.template?'template':'text',...(options.template?{template:{name:options.template,language:{code:c.language??'pt_BR'}}}:{text:{body:content}})}
  else {const recipient=contact.socialProfiles?.[channel.type];if(!recipient)throw Error('Contato sem identificador do canal');body={recipient:{id:recipient},message:{text:content}}}
  const r=await request(base,body,{Authorization:`Bearer ${c.token}`});return {id:r.messages?.[0]?.id??r.message_id}
 }
 if(channel.type==='whatsapp_session'){
  const allowed=(process.env.EVOLUTION_ALLOWED_ORIGINS??'').split(',');if(!allowed.includes(new URL(c.url).origin))throw Error('Servidor Evolution não autorizado na configuração da plataforma')
  const r=await request(`${c.url.replace(/\/$/,'')}/message/sendText/${id}`,{number:contact.phone,text:content},{apikey:c.token});return {id:r.key?.id}
 }
 if(channel.type==='email'){
  if(!contact.email)throw Error('Contato sem e-mail');const r=await request('https://api.resend.com/emails',{from:c.from,to:[contact.email],subject:options.subject??'Atendimento Boss',text:content},{Authorization:`Bearer ${c.token}`,'Idempotency-Key':options.key??crypto.randomUUID()});return {id:r.id}
 }
 if(channel.type==='sms'){
  if(!contact.phone)throw Error('Contato sem telefone');const data=new URLSearchParams({To:'+'+contact.phone.replace(/\D/g,''),From:c.from,Body:content,...(options.callback?{StatusCallback:options.callback}:{})})
  const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.accountSid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(c.accountSid+':'+c.token).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:data,signal:AbortSignal.timeout(18000)})
  if(!res.ok)throw Error('Twilio recusou a mensagem');return {id:(await res.json()).sid}
 }
 throw Error('Canal não suportado')
}
export function consent(contact:any,type:string){return Array.isArray(contact.consents)&&contact.consents.some((c:any)=>c.channel===type&&c.purpose==='marketing'&&c.granted===true&&!c.optedOutAt)}
