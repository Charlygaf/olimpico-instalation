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
  // Priority 1: Explicit base URL from environment (for hosted deployments)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL

  if (baseUrl) {
    return NextResponse.json({
      url: baseUrl,
      type: 'hosted'
    })
  }

  // Priority 2: Vercel URL (automatically set by Vercel)
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    const protocol = process.env.VERCEL_ENV === 'production' ? 'https' : 'https'
    return NextResponse.json({
      url: `${protocol}://${vercelUrl}`,
      type: 'vercel'
    })
  }

  // Priority 3: Tunnel URL from environment
  const tunnelUrl = process.env.TUNNEL_URL
  if (tunnelUrl) {
    return NextResponse.json({
      url: tunnelUrl,
      type: 'tunnel'
    })
  }

  // Priority 4: Local network IP (for local development)
  const localIP = getLocalIP()
  const port = process.env.PORT || '3000'

  if (localIP) {
    return NextResponse.json({
      url: `http://${localIP}:${port}`,
      type: 'local'
    })
  }

  // Fallback: Try to get from request headers (for some hosting platforms)
  // This will be handled by the client-side fallback in the page component
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_FALLBACK_URL || 'http://localhost:3000',
    type: 'fallback'
  })
}
