import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync} from 'node:fs';
const db=await PGlite.create();
for(const dir of readdirSync('prisma/migrations').filter(x=>/^\d/.test(x)).sort())await db.exec(readFileSync(`prisma/migrations/${dir}/migration.sql`,'utf8'));
const {rows}=await db.query("SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public'");
if(rows[0].tables<25)throw Error('Esquema incompleto');
console.log(`PASS instalação do banco vazio: ${rows[0].tables} tabelas e restrições aplicadas`);
await db.close();
