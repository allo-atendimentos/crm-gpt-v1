import { z } from 'zod'
import { Prisma } from '@prisma/client'
const text=z.string().trim().min(1).max(500), id=z.string().uuid(), money=z.coerce.number().finite().min(0).max(1e10)
export const schemas:any={
 products:z.object({name:text,code:text,description:z.string().max(10000).default(''),price:money,cost:money.default(0),unit:text.default('un'),active:z.boolean().default(true),customFields:z.record(z.unknown()).default({})}),
 proposals:z.object({title:text,dealId:id,items:z.array(z.object({productId:id,name:text,quantity:z.coerce.number().positive().max(100000),price:money,discount:z.coerce.number().min(0).max(100).default(0)})).min(1).max(200),validUntil:z.coerce.date().optional()}),
 channels:z.object({name:text,type:z.enum(['whatsapp_official','whatsapp_session','instagram','messenger','telegram','email','sms','webchat']),externalId:z.string().max(200).optional(),credentials:z.record(z.string()).default({})}),
 campaigns:z.object({name:text,channelId:id,content:z.string().min(1).max(10000),template:z.string().max(200).optional(),tag:z.string().max(100).default(''),scheduledAt:z.coerce.date().optional()}),
 knowledge:z.object({title:text,content:z.string().min(1).max(100000)}),
 agents:z.object({name:text,instructions:z.string().min(1).max(10000),model:text.default('gpt-4.1-mini'),active:z.boolean().default(false),channelId:id.nullable().optional(),monthlyLimit:z.coerce.number().int().min(1).max(100000).default(100),allowedActions:z.array(z.enum(['create_task','handoff'])).default([])}),
 automations:z.object({name:text,trigger:z.enum(['contact.created','deal.created','deal.stage_changed','task.created','message.received']),active:z.boolean().default(false),definition:z.object({nodes:z.array(z.any()).max(100),edges:z.array(z.any()).max(150)})}),
 'webhook-endpoints':z.object({url:z.string().url().startsWith('https://'),active:z.boolean().default(true)}),
 'api-keys':z.object({name:text})
}
export const models:any={products:'product',proposals:'proposal',channels:'channel',campaigns:'campaign',knowledge:'knowledge',agents:'agent',automations:'automation',executions:'execution',usage:'usage',audit:'auditLog','api-keys':'apiKey','webhook-endpoints':'webhookEndpoint'}
export function proposalTotal(items:any[]){return items.reduce((s,x)=>s.add(new Prisma.Decimal(x.price).mul(x.quantity).mul(new Prisma.Decimal(100).sub(x.discount??0)).div(100).toDecimalPlaces(2)),new Prisma.Decimal(0)).toFixed(2)}
export function validateFlow(def:any){
 const nodes=def.nodes??[],edges=def.edges??[];const ids=new Set(nodes.map((n:any)=>n.id))
 if(nodes.length!==ids.size||nodes.filter((n:any)=>n.data?.kind==='trigger').length!==1)throw new Error('400:O fluxo precisa de um início e IDs únicos')
 for(const n of nodes)if(!['trigger','condition','task','stage','delay','handoff','message'].includes(n.data?.kind))throw new Error('400:Ação inválida')
 const visit=(id:string,path:Set<string>)=>{if(path.has(id))throw new Error('400:Ciclos não são permitidos');const next=new Set(path).add(id);for(const e of edges.filter((e:any)=>e.source===id)){if(!ids.has(e.target))throw new Error('400:Conexão inválida');visit(e.target,next)}}
 visit(nodes.find((n:any)=>n.data.kind==='trigger').id,new Set())
}
