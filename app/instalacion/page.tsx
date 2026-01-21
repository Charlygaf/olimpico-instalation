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

  // Get phones with gyroscope data, sorted by connection time
  const phonesWithGyro = useMemo(() => {
    return phones
      .filter(p => p.gyroscope)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 5) // Only use first 5 phones with gyroscope
  }, [phones])

  // Calculate positions for each layer based on gyroscope data
  // Phone acts as a pointer: tilt left/right moves layer horizontally, tilt forward/back moves vertically
  const layerPositions = useMemo<LayerPosition[]>(() => {
    const positions: LayerPosition[] = []
    const screenCenterX = 50 // 50% of screen width
    const screenCenterY = 50 // 50% of screen height
    const maxOffset = 45 // Maximum offset in percentage (increased for more movement range)

    for (let i = 0; i < 5; i++) {
      const phone = phonesWithGyro[i]
      if (phone?.gyroscope) {
        const { beta, gamma } = phone.gyroscope

        // Horizontal movement: gamma (left-right tilt, -90 to 90 degrees) controls X position
        // Tilt phone left (negative gamma) → layer moves left
        // Tilt phone right (positive gamma) → layer moves right
        const normalizedGamma = Math.max(-1, Math.min(1, gamma / 90))

        // Vertical movement: beta (front-back tilt, -180 to 180 degrees) controls Y position
        // Tilt phone forward (positive beta) → layer moves down
        // Tilt phone backward (negative beta) → layer moves up
        // Invert beta so forward tilt moves layer up (more intuitive)
        const normalizedBeta = Math.max(-1, Math.min(1, -beta / 180))

        const x = screenCenterX + normalizedGamma * maxOffset
        const y = screenCenterY + normalizedBeta * maxOffset

        positions.push({ x, y })
      } else {
        // No user for this layer - center it
        positions.push({ x: screenCenterX, y: screenCenterY })
      }
    }

    return positions
  }, [phonesWithGyro])

  // Layer definitions with proper sandwich shapes (centered around origin)
  const layers = [
    {
      name: 'Bottom Bun',
      color: '#D4A574',
      // Bottom bun - wider, flatter, centered
      path: 'M -40 5 Q -30 -2.5 -20 0 Q -10 -2.5 0 0 Q 10 -2.5 20 0 Q 30 -2.5 40 5 Q 0 10 -40 5 Z',
    },
    {
      name: 'Tomato',
      color: '#E63946',
      // Tomato slice - circular/oval, centered
      path: 'M -30 -20 Q 0 -27.5 30 -20 Q 0 -17.5 -30 -20 Z',
    },
    {
      name: 'Lettuce',
      color: '#06D6A0',
      // Lettuce - wavy edges, centered
      path: 'M -35 -2 Q -25 -9 -15 -2 Q -5 -9 5 -2 Q 15 -9 25 -2 Q 35 -9 35 3 Q 0 8 -35 3 Q -35 -2 -35 -2 Z',
    },
    {
      name: 'Jam',
      color: '#9B59B6',
      // Jam - irregular blob shape, centered
      path: 'M -32 -2 Q -20 -12 -5 -4 Q 5 -10 20 -2 Q 32 -7 32 3 Q 0 6 -32 3 Q -32 -2 -32 -2 Z',
    },
    {
      name: 'Top Bun',
      color: '#D4A574',
      // Top bun - domed shape, centered
      path: 'M -35 -15 Q -25 -25 -15 -20 Q -5 -25 0 -22 Q 5 -25 15 -20 Q 25 -25 35 -15 Q 0 -5 -35 -15 Z',
    },
  ]

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {layers.map((layer, index) => {
          const position = layerPositions[index]

          return (
            <g
              key={layer.name}
              transform={`translate(${position.x}, ${position.y})`}
              style={{
                transition: 'transform 0.05s ease-out',
              }}
            >
              <path
                d={layer.path}
                fill={layer.color}
                opacity={0.95}
                stroke="#000"
                strokeWidth="0.3"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
