import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { route,fail } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { context } from '@/lib/context'
const fields:any={contacts:['fullName','email','phone','source','tags'],companies:['name','cnpj','industry','website'],products:['name','code','price','cost','unit'],deals:['title','value','contactEmail','pipeline','stage','source']}
const models:any={contacts:'contact',companies:'company',products:'product',deals:'deal'}
export async function GET(req:Request){return route(req,async()=>{const r=new URL(req.url).searchParams.get('resource')??'contacts';if(!models[r])fail(400,'Tipo inválido');const rows=await prisma[models[r]].findMany({take:10000});return new Response('\uFEFF'+stringify(rows.map((row:any)=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='string'&&/^[=+@\-]/.test(v)?"'"+v:v]))),{header:true,columns:fields[r]}),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${r}.csv"`}})})}
export async function POST(req:Request){return route(req,async()=>{
 const {csv,resource,mapping,preview}=await req.json();if(!models[resource]||typeof csv!=='string'||csv.length>5000000)fail(400,'CSV inválido (máximo 5 MB)')
 const rows:any[]=parse(csv,{columns:true,skip_empty_lines:true,bom:true,delimiter:csv.split('\n')[0].includes(';')?';':','});if(rows.length>5000)fail(400,'Máximo 5.000 linhas por arquivo')
 if(preview)return NextResponse.json({columns:Object.keys(rows[0]??{}),rows:rows.slice(0,5),count:rows.length,fields:fields[resource]})
 const errors:any[]=[],prepared:any[]=[];let skipped=0;const seen=new Set<string>()
 for(let i=0;i<rows.length;i++){
  try{
   const d:any={};for(const f of fields[resource])if(mapping[f])d[f]=String(rows[i][mapping[f]]??'').trim()
   const name=resource==='contacts'?'fullName':resource==='deals'?'title':'name';if(!d[name])throw Error('Nome/título obrigatório')
   if(d.email){d.email=d.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('E-mail inválido')}
   if(d.phone){d.phone=d.phone.replace(/\D/g,'');if(d.phone.length===10||d.phone.length===11)d.phone='55'+d.phone}
   if(d.tags)d.tags=d.tags.split('|').filter(Boolean)
   for(const f of ['value','price','cost'])if(d[f]!==undefined){d[f]=d[f].replace(',','.');if(!/^\d+(\.\d{1,2})?$/.test(d[f]))throw Error('Valor monetário inválido')}
   if(resource==='contacts'&&(d.email||d.phone)){const OR=[...(d.email?[{email:d.email}]:[]),...(d.phone?[{phone:d.phone}]:[])];if(await prisma.contact.findFirst({where:{OR}})){skipped++;continue}}
   if(resource==='products'&&!d.code)throw Error('Código obrigatório')
   if(resource==='products'&&await prisma.product.findFirst({where:{code:d.code}})){skipped++;continue}
   if(resource==='companies'&&d.cnpj&&await prisma.company.findFirst({where:{cnpj:d.cnpj}})){skipped++;continue}
   if(resource==='deals'){
    const pipeline=await prisma.pipeline.findFirst({where:d.pipeline?{name:d.pipeline}:{isDefault:true}});if(!pipeline)throw Error('Funil não encontrado')
    const stage=await prisma.stage.findFirst({where:{pipelineId:pipeline.id,...(d.stage?{name:d.stage}:{})},orderBy:{position:'asc'}});if(!stage)throw Error('Etapa não encontrada')
    d.pipelineId=pipeline.id;d.stageId=stage.id
    if(d.contactEmail){const contact=await prisma.contact.findFirst({where:{email:d.contactEmail.toLowerCase()}});if(!contact)throw Error('Contato não encontrado');d.contactId=contact.id}
    delete d.pipeline;delete d.stage;delete d.contactEmail
   }
   const key=resource==='contacts'?(d.email||d.phone):resource==='products'?d.code:resource==='companies'?d.cnpj:null
   if(key&&seen.has(key)){skipped++;continue}if(key)seen.add(key)
   prepared.push(d)
  }catch(e:any){errors.push({line:i+2,error:e.message})}
 }
 if(errors.length)return NextResponse.json({error:'Corrija o arquivo. Nenhum registro importado.',errors},{status:400})
 let created=0;for(const data of prepared){await prisma[models[resource]].create({data});created++}
 return NextResponse.json({created,skipped,errors:[]})
})}
