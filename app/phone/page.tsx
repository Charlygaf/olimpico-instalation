'use client'

import { useEffect, useState, useRef, Suspense } from 'react'

interface PhoneData {
  userAgent: string
  platform: string
  language: string
  screenWidth: number
  screenHeight: number
  gyroscope?: {
    alpha: number
    beta: number
    gamma: number
  }
}

function PhonePageContent() {
  const [connectionId, setConnectionId] = useState<string>('')
  const [data, setData] = useState<PhoneData | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gyroscopeCleanupRef = useRef<(() => void) | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Generate or retrieve a unique connection ID for this phone
  useEffect(() => {
    const STORAGE_KEY = 'phone-connection-id'

    // Try to get existing ID from localStorage
    let id = localStorage.getItem(STORAGE_KEY)

    // If no ID exists, generate a new random one
    if (!id) {
      id = `phone-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
      localStorage.setItem(STORAGE_KEY, id)
    }

    setConnectionId(id)
  }, [])

  useEffect(() => {
    if (!connectionId) return

    // Collect basic device data
    const phoneData: PhoneData = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    }

    setData(phoneData)
  }, [connectionId])

  // Auto-enable gyroscope on mount
  useEffect(() => {
    const setupGyroscope = () => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        const alpha = event.alpha
        const beta = event.beta
        const gamma = event.gamma

        if (alpha !== null && beta !== null && gamma !== null) {
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              gyroscope: {
                alpha: alpha,
                beta: beta,
                gamma: gamma,
              },
            }
          })
        }
      }

      window.addEventListener('deviceorientation', handleOrientation)

      gyroscopeCleanupRef.current = () => {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }

    // Request device orientation permission (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      ;(DeviceOrientationEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            setupGyroscope()
          }
        })
        .catch(() => {
          // Permission denied or error
        })
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      // Android or older iOS - try to access directly
      setupGyroscope()
    }

    return () => {
      if (gyroscopeCleanupRef.current) {
        gyroscopeCleanupRef.current()
      }
    }
  }, [])

  // Send data to server periodically
  useEffect(() => {
    if (!connectionId || !data) return

    const sendData = async () => {
      try {
        const payload: PhoneData & { id: string } = {
          id: connectionId,
          ...data,
        }

        await fetch('/api/phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      } catch {
        // Error sending data
      }
    }

    // Send immediately
    sendData()

    // Then send every 100ms for fluid movement
    intervalRef.current = setInterval(sendData, 100)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [connectionId, data])

  const handleVideoEnd = () => {
    setShowVideoModal(false)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          Apunta al medio de la pantalla y apreta el botón
        </h1>
        <button
          onClick={() => setShowVideoModal(true)}
          className="px-8 py-4 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors"
        >
          Art
        </button>
      </div>

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <video
            ref={videoRef}
            src="/videos/janefranco.mp4"
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  )
}

export default function PhonePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-4 h-4 rounded-full mx-auto mb-4 bg-yellow-500 animate-pulse" />
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    }>
      <PhonePageContent />
    </Suspense>
  )
}
