'use client'

import { useEffect, useState } from 'react'
import { PhoneData } from '@/lib/phoneStore'

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

export default function InstalacionPage() {
  const [phones, setPhones] = useState<PhoneData[]>([])
  const [connected, setConnected] = useState(false)
  const [computerLocation, setComputerLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  // Get computer location for proximity calculation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setComputerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.log('Computer location not available:', error)
        }
      )
    }
  }, [])

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      try {
        eventSource = new EventSource('/api/stream')

        eventSource.onopen = () => {
          setConnected(true)
          console.log('Connected to stream')
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'phones' && Array.isArray(data.phones)) {
              setPhones(data.phones)
            }
          } catch (error) {
            console.error('Error parsing stream data:', error)
          }
        }

        eventSource.onerror = (error) => {
          console.error('Stream error:', error)
          setConnected(false)

          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Reconnect after 3 seconds
          setTimeout(connect, 3000)
        }
      } catch (error) {
        console.error('Error connecting to stream:', error)
        setConnected(false)
        setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Installation Dashboard</h1>
            {phones.length > 0 && (
              <div className="text-gray-400 space-y-1">
                <p>
                  {phones.length} phone{phones.length !== 1 ? 's' : ''} connected
                  {phones.some(p => p.name) && (
                    <span className="ml-2">
                      • {phones.filter(p => p.name).map(p => p.name).join(', ')}
                    </span>
                  )}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>
                    📍 {phones.filter(p => p.location).length} with location
                  </span>
                  <span>
                    🔄 {phones.filter(p => p.gyroscope).length} with gyroscope
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {phones.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-xl">No phones connected</p>
            <p className="text-gray-500 mt-2">
              Scan the QR code on the home page to connect a phone
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phones.map((phone) => (
              <div
                key={phone.id}
                className="bg-gray-900 rounded-lg p-6 border border-gray-800"
              >
                <div className="mb-4">
                  {phone.image && (
                    <div className="mb-3">
                      <img
                        src={phone.image}
                        alt={phone.name || 'User photo'}
                        className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-gray-700"
                      />
                    </div>
                  )}
                  <h2 className="text-xl font-semibold mb-2 text-center">
                    {phone.name || `Phone ${phone.id.slice(-8)}`}
                  </h2>
                  <div className="text-sm text-gray-400 text-center">
                    Connected {Math.floor((Date.now() - phone.timestamp) / 1000)}s ago
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  {/* Location - Prominent Display */}
                  {phone.location ? (
                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                      <div className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
                        <span>📍</span> Location
                      </div>
                      <div className="text-white space-y-1">
                        <div className="text-xs text-gray-300">
                          {phone.location.latitude.toFixed(6)}, {phone.location.longitude.toFixed(6)}
                        </div>
                        <div className="text-xs text-gray-400">
                          Accuracy: ±{phone.location.accuracy.toFixed(0)}m
                        </div>
                        {computerLocation && (
                          <div className="mt-2 pt-2 border-t border-blue-800">
                            <div className="text-blue-200 font-semibold">
                              Distance: {calculateDistance(
                                computerLocation.latitude,
                                computerLocation.longitude,
                                phone.location.latitude,
                                phone.location.longitude
                              ).toFixed(1)}m
                            </div>
                            <div className="text-xs text-blue-300 mt-1">
                              {calculateDistance(
                                computerLocation.latitude,
                                computerLocation.longitude,
                                phone.location.latitude,
                                phone.location.longitude
                              ) < 10
                                ? 'Very close!'
                                : calculateDistance(
                                    computerLocation.latitude,
                                    computerLocation.longitude,
                                    phone.location.latitude,
                                    phone.location.longitude
                                  ) < 50
                                ? 'Close'
                                : 'Far away'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">📍 Location not available</div>
                    </div>
                  )}

                  {/* Gyroscope - Prominent Display */}
                  {phone.gyroscope ? (
                    <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                      <div className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                        <span>🔄</span> Gyroscope / Orientation
                      </div>
                      <div className="text-white space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">α (Z-axis)</div>
                            <div className="text-lg font-mono font-bold text-purple-200">
                              {phone.gyroscope.alpha.toFixed(1)}°
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">β (X-axis)</div>
                            <div className="text-lg font-mono font-bold text-purple-200">
                              {phone.gyroscope.beta.toFixed(1)}°
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-400 mb-1">γ (Y-axis)</div>
                            <div className="text-lg font-mono font-bold text-purple-200">
                              {phone.gyroscope.gamma.toFixed(1)}°
                            </div>
                          </div>
                        </div>
                        {/* Visual indicator bars */}
                        <div className="space-y-1 mt-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Z-axis rotation</div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.abs((phone.gyroscope.alpha % 360) / 360) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">X-axis tilt</div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.abs((phone.gyroscope.beta + 90) / 180) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Y-axis tilt</div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.abs((phone.gyroscope.gamma + 90) / 180) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                      <div className="text-gray-500 text-xs">🔄 Gyroscope not available</div>
                      <div className="text-gray-600 text-xs mt-1">
                        Requires HTTPS and device permission
                      </div>
                    </div>
                  )}

                  {/* Other Info */}
                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <div>
                      <div className="text-gray-400 text-xs">Platform</div>
                      <div className="text-white text-xs">{phone.platform}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Language</div>
                      <div className="text-white text-xs">{phone.language}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Screen</div>
                      <div className="text-white text-xs">
                        {phone.screenWidth} × {phone.screenHeight}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-400 hover:underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
