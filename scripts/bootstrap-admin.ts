import {db} from '../lib/prisma'
async function main(){
 const email=process.argv[2]?.trim().toLowerCase()
 if(!email)throw Error('Uso: tsx scripts/bootstrap-admin.ts email-do-operador')
 const user=await db.user.findUnique({where:{email}})
 if(!user)throw Error('Cadastre primeiro a conta pela interface.')
 await db.$transaction(async tx=>{
  await tx.user.update({where:{id:user.id},data:{role:'superadmin'}})
  await tx.auditLog.create({data:{tenantId:user.tenantId,userId:user.id,action:'platform.bootstrap',resourceType:'user',resourceId:user.id}})
 })
 console.log('Operador global configurado. Entre novamente na aplicação.')
 await db.$disconnect()
}
main().catch(async e=>{console.error(e.message);await db.$disconnect();process.exitCode=1})
