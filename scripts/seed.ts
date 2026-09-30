import {db} from '../lib/prisma'
async function main(){for(const p of [{id:'essential',name:'Essencial',priceMonthly:299,maxUsers:3,maxChannels:2},{id:'unlimited',name:'Ilimitado',priceMonthly:599,maxUsers:-1,maxChannels:-1}])await db.plan.upsert({where:{id:p.id},create:{...p,maxContacts:-1,maxAutomations:-1},update:p});console.log('Planos comerciais configurados');await db.$disconnect()}
main().catch(e=>{console.error(e.message);process.exit(1)})
