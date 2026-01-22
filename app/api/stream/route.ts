import { NextRequest } from 'next/server'
import { phoneStore } from '@/lib/phoneStore'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial state
      const sendPhones = () => {
        const phones = phoneStore.getAllPhones()
        // Log phone store state
        if (phones.length > 0) {
          console.log(`[Stream] Sending ${phones.length} phone(s):`, phones.map(p => ({
            id: p.id,
            name: p.name || 'Unnamed',
            hasGyro: !!p.gyroscope,
            timestamp: p.timestamp,
          })))
        }
        const data = JSON.stringify({
          type: 'phones',
          phones,
        })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Send initial phones
      sendPhones()

      // Send updates every 100ms for fluid movement
      const interval = setInterval(() => {
        sendPhones()
      }, 100)

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
