import assert from 'node:assert/strict'
import {db} from '../lib/prisma'
import {workOnce} from '../workers/run'
async function main(){
 const tenant=await db.tenant.create({data:{name:'QA Worker',slug:'qa-worker-'+crypto.randomUUID(),trialEndsAt:new Date(Date.now()+86400000)}})
 const contact=await db.contact.create({data:{tenantId:tenant.id,fullName:'QA Worker Contact'}})
 const flow=await db.automation.create({data:{tenantId:tenant.id,name:'QA Worker',trigger:'contact.created',active:true,definition:{nodes:[{id:'start',data:{kind:'trigger'}},{id:'task',data:{kind:'task',title:'QA Follow-up'}}],edges:[{source:'start',target:'task'}]}}})
 await db.job.create({data:{tenantId:tenant.id,type:'event',key:'qa:'+crypto.randomUUID(),payload:{event:'contact.created',record:JSON.parse(JSON.stringify(contact))}}})
 for(let i=0;i<300;i++){
  await workOnce()
  const taskReady=await db.task.count({where:{tenantId:tenant.id,title:'QA Follow-up',contactId:contact.id}})
  const executionReady=await db.execution.count({where:{automationId:flow.id,status:'completed'}})
  if(taskReady===1&&executionReady===1)break
  await new Promise(resolve=>setTimeout(resolve,20))
 }
 assert.equal(await db.task.count({where:{tenantId:tenant.id,title:'QA Follow-up',contactId:contact.id}}),1)
 assert.equal(await db.execution.count({where:{automationId:flow.id,status:'completed'}}),1)
 console.log('PASS evento -> fluxo -> tarefa persistida -> execução concluída')
 await db.$disconnect()
}
main().catch(async e=>{console.error(e);await db.$disconnect();process.exitCode=1})
