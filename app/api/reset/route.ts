import { NextResponse } from 'next/server'
import { phoneStore } from '@/lib/phoneStore'
import { eventStore } from '@/lib/eventStore'

export async function POST() {
  try {
    // Clear all phone connections
    phoneStore.clear()

    // Reset event store
    eventStore.reset()

    return NextResponse.json({ success: true, message: 'All data reset successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}
