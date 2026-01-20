/**
 * Vista: /installacion
 *
 * Vista proyectada sobre el objeto físico.
 *
 * Decisión técnica: Esta vista se mantiene siempre conectada
 * al stream SSE para recibir actualizaciones en tiempo real.
 *
 * Decisión estética: Fondo negro para proyección.
 * El Olímpico flota en el espacio, transformándose según
 * el estado colectivo de la instalación.
 *
 * Mapping visual:
 * - Usuarios activos → Escala del Olímpico
 * - Idiomas → Variación cromática (hue)
 * - Hora promedio → Modo día/noche (luminosidad)
 * - Movimiento promedio → Pulsación/respiración
 */

'use client'

// Forzar que esta página sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Olimpico from '@/components/Olimpico'

interface InstallationState {
  activeUsers: number
  languages: string[]
  averageHour: number
  averageMotion: number
}

export default function InstalacionPage() {
  const [state, setState] = useState<InstallationState>({
    activeUsers: 0,
    languages: [],
    averageHour: new Date().getHours(),
    averageMotion: 0,
  })
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    const connect = () => {
      try {
        eventSource = new EventSource('/api/stream')

        eventSource.onopen = () => {
          setConnected(true)
          console.log('Conectado al stream SSE')
        }

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('[Instalacion] Mensaje SSE recibido:', data)

            if (data.type === 'state' && data.data) {
              const newState = {
                activeUsers: data.data.activeUsers || 0,
                languages: data.data.languages || [],
                averageHour: data.data.averageHour || new Date().getHours(),
                averageMotion: data.data.averageMotion || 0,
              }
              console.log('[Instalacion] Actualizando estado:', newState)
              setState(newState)
            } else if (data.type === 'connected') {
              console.log('[Instalacion] Conexión SSE establecida')
            } else if (data.type === 'ping') {
              // Ping recibido, conexión viva
            }
          } catch (error) {
            console.error('Error parseando mensaje SSE:', error, event.data)
          }
        }

        eventSource.onerror = (error) => {
          console.error('Error en SSE:', error)
          setConnected(false)

          // Cerrar conexión actual
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Reconectar después de 3 segundos
          reconnectTimeout = setTimeout(() => {
            connect()
          }, 3000)
        }
      } catch (error) {
        console.error('Error conectando a SSE:', error)
        setConnected(false)

        // Intentar reconectar
        reconnectTimeout = setTimeout(() => {
          connect()
        }, 3000)
      }
    }

    // Conectar inicialmente
    connect()

    // Limpiar al desmontar
    return () => {
      if (eventSource) {
        eventSource.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Indicador de conexión (sutil, para debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 z-10">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={connected ? 'Conectado' : 'Desconectado'}
          />
        </div>
      )}

      {/* Renderizado del Olímpico */}
      <Olimpico
        activeUsers={state.activeUsers}
        languages={state.languages}
        averageHour={state.averageHour}
        averageMotion={state.averageMotion}
      />

      {/* Overlay de información (opcional, para debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 text-white text-xs opacity-50 font-mono">
          <div>Usuarios: {state.activeUsers}</div>
          <div>Idiomas: {state.languages.length}</div>
          <div>Hora: {Math.round(state.averageHour)}</div>
          <div>Movimiento: {state.averageMotion.toFixed(2)}</div>
        </div>
      )}
    </div>
  )
}
