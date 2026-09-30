import { NextResponse } from 'next/server'
export async function POST(){return NextResponse.json({error:'Configure armazenamento privado no servidor para anexos.'},{status:503})}
