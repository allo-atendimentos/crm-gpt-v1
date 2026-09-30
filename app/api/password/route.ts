import {NextResponse} from 'next/server'
import {db} from '@/lib/prisma'
import {hash} from '@/lib/crypto'
import {randomBytes} from 'node:crypto'
import bcrypt from 'bcryptjs'
import {limit} from '@/lib/security'
import {request} from '@/lib/providers'
export async function POST(req:Request){try{const b=await req.json();await limit('password:'+String(b.email??b.token),5)
 if(b.token){if(typeof b.password!=='string'||b.password.length<10)return NextResponse.json({error:'Use pelo menos 10 caracteres'},{status:400});await db.$transaction(async tx=>{const token=await tx.passwordToken.findUnique({where:{hash:hash(b.token)}});if(!token||token.usedAt||token.expiresAt<new Date())throw Error('Link inválido');const used=await tx.passwordToken.updateMany({where:{id:token.id,usedAt:null},data:{usedAt:new Date()}});if(!used.count)throw Error('Link já utilizado');await tx.user.update({where:{id:token.userId},data:{password:await bcrypt.hash(b.password,12)}})});return NextResponse.json({success:true})}
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return NextResponse.json({error:'O administrador precisa configurar o envio de e-mail'},{status:503})
 const user=await db.user.findUnique({where:{email:String(b.email??'').trim().toLowerCase()}})
 if(user){const token=randomBytes(32).toString('hex');await db.passwordToken.create({data:{userId:user.id,hash:hash(token),expiresAt:new Date(Date.now()+3600000)}});await request('https://api.resend.com/emails',{from:process.env.MAIL_FROM,to:[user.email],subject:'Redefinir senha — Boss CRM',text:`Redefina sua senha em ${process.env.APP_URL}/reset-password?token=${token}\nEste link expira em uma hora.`},{Authorization:`Bearer ${process.env.RESEND_API_KEY}`})}
 return NextResponse.json({success:true,message:'Se a conta existir, você receberá o link.'})
 }catch{return NextResponse.json({error:'Não foi possível redefinir a senha. Verifique o link ou tente mais tarde.'},{status:400})}}
