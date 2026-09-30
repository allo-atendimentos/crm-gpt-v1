import { createCipheriv,createDecipheriv,randomBytes,createHash,timingSafeEqual } from 'node:crypto'
function key(){const k=process.env.ENCRYPTION_KEY;if(!k||k.length<32)throw new Error('Configure ENCRYPTION_KEY com pelo menos 32 caracteres');return createHash('sha256').update(k).digest()}
export function seal(value:any){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key(),iv);const data=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return [iv,c.getAuthTag(),data].map(x=>x.toString('base64url')).join('.')}
export function unseal(value:string){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64url'));const d=createDecipheriv('aes-256-gcm',key(),iv);d.setAuthTag(tag);return JSON.parse(Buffer.concat([d.update(data),d.final()]).toString())}
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex')
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
