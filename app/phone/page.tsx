'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface PhoneData {
  name?: string
  image?: string
  userAgent: string
  platform: string
  language: string
  screenWidth: number
  screenHeight: number
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  }
  gyroscope?: {
    alpha: number
    beta: number
    gamma: number
  }
}

function PhonePageContent() {
  const searchParams = useSearchParams()
  const connectionId = searchParams.get('id') || ''
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState<PhoneData | null>(null)
  const [name, setName] = useState<string>('')
  const [image, setImage] = useState<string>('')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [locationError, setLocationError] = useState<string>('')
  const [gyroscopeError, setGyroscopeError] = useState<string>('')
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gyroscopeCleanupRef = useRef<(() => void) | null>(null)

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

  // Cleanup location watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId)
      }
      if (gyroscopeCleanupRef.current) {
        gyroscopeCleanupRef.current()
      }
    }
  }, [locationWatchId])

  // Request location permission (user-triggered)
  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation not supported on this device')
      return
    }

    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setData((prev) => ({
          ...prev!,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
        }))
        setLocationError('')

        // Watch position for updates
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            setData((prev) => ({
              ...prev!,
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              },
            }))
          },
          (error) => {
            console.error('Geolocation watch error:', error)
            if (error.code === error.PERMISSION_DENIED) {
              setLocationError('Location permission denied')
            }
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
        setLocationWatchId(watchId)
      },
      (error) => {
        console.error('Geolocation error:', error)
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Please allow in browser settings.')
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location unavailable. Check your GPS/WiFi settings.')
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please try again.')
        } else {
          setLocationError('Failed to get location')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Request gyroscope permission (user-triggered)
  const requestGyroscope = () => {
    setGyroscopeError('')

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
          setGyroscopeError('')
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
          } else {
            setGyroscopeError('Motion permission denied. Please allow in browser settings.')
          }
        })
        .catch((error: Error) => {
          console.error('Device orientation permission error:', error)
          setGyroscopeError('Failed to request motion permission')
        })
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      // Android or older iOS - try to access directly
      setupGyroscope()
    } else {
      setGyroscopeError('Device orientation not supported. Requires HTTPS connection.')
    }
  }

  // Camera setup with proper error handling
  useEffect(() => {
    if (!showCamera || !videoRef.current) return

    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access requires HTTPS. Please use a secure connection.')
      setShowCamera(false)
      return
    }

    let stream: MediaStream | null = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((mediaStream) => {
        stream = mediaStream
        setCameraError('')
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      })
      .catch((error) => {
        console.error('Error accessing camera:', error)
        let errorMessage = 'Could not access camera.'
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied. Please allow camera access.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another app.'
        }
        setCameraError(errorMessage)
        setShowCamera(false)
      })

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [showCamera])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.8)
    setImage(base64Image)
    setShowCamera(false)
    setCameraError('')

    // Stop camera
    if (video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  const closeCamera = () => {
    setShowCamera(false)
    setCameraError('')
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
    }
  }

  // Send data to server periodically
  useEffect(() => {
    if (!connectionId || !data) return

    const sendData = async () => {
      try {
        const payload: PhoneData & { id: string } = {
          id: connectionId,
          ...data,
        }

        // Add name and image if provided
        if (name.trim()) payload.name = name.trim()
        if (image) payload.image = image

        const response = await fetch('/api/phone', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          setConnected(true)
        }
      } catch (error) {
        console.error('Error sending data:', error)
        setConnected(false)
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
  }, [connectionId, data, name, image])

  const canUseCamera = typeof navigator !== 'undefined' &&
                       navigator.mediaDevices &&
                       navigator.mediaDevices.getUserMedia

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className={`w-4 h-4 rounded-full mx-auto mb-4 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <h1 className="text-2xl font-bold mb-2">
            {connected ? 'Connected' : 'Connecting...'}
          </h1>
          <p className="text-gray-400">
            Your phone data is being sent to the installation
          </p>
        </div>

        {/* Name Input */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium mb-2">
            Your Name (Optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={50}
          />
        </div>

        {/* Photo Section */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium mb-2">
            Your Photo (Optional)
          </label>
          {cameraError && (
            <div className="mb-2 p-2 bg-yellow-900 border border-yellow-700 rounded text-yellow-200 text-xs">
              {cameraError}
              {!canUseCamera && (
                <div className="mt-1">
                  Use HTTPS or run: <code className="bg-yellow-800 px-1 rounded">npm run tunnel</code>
                </div>
              )}
            </div>
          )}
          {image ? (
            <div className="space-y-2">
              <img
                src={image}
                alt="Your photo"
                className="w-full max-w-xs mx-auto rounded-lg"
              />
              <button
                onClick={() => {
                  setImage('')
                  if (canUseCamera) {
                    setShowCamera(true)
                  } else {
                    setCameraError('Camera requires HTTPS connection')
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Take New Photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (canUseCamera) {
                  setShowCamera(true)
                  setCameraError('')
                } else {
                  setCameraError('Camera access requires HTTPS. Use a secure connection or tunnel.')
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canUseCamera}
            >
              {canUseCamera ? 'Take Photo' : 'Camera (Requires HTTPS)'}
            </button>
          )}
        </div>

        {/* Camera View */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg mb-4"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-4">
                <button
                  onClick={capturePhoto}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                >
                  Capture
                </button>
                <button
                  onClick={closeCamera}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        {data && (
          <div className="text-left bg-gray-800 rounded-lg p-4 text-sm space-y-3">
            {/* Status Indicators */}
            <div className="flex gap-4 pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${data.location ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs">Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${data.gyroscope ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs">Gyroscope</span>
              </div>
            </div>

            {/* Location Display */}
            {data.location ? (
              <div className="bg-green-900/20 border border-green-700 rounded p-2">
                <div className="text-green-300 text-xs font-semibold mb-1">📍 Location Active</div>
                <div className="text-white text-xs">
                  {data.location.latitude.toFixed(6)}, {data.location.longitude.toFixed(6)}
                </div>
                <div className="text-green-400 text-xs">
                  Accuracy: ±{data.location.accuracy.toFixed(0)}m
                </div>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <div className="text-red-300 text-xs font-semibold mb-2">📍 Location not available</div>
                {locationError && (
                  <div className="text-red-400 text-xs mb-2">{locationError}</div>
                )}
                <button
                  onClick={requestLocation}
                  className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-xs font-semibold"
                >
                  Enable Location
                </button>
              </div>
            )}

            {/* Gyroscope Display */}
            {data.gyroscope ? (
              <div className="bg-purple-900/20 border border-purple-700 rounded p-2">
                <div className="text-purple-300 text-xs font-semibold mb-1">🔄 Gyroscope Active</div>
                <div className="text-white text-xs space-y-1">
                  <div>α: {data.gyroscope.alpha.toFixed(2)}°</div>
                  <div>β: {data.gyroscope.beta.toFixed(2)}°</div>
                  <div>γ: {data.gyroscope.gamma.toFixed(2)}°</div>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-700 rounded p-3">
                <div className="text-red-300 text-xs font-semibold mb-2">🔄 Gyroscope not available</div>
                {gyroscopeError && (
                  <div className="text-red-400 text-xs mb-2">{gyroscopeError}</div>
                )}
                {!gyroscopeError && (
                  <div className="text-red-400 text-xs mb-2">
                    {typeof DeviceOrientationEvent !== 'undefined' &&
                     typeof (DeviceOrientationEvent as any).requestPermission === 'function'
                      ? 'Tap the button below to allow motion access'
                      : 'Requires HTTPS connection. Use a tunnel for full access.'}
                  </div>
                )}
                <button
                  onClick={requestGyroscope}
                  className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs font-semibold"
                >
                  Enable Gyroscope
                </button>
              </div>
            )}

            {/* Other Info */}
            <div className="pt-2 space-y-1 text-xs">
              <div>
                <strong>Platform:</strong> {data.platform}
              </div>
              <div>
                <strong>Language:</strong> {data.language}
              </div>
              <div>
                <strong>Screen:</strong> {data.screenWidth} × {data.screenHeight}
              </div>
            </div>
          </div>
        )}
      </div>
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
