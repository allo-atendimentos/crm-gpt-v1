import {NextResponse} from 'next/server'
import {route} from '@/lib/security'
import {context} from '@/lib/context'
export async function GET(req:Request){return route(req,async()=>{const c=context.getStore(),t=await c.tx.tenant.findUnique({where:{id:c.tenantId}});return NextResponse.json({fields:t.settings?.customFields??[]})})}
