'use client'

import { useEffect, useState } from 'react'

export default function Home() {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [connectionId, setConnectionId] = useState<string>('')
  const [serverUrl, setServerUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    // Use a fixed connection ID so the QR code is always the same
    // This allows printing the QR code physically
    const STORAGE_KEY = 'fixed-phone-connection-id'
    let id = localStorage.getItem(STORAGE_KEY)

    // If no fixed ID exists, generate one and save it permanently
    if (!id) {
      id = 'phone-main-installation'
      localStorage.setItem(STORAGE_KEY, id)
    }

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

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear todas las conexiones y el dashboard? Esta acción no se puede deshacer.')) {
      return
    }

    setResetting(true)
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      })

      if (response.ok) {
        // Reload the page to refresh the state
        window.location.reload()
      } else {
        alert('Error al resetear. Por favor intenta de nuevo.')
      }
    } catch (error) {
      alert('Error al resetear. Por favor intenta de nuevo.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">

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
              View Installation →
            </a>
          </div>

          <div className="text-center">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {resetting ? 'Reseteando...' : 'Reset'}
            </button>
          </div>


        </div>
      </div>
    </div>
  )
}
