import { NextResponse } from 'next/server'
import { route } from '@/lib/security'
import { prisma } from '@/lib/prisma'
export async function GET(req:Request){
 return route(req,async()=>{
 const result={
 contacts:await prisma.contact.findMany({select:{id:true,fullName:true},take:500}),
 companies:await prisma.company.findMany({select:{id:true,name:true},take:500}),
 deals:await prisma.deal.findMany({select:{id:true,title:true},take:500}),
 channels:await prisma.channel.findMany({select:{id:true,name:true,type:true}}),
 products:await prisma.product.findMany({where:{active:true},select:{id:true,name:true,price:true},take:1000}),
 stages:await prisma.stage.findMany({select:{id:true,name:true,pipelineId:true}}),
 users:await prisma.user.findMany({select:{id:true,fullName:true}})
 };return NextResponse.json(result)
 })
}
