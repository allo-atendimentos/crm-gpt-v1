import { request } from './providers'
export const prices:any={essential:299,unlimited:599}
export async function asaas(path:string,body?:any,method='POST'){
 if(!process.env.ASAAS_API_KEY)throw Error('503:Configure ASAAS_API_KEY no servidor para ativar a cobrança')
 const base=process.env.ASAAS_ENV==='production'?'https://api.asaas.com/v3':'https://api-sandbox.asaas.com/v3'
 return request(base+path,body,{access_token:process.env.ASAAS_API_KEY,'User-Agent':'Boss CRM'},method)
}
