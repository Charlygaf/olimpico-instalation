'use client'

import { useEffect, useState, useMemo } from 'react'
import { PhoneData } from '@/lib/phoneStore'

interface LayerPosition {
  x: number
  y: number
}

export default function InstalacionPage() {
  const [phones, setPhones] = useState<PhoneData[]>([])

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connect = () => {
      try {
        eventSource = new EventSource('/api/stream')

        eventSource.onopen = () => {
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

        eventSource.onerror = () => {
          console.error('Stream error')
          eventSource?.close()
          eventSource = null

          // Reconnect after 3 seconds
          setTimeout(connect, 3000)
        }
      } catch (error) {
        console.error('Error connecting to stream:', error)
        setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      eventSource?.close()
    }
  }, [])

  // Get first phone with gyroscope data
  const phoneWithGyro = useMemo(() => {
    return phones
      .filter(p => p.gyroscope)
      .sort((a, b) => a.timestamp - b.timestamp)[0]
  }, [phones])

  // Calculate position for the layer based on gyroscope data
  // Phone acts as a pointer: tilt left/right moves layer horizontally, tilt forward/back moves vertically
  const layerPosition = useMemo<LayerPosition>(() => {
    const screenCenterX = 50 // 50% of screen width
    const screenCenterY = 50 // 50% of screen height
    const maxOffset = 45 // Maximum offset in percentage

    if (phoneWithGyro?.gyroscope) {
      const { alpha, beta } = phoneWithGyro.gyroscope

      console.log('Gyroscope values:', { alpha, beta })

      // Horizontal movement: alpha (rotation around Z-axis) controls X position
      // Use 60-degree range (±30 degrees from center) for frontal plane interaction
      // Normalize alpha to -1 to 1 range based on 60-degree total range
      // Center alpha around 0 (or handle device orientation)
      const alphaCenter = 0 // Adjust if needed based on device orientation
      const alphaOffset = ((alpha - alphaCenter + 180) % 360) - 180 // Normalize to -180 to 180
      const normalizedAlpha = Math.max(-1, Math.min(1, -alphaOffset / 30)) // 60-degree range = ±30, inverted

      // Vertical movement: beta (front-back tilt) controls Y position
      // Use 60-degree range (±30 degrees from center) for frontal plane interaction
      // Invert beta so forward tilt moves layer up (more intuitive)
      const normalizedBeta = Math.max(-1, Math.min(1, -beta / 30)) // 60-degree range = ±30

      const position = {
        x: screenCenterX + normalizedAlpha * maxOffset,
        y: screenCenterY + normalizedBeta * maxOffset,
      }

      console.log('Calculated position:', {
        alphaOffset,
        normalizedAlpha,
        normalizedBeta,
        position,
      })

      return position
    }

    console.log('No phone with gyroscope connected')

    // No user connected - center it
    return { x: screenCenterX, y: screenCenterY }
  }, [phoneWithGyro])

  // SVG path from provided bun layer
  // Path is in 1920x1080 coordinate space
  // Path appears to be roughly centered around (960, 540) in the original viewBox
  const bunPath = 'M771.4,500.3c-6.7,13.3,9.3,35.4,11.2,56.9s1.9,50.3-1.9,73.6c-3.7,23.3-11.2,43.8-5.6,51.3,5.6,7.5,10.3,12.1,15.8,12.1s14-3.7,28.9-6.5c14.9-2.8,58.7-8.4,77.4-7.5s28,3.7,41,1.9c13-1.9,63.4-13,82-15.8,18.6-2.8,59.7-1.9,71.8-7.5,12.1-5.6,27-12.1,29.8-36.4,2.8-24.2,10.9-96,18.4-117.4,7.5-21.4-2.5-38.2-2.5-52.2s5.5-21.2,11.1-35.1,3.8-31-13-24.5c-16.8,6.5-65.2,18.6-100.7,16.8s-51.3-.9-80.2,8.4-56.9,12.1-88.5,13c-31.7.9-77.4,3.7-82,9.3s-15.8,14.9-12.1,24.2c3.7,9.3,0,33.6-.9,35.4Z'

  // Use the original viewBox and position the path correctly
  // Path center is approximately (960, 540), so we translate to center it
  // Then apply layerPosition as percentage of viewBox
  const pathCenterX = 960
  const pathCenterY = 540

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <svg
        viewBox="0 0 1920 1080"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <g
          transform={`translate(${(layerPosition.x / 100) * 1920 - pathCenterX}, ${(layerPosition.y / 100) * 1080 - pathCenterY})`}
          style={{
            transition: 'transform 0.05s ease-out',
          }}
        >
          <path
            d={bunPath}
            fill="#ffe4b3"
            opacity={0.95}
          />
        </g>
      </svg>
    </div>
  )
}
