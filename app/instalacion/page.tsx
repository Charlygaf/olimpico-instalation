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
      .sort((a, b) => (a.firstSeen || a.timestamp) - (b.firstSeen || b.timestamp))
      .slice(0, 6) // Only use first 6 phones with gyroscope

    const layerNames = ['Layer 1 (Bun)', 'Layer 2 (Eggs)', 'Layer 3 (Lettuce)', 'Layer 4 (Cheese)', 'Layer 5 (Ham)', 'Layer 6 (Bun)']
    console.log(`✅ Phones with gyroscope: ${filtered.length}`, filtered.map((p, i) => ({
      layer: layerNames[i] || `Layer ${i + 1}`,
      id: p.id.slice(-12),
      name: p.name || 'Unnamed',
      firstSeen: p.firstSeen || p.timestamp,
    })))

    return filtered
  }, [phones])

  // Calculate position for a layer based on gyroscope data
  // Phone acts as a pointer: tilt left/right moves layer horizontally, tilt forward/back moves vertically
  const calculateLayerPosition = (phone: PhoneData | undefined, layerName: string, layerIndex: number): LayerPosition => {
    const screenCenterX = 50 // 50% of screen width
    const screenCenterY = 35 // 35% of screen height (higher starting point for better centering)
    const maxOffset = 45 // Maximum offset in percentage
    // 100px offset in y-axis: 100px / 1080px * 100 = ~9.26% per layer
    const layerYOffset = (100 / 1080) * 100 * layerIndex

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
        y: screenCenterY + normalizedBeta * maxOffset + layerYOffset,
      }

      // Only log occasionally to reduce spam (every 10th update)
      if (Math.random() < 0.1) {
        console.log(`🎯 ${layerName} - Phone: ${phone.id.slice(-8)}, Alpha: ${alpha.toFixed(1)}, Beta: ${beta.toFixed(1)}, Pos: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`)
      }

      return position
    }

    // No user connected - center it with layer offset
    return { x: screenCenterX, y: screenCenterY + layerYOffset }
  }

  // Calculate positions for all layers
  // Order: 1-bun, 2-eggs, 3-lettuce, 4-cheese, 5-ham, 6-bun
  const layer1Position = useMemo(() => {
    const phone = phonesWithGyro[0]
    return calculateLayerPosition(phone, 'Layer 1 (Bun)', 0)
  }, [phonesWithGyro])

  const layer2Position = useMemo(() => {
    const phone = phonesWithGyro[1]
    return calculateLayerPosition(phone, 'Layer 2 (Eggs)', 1)
  }, [phonesWithGyro])

  const layer3Position = useMemo(() => {
    const phone = phonesWithGyro[2]
    return calculateLayerPosition(phone, 'Layer 3 (Lettuce)', 2)
  }, [phonesWithGyro])

  const layer4Position = useMemo(() => {
    const phone = phonesWithGyro[3]
    return calculateLayerPosition(phone, 'Layer 4 (Cheese)', 3)
  }, [phonesWithGyro])

  const layer5Position = useMemo(() => {
    const phone = phonesWithGyro[4]
    return calculateLayerPosition(phone, 'Layer 5 (Ham)', 4)
  }, [phonesWithGyro])

  const layer6Position = useMemo(() => {
    const phone = phonesWithGyro[5]
    return calculateLayerPosition(phone, 'Layer 6 (Bun)', 5)
  }, [phonesWithGyro])

  // SVG paths from provided layers
  // Paths are in 1920x1080 coordinate space
  // First layer: bun (beige/tan color)
  const bunPath = 'M771.4,500.3c-6.7,13.3,9.3,35.4,11.2,56.9s1.9,50.3-1.9,73.6c-3.7,23.3-11.2,43.8-5.6,51.3,5.6,7.5,10.3,12.1,15.8,12.1s14-3.7,28.9-6.5c14.9-2.8,58.7-8.4,77.4-7.5s28,3.7,41,1.9c13-1.9,63.4-13,82-15.8,18.6-2.8,59.7-1.9,71.8-7.5,12.1-5.6,27-12.1,29.8-36.4,2.8-24.2,10.9-96,18.4-117.4,7.5-21.4-2.5-38.2-2.5-52.2s5.5-21.2,11.1-35.1,3.8-31-13-24.5c-16.8,6.5-65.2,18.6-100.7,16.8s-51.3-.9-80.2,8.4-56.9,12.1-88.5,13c-31.7.9-77.4,3.7-82,9.3s-15.8,14.9-12.1,24.2c3.7,9.3,0,33.6-.9,35.4Z'

  // Second layer: lettuce (green color)
  const lettucePath = 'M745.8,682.3s-3.4-21.2-7.4-28.2c-4-7-13.4-4.6-8.1-18,5.4-13.4,9.2-18.2,8.3-30s-8.1-18-2.6-24.3c5.4-6.3,7.8-7.2,5.4-10.3s-3.2-2.1-1.5-5c1.7-2.9,4.9-3.7,3.5-5.7s-6.6-6.6-6.4-10,5.9-9,5.5-10.1-6.3-5.6-4.9-11.8c1.4-6.2,6.3-8.4,5.3-10.2s-3.4-2.1-3-7.9c.4-5.8,5.1-7.8,6.9-10.5,1.9-2.7.2-3.1.2-6.9s-.3-9.2,4.5-10.9c4.9-1.7,6-1.7,4.7-5s-3.8-6.5-1.9-9.2c2-2.7,11.4-5.6,10.9-8s-4.6-4.4-4.9-7.9,0-7,4.2-9.5c4.1-2.4,5-3.6,3.8-4.9s-4.3-3.6-4.3-4.7,1.3-3.8,1.3-5.8.8-3.3,1.6-5.9,2.4-7.7,2.4-7.7c0,0,9.1,4.9,17.8,3.7,8.7-1.2,16.4-6.5,19.3-7.4,2.9-.9,14.7-1.9,21.3,1.7,6.6,3.6,13.5,7,21.3,5.2,7.8-1.8,15.4-7.8,19.9-9.1,4.5-1.3,6.3-1.2,6.3-1.2,0,0,9.4,5.4,17.9,3.1s14.5-8.2,21.7-8.4,11.8.4,19.5,4.1c7.7,3.7,12.4,5.4,20.4,3.7,8-1.7,15.2-8.6,21.6-9.2s8.2-1.1,16.9,2.6c8.7,3.7,11.1,0,12.8,1.9,1.8,1.9,2.1,6.5,4.1,6.9s3.2-2,5.4-2.3,8.8-3.7,12.2,4c3.5,7.8,3.2,4.7,4.7,4s3.7-3.6,6.3-3.2,7.3,1.3,9.9,6.8c2.6,5.5,1.5,3.6,3.8,2.3,2.2-1.3,7.1-4.1,9.6-3.2s11.3,11.6,17.2,11.1,12.9-3.2,14.7-2.5,4.2,2.3,5.1,6.4c.9,4,.4,3.1,3,2.5s8.1-4.4,11.1,0c2.9,4.4,3.4,10.1,5.3,10.4s3.7-3.1,6.9,1.1c3.2,4.1,4.5,12.5,1.3,15.4-3.2,2.9-.2,2.1,1.7,4.3s3.7,2.1,2.9,5.2-.6,3.4.3,4.8c.9,1.4,2.8,2.4,1.3,3.8s-4.9,3.7-3.7,5.4,6.6,4.5,6.5,9.4-1.4,7.2-2.4,8.4-2.9,2.3-1.1,3.5,6.1,2.8,6.1,5.7c0,2.9-7.3,9.3-8.3,11s-3,5.1-1.1,5.4,5.7.6,5.7,2.2-5.9,8.4-5.3,9,5.6,5,6.4,7.6-.8,8.2-2.4,9.6-2.2,2.7-2.2,3,4.6,2.5,5.1,9.1c.6,6.7-2.9,11.7-4.3,12.9-1.4,1.1-1.3,4.2-.4,5.4.9,1.2,1.6.2,2.1,4s-2.3,5.4-2.4,7.4c-.1,2,1.7,8.4,4,13,2.3,4.6,2.7,5.3,1.2,6.9-1.5,1.6-6.2,7.1-5.8,7.9s1.4.2,2.9,2.4,3.1,3.4,2.4,5.9c-.6,2.5-.3,5,.3,5.9s-1.6,6-7.8,7.4c-6.3,1.3-7.4,1.3-7.1,2.6s2.7,4.7,1.2,8-5,5.6-7.6,5.5-6.2-2.4-6.5-.6c-.4,1.9-.6,7-4.8,9.5-4.2,2.4-7.5,1.1-12.1-.8-4.5-1.8-6.5-5.3-10.5-5.3s-13-.5-18.5,2.5c-5.5,2.9-8,7.1-17.3,7.3-9.3.2-14.1-4.7-22.2-5.3s-16.6-2.1-20.3.2-12,9.1-18.5,10.5c-6.5,1.3-12.3,2.2-17.2.6s-5.3-3.9-9.7-3.2-5.8,2.8-7.7,3.6-8.4,2.2-11.8-2.6-3.4-1.4-4.8-.4-4.1,5.1-7.9,5.1-7.6-4.1-10.9-5.5-3.7,4-4.1,5.3-3.5,3.4-7.9,3.2-14.9-7-22.6-2.9-9.2,5.7-15.4,5.4-8.1,1.6-18.9-1.9c-10.7-3.4-16.2-7.4-23.7-2.3-7.5,5.1-14.1,12.5-20.2,9.6-6.1-2.9-5.9-5.6-7.8-4.5-1.9,1.1-2,5.3-5.2,4.9s-7.6-7.5-17.5-10.1c-9.9-2.6-24.9-6.9-24.9-6.9Z'

  // Third layer: tomato (red color)
  const tomatoPath = 'M1010.2,587.4s30,49.5,65.2,55.1c35.2,5.7,93,8.1,126-25s52-78.2,37.8-102.1c-14.2-23.9-28-37.4-56.8-39.3-28.8-2-73.5.1-91.6,8.3l-18.1,8.2s24.2-31.2,26-45.8-6.4-46.7-47.5-60.4c-41.1-13.8-86.6-19.2-121.5,1.8-35,21-69.3,51-69.1,77.6.2,26.7,9,39.6,9,39.6,0,0-26,2.8-60.6,35.7-34.7,32.9-41.9,64.6-32.7,87.9,9.2,23.3,26.8,32.8,47.9,42.7,21,9.9,110.5,19.1,142.7-21.5,32.2-40.6,43.4-62.9,43.4-62.9Z'

  // Fourth layer: ham (pink/salmon color)
  const hamPath = 'M611.2,578.8c0-6.1-5-32-5-44.2s.6-42.5.6-50.8,2.2-30.9,9.4-37,17.1-14.9,27-14.9,25.4-2.8,25.4-2.8c0,0,55.2-5,91.6-9.9,36.4-5,99.9-14.4,123.1-13.8s48.6-2.2,63.5,1.1c14.9,3.3,33.1,7.7,35.3,9.9s9.4,24.8,11,43.1-.6,37-.6,59.1-2.8,34.2-1.7,50.8,3.9,25.9-5.5,35.3c-9.4,9.4-13.8,12.1-48.6,17.7-34.8,5.5-35.3,5-58,10.5-22.6,5.5-52.4,6.1-83.4,5s-66.8,3.9-93.8,3.9-51.3-.6-59.1.6-25.9-10.5-29.3-33.1c-3.3-22.6-2.2-30.4-2.2-30.4Z'

  // Fifth layer: eggs (white path + yellow ellipses)
  const eggsWhitePath = 'M871.7,492.1c-9.8-7.3-47-19.1-59.7-3.4s-25.4,29.8-10.3,48.4c15.2,18.6,21,29.3,39.1,31.3,18.1,2,28.9,3.9,33.3-1l4.4-4.9s.5,20.1,10.8,25.4,24,14.7,41.1,9.3,26.4-13.7,26.4-13.7c0,0-1,11.7,2.9,18.1,3.9,6.4,9.3,21,37.2,9.8,27.9-11.2,36.7-15.7,43-27.9,6.4-12.2,9.8-15.2,9.8-20.1s-.5-12.2-.5-12.2c0,0,22.5-2,35.2-23,12.7-21,10.3-26.9,9.8-33.7-.5-6.8-11.7-10.8-20.5-11.2s-15.7-1-15.7-1c0,0-.5-22.5-10.8-27.4s-41.1-18.1-60.6-10.3-29.3,17.6-28.4,21c0,0-9.3-13.7-27.9-16.1s-43.5-2-50.4,7.8-8.3,34.7-8.3,34.7Z'

  // Use the original viewBox and position the path correctly
  // Path center is approximately (960, 540), so we translate to center it
  // Then apply layerPosition as percentage of viewBox
  const pathCenterX = 960
  const pathCenterY = 540

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundImage: 'url(/images/bg-insta.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <svg
        viewBox="0 0 1920 1080"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Layer 6 - bun (rendered first so it appears at the bottom) */}
        <g
          transform={`translate(${(layer6Position.x / 100) * 1920 - pathCenterX}, ${(layer6Position.y / 100) * 1080 - pathCenterY})`}
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

        {/* Layer 5 - ham (rendered second) */}
        <g
          transform={`translate(${(layer5Position.x / 100) * 1920 - pathCenterX}, ${(layer5Position.y / 100) * 1080 - pathCenterY})`}
          style={{
            transition: 'transform 0.05s ease-out',
          }}
        >
          <path
            d={hamPath}
            fill="#ffb199"
            opacity={0.95}
          />
        </g>

        {/* Layer 4 - cheese (tomato) (rendered third) */}
        <g
          transform={`translate(${(layer4Position.x / 100) * 1920 - pathCenterX}, ${(layer4Position.y / 100) * 1080 - pathCenterY})`}
          style={{
            transition: 'transform 0.05s ease-out',
          }}
        >
          <path
            d={tomatoPath}
            fill="#d51400"
            opacity={0.95}
          />
        </g>

        {/* Layer 3 - lettuce (rendered fourth) */}
        <g
          transform={`translate(${(layer3Position.x / 100) * 1920 - pathCenterX}, ${(layer3Position.y / 100) * 1080 - pathCenterY + 20})`}
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

        {/* Layer 2 - eggs (rendered fifth) */}
        <g
          transform={`translate(${(layer2Position.x / 100) * 1920 - pathCenterX}, ${(layer2Position.y / 100) * 1080 - pathCenterY})`}
          style={{
            transition: 'transform 0.05s ease-out',
          }}
        >
          <path
            d={eggsWhitePath}
            fill="#fff"
            opacity={0.95}
          />
          <ellipse cx="912.2" cy="486.5" rx="38.5" ry="25.5" fill="#ffbc58" opacity={0.95} />
          <ellipse cx="927.6" cy="558.3" rx="27.3" ry="14.1" fill="#ffbc58" opacity={0.95} />
          <ellipse cx="1015.3" cy="567.2" rx="27.3" ry="20" fill="#ffbc58" opacity={0.95} transform="translate(-68.1 989.9) rotate(-50.5)" />
          <ellipse cx="845" cy="527.8" rx="23.4" ry="27.3" fill="#ffbc58" opacity={0.95} transform="translate(-145.5 635.3) rotate(-38.2)" />
          <ellipse cx="1051.7" cy="516.9" rx="19.5" ry="23.4" fill="#ffbc58" opacity={0.95} transform="translate(-103.1 716) rotate(-36)" />
          <ellipse cx="990.5" cy="494.1" rx="27.3" ry="23.4" fill="#ffbc58" opacity={0.95} transform="translate(100.4 1152) rotate(-63)" />
        </g>

        {/* Layer 1 - bun (rendered last so it appears on top) */}
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
