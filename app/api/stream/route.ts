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
        const data = JSON.stringify({
          type: 'phones',
          phones,
        })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
      }

      // Send initial phones
      sendPhones()

      // Send updates every 1 second
      const interval = setInterval(() => {
        sendPhones()
      }, 1000)

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
