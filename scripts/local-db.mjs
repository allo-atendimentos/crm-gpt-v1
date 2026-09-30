import {mkdirSync} from 'node:fs';mkdirSync('.local',{recursive:true});
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
const db=await PGlite.create('.local/postgres-v2');
await db.exec("SET TIME ZONE 'UTC'");
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:55433,maxConnections:20,idleTimeout:30000});
await server.start();console.log('Banco local pronto: 127.0.0.1:55433');
process.on('SIGINT',async()=>{await server.stop();await db.close();process.exit()});
