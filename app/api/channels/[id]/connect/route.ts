import { NextResponse } from 'next/server'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { unseal } from '@/lib/crypto'
import { request } from '@/lib/providers'
export async function POST(req:Request,{params}:any){return route(req,async()=>{const {id}=await params,ch=await prisma.channel.findFirst({where:{id}});if(!ch)fail(404,'Canal não encontrado');const c=unseal(ch.credentials),url=`${process.env.APP_URL}/api/webhooks/${id}`
 if(ch.type==='telegram'){if(!process.env.APP_URL?.startsWith('https://'))fail(400,'Publique em HTTPS antes de registrar o webhook');const r=await request(`https://api.telegram.org/bot${c.token}/setWebhook`,{url,secret_token:ch.webhookSecret});if(!r.ok)fail(400,'Telegram recusou a conexão');return NextResponse.json({message:'Webhook Telegram registrado'})}
 if(ch.type==='whatsapp_session'){if(!(process.env.EVOLUTION_ALLOWED_ORIGINS??'').split(',').includes(new URL(c.url).origin))fail(400,'Autorize o domínio Evolution na configuração do servidor');const r=await request(`${c.url.replace(/\/$/,'')}/instance/connect/${encodeURIComponent(ch.externalId)}`,undefined,{apikey:c.token},'GET');return NextResponse.json({qr:r.base64??null,code:r.code??null,webhook:url+'?token='+ch.webhookSecret,message:'Sessão não oficial. Configure o webhook na instância Evolution.'})}
 if(ch.type==='webchat')return NextResponse.json({embed:`<script src="${process.env.APP_URL}/widget.js" data-channel="${id}"></script>`,message:'Adicione o domínio do seu site em Domínios permitidos.'})
 return NextResponse.json({webhook:url,verificationToken:ch.webhookSecret,message:'Cadastre esta URL no provedor. Meta exige appSecret para verificar assinaturas. A conexão só pode ser homologada após envio e recebimento real.'})
})}
