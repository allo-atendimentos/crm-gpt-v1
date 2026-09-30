import {test,after} from 'node:test'
import assert from 'node:assert/strict'
import {db,prisma} from '../lib/prisma'
import {context} from '../lib/context'
import {proposalTotal,validateFlow} from '../lib/modules'
import {seal,unseal,equal} from '../lib/crypto'
import {consent} from '../lib/providers'
const rollback=new Error('rollback-test')
async function scenario(fn:(tx:any,a:any,b:any,user:any)=>Promise<void>){try{await db.$transaction(async tx=>{const a=await tx.tenant.create({data:{name:'QA A',slug:crypto.randomUUID(),trialEndsAt:new Date(Date.now()+86400000)}}),b=await tx.tenant.create({data:{name:'QA B',slug:crypto.randomUUID(),trialEndsAt:new Date(Date.now()+86400000)}});const user=await tx.user.create({data:{tenantId:a.id,email:crypto.randomUUID()+'@example.test',password:'not-login',fullName:'QA',role:'admin'}});await context.run({tx,tenantId:a.id,userId:user.id,role:'admin'},()=>fn(tx,a,b,user));throw rollback},{timeout:20000})}catch(e){if(e!==rollback)throw e}}
test('Decimal: desconto por item, quantidade e arredondamento',()=>{assert.equal(proposalTotal([{price:'0.10',quantity:3,discount:0},{price:'100.00',quantity:2,discount:12.5}]),'175.30')})
test('Criptografia autenticada e rejeição de adulteração',()=>{const value=seal({token:'private'});assert.deepEqual(unseal(value),{token:'private'});assert.throws(()=>unseal(value.slice(0,-5)+'aaaaa'));assert.equal(equal('a','bb'),false)})
test('Consentimento explícito por canal e revogação',()=>{assert.equal(consent({consents:[]},'email'),false);assert.equal(consent({consents:[{channel:'email',purpose:'marketing',granted:true}]},'email'),true);assert.equal(consent({consents:[{channel:'email',purpose:'marketing',granted:true,optedOutAt:'2026-01-01'}]},'email'),false)})
test('Automação rejeita ciclo e gatilhos duplicados',()=>{assert.throws(()=>validateFlow({nodes:[{id:'a',data:{kind:'trigger'}}],edges:[{source:'a',target:'a'}]}));assert.throws(()=>validateFlow({nodes:[{id:'a',data:{kind:'trigger'}},{id:'b',data:{kind:'trigger'}}],edges:[]}));validateFlow({nodes:[{id:'a',data:{kind:'trigger'}},{id:'b',data:{kind:'task'}}],edges:[{source:'a',target:'b'}]})})
test('Isolamento de leitura e alteração por empresa',()=>scenario(async(tx,a,b)=>{const hidden=await tx.contact.create({data:{tenantId:b.id,fullName:'Segredo B'}});assert.equal(await prisma.contact.findFirst({where:{id:hidden.id}}),null);assert.equal(await prisma.contact.count({where:{tenantId:b.id}}),0);await assert.rejects(()=>prisma.contact.updateMany({where:{id:hidden.id},data:{fullName:'Alterado'}}));assert.equal((await tx.contact.findUnique({where:{id:hidden.id}})).fullName,'Segredo B')}))
test('Relações entre empresas são bloqueadas na aplicação',()=>scenario(async(tx,a,b)=>{const company=await tx.company.create({data:{tenantId:b.id,name:'B'}});await assert.rejects(()=>prisma.contact.create({data:{fullName:'A',companyId:company.id}}),/empresa/)}))
test('Banco bloqueia vínculo entre empresas mesmo sem filtro da aplicação',async()=>{await assert.rejects(()=>scenario(async(tx,a,b)=>{const company=await tx.company.create({data:{tenantId:b.id,name:'B'}});await tx.contact.create({data:{tenantId:a.id,fullName:'A',companyId:company.id}})}))})
test('Escalada de papel global por convite é bloqueada',()=>scenario(async()=>{await assert.rejects(()=>prisma.userInvitation.create({data:{email:'nobody@example.test',role:'superadmin',expiresAt:new Date()}}),/Papel/)}))
test('Analista não pode gravar',()=>scenario(async(tx,a,b,user)=>{await context.run({tx,tenantId:a.id,userId:user.id,role:'analyst'},async()=>{await assert.rejects(()=>prisma.contact.create({data:{fullName:'Blocked'}}),/leitura/)})}))
test('Vendedor enxerga somente sua carteira',()=>scenario(async(tx,a,b,user)=>{await tx.contact.create({data:{tenantId:a.id,fullName:'Outro',responsibleUserId:null}});await tx.contact.create({data:{tenantId:a.id,fullName:'Meu',responsibleUserId:user.id}});await context.run({tx,tenantId:a.id,userId:user.id,role:'agent'},async()=>{const contacts=await prisma.contact.findMany();assert.equal(contacts.length,1);assert.equal(contacts[0].fullName,'Meu')})}))
test('Negócio exige etapa do funil e limpa fechamento ao reabrir',()=>scenario(async(tx,a)=>{const p=await tx.pipeline.create({data:{tenantId:a.id,name:'Funil'}}),p2=await tx.pipeline.create({data:{tenantId:a.id,name:'Outro'}});const s=await tx.stage.create({data:{tenantId:a.id,pipelineId:p.id,name:'Ganho',position:0,isWon:true}});await assert.rejects(()=>prisma.deal.create({data:{title:'Sem etapa',pipelineId:p.id}}),/exige funil e etapa/);await assert.rejects(()=>prisma.deal.create({data:{title:'X',pipelineId:p2.id,stageId:s.id}}),/funil/);const d=await prisma.deal.create({data:{title:'OK',pipelineId:p.id,stageId:s.id}});assert.equal(d.dealStatus,'won');assert.ok(d.closedAt);await assert.rejects(()=>prisma.deal.updateMany({where:{id:d.id},data:{pipelineId:null}}),/exige funil e etapa/);await prisma.deal.updateMany({where:{id:d.id},data:{dealStatus:'open'}});assert.equal((await prisma.deal.findFirst({where:{id:d.id}})).closedAt,null)}))
test('Escrita gera auditoria e evento na mesma transação',()=>scenario(async(tx,a)=>{const c=await prisma.contact.create({data:{fullName:'Audit'}});assert.equal(await tx.auditLog.count({where:{tenantId:a.id,resourceId:c.id}}),1);assert.equal(await tx.job.count({where:{tenantId:a.id,type:'event'}}),1)}))
test('Relações aninhadas e contagens respeitam a carteira do vendedor',()=>scenario(async(tx,a,b,user)=>{
 const company=await tx.company.create({data:{tenantId:a.id,name:'Empresa de outro vendedor'}})
 const contact=await tx.contact.create({data:{tenantId:a.id,fullName:'Meu contato',responsibleUserId:user.id,companyId:company.id}})
 const pipeline=await tx.pipeline.create({data:{tenantId:a.id,name:'P'}})
 const stage=await tx.stage.create({data:{tenantId:a.id,pipelineId:pipeline.id,name:'S',position:0}})
 await tx.deal.create({data:{tenantId:a.id,title:'Negócio reservado',pipelineId:pipeline.id,stageId:stage.id,contactId:contact.id}})
 await context.run({tx,tenantId:a.id,userId:user.id,role:'agent'},async()=>{
  const row=await prisma.contact.findFirst({where:{id:contact.id},include:{company:{select:{name:true}},deals:true,_count:{select:{deals:true}}}})
  assert.equal(row.company,null);assert.deepEqual(row.deals,[]);assert.equal(row._count.deals,0)
  await assert.rejects(()=>prisma.contact.updateMany({where:{id:contact.id},data:{companyId:company.id}}),/empresa/)
 })
}))
test('Propostas acompanham a permissão do negócio vinculado',()=>scenario(async(tx,a,b,user)=>{
 const p=await tx.pipeline.create({data:{tenantId:a.id,name:'P'}}),s=await tx.stage.create({data:{tenantId:a.id,pipelineId:p.id,name:'S',position:0}})
 const deal=await tx.deal.create({data:{tenantId:a.id,title:'Reservado',pipelineId:p.id,stageId:s.id}})
 await tx.proposal.create({data:{tenantId:a.id,dealId:deal.id,title:'Proposta reservada'}})
 await context.run({tx,tenantId:a.id,userId:user.id,role:'agent'},async()=>{assert.equal(await prisma.proposal.count(),0)})
}))
after(async()=>{await db.$disconnect()})
