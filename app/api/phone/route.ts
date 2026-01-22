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
    const existing = phoneStore.getPhone(id)
    phoneStore.addPhone(id, phoneData as any)

    // Log phone updates with more detail
    const allPhones = phoneStore.getAllPhones()
    console.log(`[API] Phone ${id.slice(-12)} ${existing ? 'UPDATED' : 'ADDED'}. Total: ${allPhones.length}`, {
      id: id.slice(-12),
      hasGyro: !!phoneData.gyroscope,
      gyro: phoneData.gyroscope ? { alpha: phoneData.gyroscope.alpha?.toFixed(1), beta: phoneData.gyroscope.beta?.toFixed(1) } : null,
      allIds: allPhones.map(p => p.id.slice(-12)),
    })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Error in /api/phone:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
