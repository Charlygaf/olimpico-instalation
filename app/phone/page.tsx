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
  frozen?: boolean
}

function PhonePageContent() {
  const [connectionId, setConnectionId] = useState<string>('')
  const [data, setData] = useState<PhoneData | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false)
  const [gyroscopeFrozen, setGyroscopeFrozen] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gyroscopeCleanupRef = useRef<(() => void) | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const frozenGyroscopeDataRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null)
  const isFrozenRef = useRef(false)

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

  // Enable gyroscope function or toggle freeze
  const enableGyroscope = () => {
    // If gyroscope is already enabled, toggle freeze state
    if (gyroscopeEnabled) {
      if (gyroscopeFrozen) {
        // Unfreeze - resume movement
        setGyroscopeFrozen(false)
        isFrozenRef.current = false
      } else {
        // Freeze - save current position and stop updating
        if (data?.gyroscope) {
          frozenGyroscopeDataRef.current = { ...data.gyroscope }
        }
        setGyroscopeFrozen(true)
        isFrozenRef.current = true
      }
      return
    }

    // First time enabling gyroscope
    const setupGyroscope = () => {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        // If frozen, don't update the data
        if (isFrozenRef.current) {
          return
        }

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

      setGyroscopeEnabled(true)
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
    } else {
      // Device orientation not supported
    }
  }

  // Update data when frozen state changes to use frozen position
  useEffect(() => {
    if (gyroscopeFrozen && frozenGyroscopeDataRef.current) {
      // Keep sending the frozen position to maintain layer position
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          gyroscope: frozenGyroscopeDataRef.current!,
        }
      })
    }
  }, [gyroscopeFrozen])

  // Cleanup gyroscope on unmount
  useEffect(() => {
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
          frozen: gyroscopeFrozen, // Include frozen state
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
  }, [connectionId, data, gyroscopeFrozen])

  const handleVideoEnd = () => {
    setShowVideoModal(false)
  }

  // Open dashboard and instruct user to take screenshot
  const captureDashboard = () => {
    setCapturing(true)
    const dashboardUrl = `${window.location.origin}/instalacion`
    const newWindow = window.open(dashboardUrl, '_blank', 'width=1920,height=1080')

    if (newWindow) {
      // Show instructions after a short delay
      setTimeout(() => {
        alert('El dashboard se ha abierto en una nueva ventana.\n\nPara guardar la imagen:\n1. Toma un screenshot usando los atajos de tu dispositivo (Power + Volumen abajo en Android, o los botones laterales en iPhone)\n2. La imagen se guardará automáticamente en tu galería')
        setCapturing(false)
      }, 1500)
    } else {
      alert('Por favor, permite que se abran ventanas emergentes en la configuración del navegador y vuelve a intentar')
      setCapturing(false)
    }
  }

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/images/bg-insta.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="text-center space-y-6 flex flex-col items-center">
        <h1 className="text-2xl md:text-3xl font-bold">
          Apunta al medio de la pantalla y apreta el botón
        </h1>
        <button
          onClick={enableGyroscope}
          className={`px-8 py-4 font-bold text-lg rounded-lg transition-colors ${
            gyroscopeFrozen
              ? 'bg-yellow-600 text-white'
              : gyroscopeEnabled
              ? 'bg-green-600 text-white'
              : 'bg-white text-black hover:bg-gray-200'
          }`}
        >
          {gyroscopeFrozen
            ? 'Intervenir obra (Pausado)'
            : gyroscopeEnabled
            ? 'Intervenir obra (Activo)'
            : 'Intervenir obra'}
        </button>
        <button
          onClick={() => setShowVideoModal(true)}
          className="px-8 py-4 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors"
        >
          Que es el arte?
        </button>
        <button
          onClick={captureDashboard}
          disabled={capturing}
          className="px-8 py-4 bg-white text-black font-bold text-lg rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {capturing ? 'Abriendo...' : 'Capturar Dashboard'}
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
