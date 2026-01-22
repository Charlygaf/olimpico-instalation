import { NextRequest, NextResponse } from 'next/server'
import { phoneStore } from '@/lib/phoneStore'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...phoneData } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing connection ID' }, { status: 400 })
    }

    // Update or add phone data
    phoneStore.addPhone(id, phoneData as any)

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error in /api/phone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
