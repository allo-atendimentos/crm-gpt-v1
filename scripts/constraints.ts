import {Prisma} from '@prisma/client'
import {db} from '../lib/prisma'
import {writeFileSync,mkdirSync} from 'node:fs'
const models=Prisma.dmmf.datamodel.models
const table=(m:any)=>m.dbName??m.name
const field=(m:any,n:string)=>m.fields.find((f:any)=>f.name===n)?.dbName??n
const tenantModels=models.filter(m=>m.fields.some(f=>f.name==='tenantId'))
const statements:string[]=[]
for(const m of tenantModels){if(!m.fields.some(f=>f.name==='id'))continue;statements.push(`CREATE UNIQUE INDEX IF NOT EXISTS "${table(m)}_tenant_id_pair" ON "${table(m)}" ("${field(m,'tenantId')}","id")`)}
statements.push('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_tenant_fk')
const relations:any[]=[]
for(const m of tenantModels.filter(x=>x.name!=='AuditLog'))for(const f of m.fields.filter(f=>f.kind==='object'&&f.relationFromFields?.length===1&&f.relationFromFields[0]!=='tenantId')){const target=models.find(x=>x.name===f.type);if(target?.fields.some(x=>x.name==='tenantId'))relations.push([m,f.relationFromFields![0],target])}
const manual:any={Proposal:{dealId:'Deal'},Conversation:{channelId:'Channel',contactId:'Contact',dealId:'Deal',assignedToId:'User'},Campaign:{channelId:'Channel'},CampaignRecipient:{contactId:'Contact'},Execution:{automationId:'Automation'},Agent:{channelId:'Channel'}}
for(const [name,refs]of Object.entries(manual))for(const [key,target]of Object.entries(refs as any))relations.push([models.find(x=>x.name===name),key,models.find(x=>x.name===target)])
for(const [m,key,target] of relations){const name=`${table(m)}_${field(m,key)}_tenant_fk`;statements.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='${name}') THEN ALTER TABLE "${table(m)}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${field(m,'tenantId')}","${field(m,key)}") REFERENCES "${table(target)}"("${field(target,'tenantId')}","id"); END IF; END $$`)}
// A team member must belong to the same organization as the team.
statements.push(`CREATE OR REPLACE FUNCTION check_team_tenant() RETURNS trigger AS $$ BEGIN IF NOT EXISTS (SELECT 1 FROM teams t JOIN users u ON u.tenant_id=t.tenant_id WHERE t.id=NEW.team_id AND u.id=NEW.user_id) THEN RAISE EXCEPTION 'Cross-tenant team membership'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`)
statements.push(`DROP TRIGGER IF EXISTS team_tenant_guard ON team_members`)
statements.push(`CREATE TRIGGER team_tenant_guard BEFORE INSERT OR UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION check_team_tenant()`)
async function main(){mkdirSync('prisma/migrations/202609260002_tenant_constraints',{recursive:true});writeFileSync('prisma/migrations/202609260002_tenant_constraints/migration.sql',statements.join(';\n')+';\n');for(const sql of statements)await db.$executeRawUnsafe(sql);console.log(`${statements.length} restrições relacionais aplicadas`);await db.$disconnect()}
main().catch(e=>{console.error(e.message);process.exit(1)})
