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
              // Log received phones when count changes
              if (data.phones.length !== phones.length) {
                console.log(`📥 Received ${data.phones.length} phone(s) from server:`, data.phones.map((p: PhoneData) => ({
                  id: p.id,
                  name: p.name || 'Unnamed',
                  hasGyro: !!p.gyroscope,
                })))
              }
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

  // Get phones with gyroscope data, sorted by connection time
  // First connected user gets first layer, second user gets second layer
  const phonesWithGyro = useMemo(() => {
    // Log all phones first
    console.log('📱 All phones:', phones.length, phones.map(p => ({
      id: p.id,
      name: p.name || 'Unnamed',
      hasGyro: !!p.gyroscope,
      gyro: p.gyroscope,
    })))

    const filtered = phones
      .filter(p => p.gyroscope)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 2) // Only use first 2 phones with gyroscope

    console.log(`✅ Phones with gyroscope: ${filtered.length}`, filtered.map((p, i) => ({
      layer: i === 0 ? 'Layer 1 (Bun)' : 'Layer 2 (Lettuce)',
      id: p.id,
      name: p.name || 'Unnamed',
    })))

    return filtered
  }, [phones])

  // Calculate position for a layer based on gyroscope data
  // Phone acts as a pointer: tilt left/right moves layer horizontally, tilt forward/back moves vertically
  const calculateLayerPosition = (phone: PhoneData | undefined, layerName: string): LayerPosition => {
    const screenCenterX = 50 // 50% of screen width
    const screenCenterY = 50 // 50% of screen height
    const maxOffset = 45 // Maximum offset in percentage

    if (phone?.gyroscope) {
      const { alpha, beta } = phone.gyroscope

      // Horizontal movement: alpha (rotation around Z-axis) controls X position
      // Use 60-degree range (±30 degrees from center) for frontal plane interaction
      // Normalize alpha to -1 to 1 range based on 60-degree total range
      const alphaCenter = 0
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

      // Only log occasionally to reduce spam (every 10th update)
      if (Math.random() < 0.1) {
        console.log(`🎯 ${layerName} - Phone: ${phone.id.slice(-8)}, Alpha: ${alpha.toFixed(1)}, Beta: ${beta.toFixed(1)}, Pos: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`)
      }

      return position
    }

    // No user connected - center it
    return { x: screenCenterX, y: screenCenterY }
  }

  // Calculate positions for both layers
  const layer1Position = useMemo(() => {
    const phone = phonesWithGyro[0]
    return calculateLayerPosition(phone, 'Layer 1 (Bun)')
  }, [phonesWithGyro])

  const layer2Position = useMemo(() => {
    const phone = phonesWithGyro[1]
    return calculateLayerPosition(phone, 'Layer 2 (Lettuce)')
  }, [phonesWithGyro])

  // SVG paths from provided layers
  // Paths are in 1920x1080 coordinate space
  // First layer: bun (beige/tan color)
  const bunPath = 'M771.4,500.3c-6.7,13.3,9.3,35.4,11.2,56.9s1.9,50.3-1.9,73.6c-3.7,23.3-11.2,43.8-5.6,51.3,5.6,7.5,10.3,12.1,15.8,12.1s14-3.7,28.9-6.5c14.9-2.8,58.7-8.4,77.4-7.5s28,3.7,41,1.9c13-1.9,63.4-13,82-15.8,18.6-2.8,59.7-1.9,71.8-7.5,12.1-5.6,27-12.1,29.8-36.4,2.8-24.2,10.9-96,18.4-117.4,7.5-21.4-2.5-38.2-2.5-52.2s5.5-21.2,11.1-35.1,3.8-31-13-24.5c-16.8,6.5-65.2,18.6-100.7,16.8s-51.3-.9-80.2,8.4-56.9,12.1-88.5,13c-31.7.9-77.4,3.7-82,9.3s-15.8,14.9-12.1,24.2c3.7,9.3,0,33.6-.9,35.4Z'

  // Second layer: lettuce (green color)
  const lettucePath = 'M745.8,682.3s-3.4-21.2-7.4-28.2c-4-7-13.4-4.6-8.1-18,5.4-13.4,9.2-18.2,8.3-30s-8.1-18-2.6-24.3c5.4-6.3,7.8-7.2,5.4-10.3s-3.2-2.1-1.5-5c1.7-2.9,4.9-3.7,3.5-5.7s-6.6-6.6-6.4-10,5.9-9,5.5-10.1-6.3-5.6-4.9-11.8c1.4-6.2,6.3-8.4,5.3-10.2s-3.4-2.1-3-7.9c.4-5.8,5.1-7.8,6.9-10.5,1.9-2.7.2-3.1.2-6.9s-.3-9.2,4.5-10.9c4.9-1.7,6-1.7,4.7-5s-3.8-6.5-1.9-9.2c2-2.7,11.4-5.6,10.9-8s-4.6-4.4-4.9-7.9,0-7,4.2-9.5c4.1-2.4,5-3.6,3.8-4.9s-4.3-3.6-4.3-4.7,1.3-3.8,1.3-5.8.8-3.3,1.6-5.9,2.4-7.7,2.4-7.7c0,0,9.1,4.9,17.8,3.7,8.7-1.2,16.4-6.5,19.3-7.4,2.9-.9,14.7-1.9,21.3,1.7,6.6,3.6,13.5,7,21.3,5.2,7.8-1.8,15.4-7.8,19.9-9.1,4.5-1.3,6.3-1.2,6.3-1.2,0,0,9.4,5.4,17.9,3.1s14.5-8.2,21.7-8.4,11.8.4,19.5,4.1c7.7,3.7,12.4,5.4,20.4,3.7,8-1.7,15.2-8.6,21.6-9.2s8.2-1.1,16.9,2.6c8.7,3.7,11.1,0,12.8,1.9,1.8,1.9,2.1,6.5,4.1,6.9s3.2-2,5.4-2.3,8.8-3.7,12.2,4c3.5,7.8,3.2,4.7,4.7,4s3.7-3.6,6.3-3.2,7.3,1.3,9.9,6.8c2.6,5.5,1.5,3.6,3.8,2.3,2.2-1.3,7.1-4.1,9.6-3.2s11.3,11.6,17.2,11.1,12.9-3.2,14.7-2.5,4.2,2.3,5.1,6.4c.9,4,.4,3.1,3,2.5s8.1-4.4,11.1,0c2.9,4.4,3.4,10.1,5.3,10.4s3.7-3.1,6.9,1.1c3.2,4.1,4.5,12.5,1.3,15.4-3.2,2.9-.2,2.1,1.7,4.3s3.7,2.1,2.9,5.2-.6,3.4.3,4.8c.9,1.4,2.8,2.4,1.3,3.8s-4.9,3.7-3.7,5.4,6.6,4.5,6.5,9.4-1.4,7.2-2.4,8.4-2.9,2.3-1.1,3.5,6.1,2.8,6.1,5.7c0,2.9-7.3,9.3-8.3,11s-3,5.1-1.1,5.4,5.7.6,5.7,2.2-5.9,8.4-5.3,9,5.6,5,6.4,7.6-.8,8.2-2.4,9.6-2.2,2.7-2.2,3,4.6,2.5,5.1,9.1c.6,6.7-2.9,11.7-4.3,12.9-1.4,1.1-1.3,4.2-.4,5.4.9,1.2,1.6.2,2.1,4s-2.3,5.4-2.4,7.4c-.1,2,1.7,8.4,4,13,2.3,4.6,2.7,5.3,1.2,6.9-1.5,1.6-6.2,7.1-5.8,7.9s1.4.2,2.9,2.4,3.1,3.4,2.4,5.9c-.6,2.5-.3,5,.3,5.9s-1.6,6-7.8,7.4c-6.3,1.3-7.4,1.3-7.1,2.6s2.7,4.7,1.2,8-5,5.6-7.6,5.5-6.2-2.4-6.5-.6c-.4,1.9-.6,7-4.8,9.5-4.2,2.4-7.5,1.1-12.1-.8-4.5-1.8-6.5-5.3-10.5-5.3s-13-.5-18.5,2.5c-5.5,2.9-8,7.1-17.3,7.3-9.3.2-14.1-4.7-22.2-5.3s-16.6-2.1-20.3.2-12,9.1-18.5,10.5c-6.5,1.3-12.3,2.2-17.2.6s-5.3-3.9-9.7-3.2-5.8,2.8-7.7,3.6-8.4,2.2-11.8-2.6-3.4-1.4-4.8-.4-4.1,5.1-7.9,5.1-7.6-4.1-10.9-5.5-3.7,4-4.1,5.3-3.5,3.4-7.9,3.2-14.9-7-22.6-2.9-9.2,5.7-15.4,5.4-8.1,1.6-18.9-1.9c-10.7-3.4-16.2-7.4-23.7-2.3-7.5,5.1-14.1,12.5-20.2,9.6-6.1-2.9-5.9-5.6-7.8-4.5-1.9,1.1-2,5.3-5.2,4.9s-7.6-7.5-17.5-10.1c-9.9-2.6-24.9-6.9-24.9-6.9Z'

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
        {/* Second layer - lettuce (rendered first so it appears below first layer) */}
        <g
          transform={`translate(${(layer2Position.x / 100) * 1920 - pathCenterX}, ${(layer2Position.y / 100) * 1080 - pathCenterY + 20})`}
          style={{
            transition: 'transform 0.05s ease-out',
          }}
        >
          <path
            d={lettucePath}
            fill="#185900"
            opacity={0.95}
          />
        </g>

        {/* First layer (rendered second so it appears on top) */}
        <g
          transform={`translate(${(layer1Position.x / 100) * 1920 - pathCenterX}, ${(layer1Position.y / 100) * 1080 - pathCenterY})`}
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
