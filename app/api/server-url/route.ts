import { NextResponse } from 'next/server'
import os from 'os'

export const dynamic = 'force-dynamic'

function getLocalIP(): string | null {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue

    for (const addr of iface) {
      // Ignore loopback and IPv6
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }

  return null
}

export async function GET() {
  const localIP = getLocalIP()
  const port = process.env.PORT || '3000'

  // Check if we have a tunnel URL from environment
  const tunnelUrl = process.env.TUNNEL_URL

  if (tunnelUrl) {
    return NextResponse.json({
      url: tunnelUrl,
      type: 'tunnel'
    })
  }

  if (localIP) {
    return NextResponse.json({
      url: `http://${localIP}:${port}`,
      type: 'local'
    })
  }

  // Fallback to localhost (won't work from phone but at least shows something)
  return NextResponse.json({
    url: `http://localhost:${port}`,
    type: 'localhost'
  })
}
