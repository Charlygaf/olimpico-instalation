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
  image?: string
}

function PhonePageContent() {
  const [connectionId, setConnectionId] = useState<string>('')
  const [data, setData] = useState<PhoneData | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false)
  const [gyroscopeFrozen, setGyroscopeFrozen] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [showSelfieCamera, setShowSelfieCamera] = useState(false)
  const [selfieImage, setSelfieImage] = useState<string>('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gyroscopeCleanupRef = useRef<(() => void) | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const selfieVideoRef = useRef<HTMLVideoElement>(null)
  const selfieCanvasRef = useRef<HTMLCanvasElement>(null)
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

  // Camera setup for selfie
  useEffect(() => {
    if (!showSelfieCamera || !selfieVideoRef.current) return

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setShowSelfieCamera(false)
      return
    }

    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((mediaStream) => {
        stream = mediaStream
        if (selfieVideoRef.current) {
          selfieVideoRef.current.srcObject = mediaStream
        }
      })
      .catch(() => {
        setShowSelfieCamera(false)
      })

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [showSelfieCamera])

  const captureSelfie = () => {
    if (!selfieVideoRef.current || !selfieCanvasRef.current) return

    const video = selfieVideoRef.current
    const canvas = selfieCanvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const base64Image = canvas.toDataURL('image/jpeg', 0.8)
    setSelfieImage(base64Image)
    setShowSelfieCamera(false)

    if (video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  const closeSelfieCamera = () => {
    setShowSelfieCamera(false)
    if (selfieVideoRef.current?.srcObject) {
      const stream = selfieVideoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  // Send data to server periodically
  useEffect(() => {
    if (!connectionId || !data) return

    const sendData = async () => {
      try {
        const payload: PhoneData & { id: string; image?: string } = {
          id: connectionId,
          ...data,
          frozen: gyroscopeFrozen, // Include frozen state
          image: selfieImage || undefined, // Include selfie if available
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
  }, [connectionId, data, gyroscopeFrozen, selfieImage])

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
        <h1
          className="text-4xl md:text-5xl font-normal"
          style={{
            fontFamily: 'SnellRoundhand, ui-serif, Georgia, "Times New Roman", Times, serif',
          }}
        >
          Olimpico estudio
        </h1>
        <h3 className="text-2xl  font-semibold">
          Apunta al medio de la pantalla y apreta el botón
        </h3>
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
          {capturing ? 'Abriendo...' : 'Screenshot'}
        </button>
        <button
          onClick={() => setShowSelfieCamera(true)}
          className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-lg hover:bg-blue-700 transition-colors"
        >
          Usar Selfie
        </button>
        {selfieImage && (
          <div className="text-sm text-white/80">
            ✓ Selfie capturada
          </div>
        )}
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

      {/* Selfie Camera Modal */}
      {showSelfieCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <video
              ref={selfieVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg mb-4"
            />
            <canvas ref={selfieCanvasRef} className="hidden" />
            <div className="flex gap-4">
              <button
                onClick={captureSelfie}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                Capturar
              </button>
              <button
                onClick={closeSelfieCamera}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
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
