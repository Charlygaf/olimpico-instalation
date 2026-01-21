'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [connectionId, setConnectionId] = useState<string>('')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate a unique connection ID
    const id = `phone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setConnectionId(id)

    // Fetch the server URL from the API (which knows the local IP or hosted URL)
    fetch('/api/server-url')
      .then(res => res.json())
      .then(data => {
        let baseUrl = data.url

        // If we got a fallback, try to use the current origin
        if (data.type === 'fallback' && typeof window !== 'undefined') {
          baseUrl = window.location.origin
        }

        setServerUrl(baseUrl)
        const phoneUrl = `${baseUrl}/phone?id=${id}`
        setQrUrl(phoneUrl)
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching server URL:', error)
        // Fallback to current origin (works for hosted deployments)
        const baseUrl = typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3000'
        setServerUrl(baseUrl)
        const phoneUrl = `${baseUrl}/phone?id=${id}`
        setQrUrl(phoneUrl)
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Connect Your Phone
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Scan this QR code with your phone to connect
        </p>

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-64 h-64 bg-gray-200 flex items-center justify-center rounded">
              <div className="text-gray-500">Loading...</div>
            </div>
          </div>
        ) : qrUrl ? (
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded border-2 border-gray-300 mb-4">
              {/* QR Code will be generated here */}
              <div className="w-64 h-64 bg-gray-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrUrl)}`}
                  alt="QR Code"
                  className="w-full h-full"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">Or open this link on your phone:</p>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm break-all text-center"
            >
              {qrUrl}
            </a>

            {serverUrl.includes('localhost') && !serverUrl.includes('https://') && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                <p className="font-semibold mb-1">⚠️ Note:</p>
                <p>Using localhost - your phone won't be able to connect unless you're using a tunnel.</p>
                <p className="mt-2">
                  Make sure your phone is on the same WiFi network, or use: <code className="bg-yellow-100 px-1 rounded">npm run tunnel</code>
                </p>
              </div>
            )}

            {serverUrl.includes('https://') && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                <p className="font-semibold mb-1">✅ Secure Connection</p>
                <p>Using HTTPS - all device features (camera, gyroscope, location) will work!</p>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <a
              href="/instalacion"
              className="text-blue-600 hover:underline"
            >
              View Installation Dashboard →
            </a>
          </div>

          {!serverUrl.includes('localhost') && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 Tip:</p>
              <p>For better device access (especially gyroscope on iOS), consider using HTTPS tunnel:</p>
              <p className="mt-1 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                npm run tunnel
              </p>
              <p className="mt-1 text-xs">Then set TUNNEL_URL environment variable and refresh.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
