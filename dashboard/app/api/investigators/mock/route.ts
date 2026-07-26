import { NextResponse } from 'next/server'
import { getInvestigatorPerformance } from '@/lib/mock-data'

export async function GET() {
  return NextResponse.json(getInvestigatorPerformance())
}
