import {NextResponse} from 'next/server'
import {route,fail} from '@/lib/security'
import {prisma} from '@/lib/prisma'
export async function PUT(req:Request,{params}:any){return route(req,async()=>{const {entity,id}=await params,m:any={contacts:'contact',companies:'company',deals:'deal',products:'product'};if(!m[entity])fail(404,'Tipo inválido');const b=await req.json();if(!b.values||typeof b.values!=='object'||JSON.stringify(b.values).length>20000)fail(400,'Campos inválidos');await prisma[m[entity]].updateMany({where:{id},data:{customFields:b.values}});return NextResponse.json({success:true})})}
