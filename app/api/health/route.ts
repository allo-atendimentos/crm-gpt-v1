import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json(
      { status: 'ok', service: 'boss-crm', time: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json(
      { status: 'unavailable', service: 'boss-crm' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
