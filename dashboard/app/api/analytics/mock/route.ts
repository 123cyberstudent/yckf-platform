import { NextResponse } from 'next/server'
import { generateMockAnalytics } from '@/lib/mock-analytics'

export async function GET() {
  return NextResponse.json(generateMockAnalytics())
}
