/**
 * Vista: /scan
 *
 * Vista mobile-first accesible por QR.
 *
 * Decisión estética: Minimalismo absoluto.
 * No hay formularios, no hay botones, no hay instrucciones.
 * La página se carga, captura datos, emite evento, y listo.
 *
 * El público no debe sentir que está "usando" algo.
 * Debe sentirse como un gesto natural, casi imperceptible.
 */

'use client'

// Nota: Las páginas client-side son dinámicas por defecto
// No necesitamos export const dynamic aquí

import { useEffect, useState } from 'react'
import { captureDeviceData, initMotionCapture } from '@/lib/deviceDetector'

export default function ScanPage() {
  const [status, setStatus] = useState<'loading' | 'sent' | 'error' | 'needs-permission'>('loading')
  const [motionPermissionNeeded, setMotionPermissionNeeded] = useState(false)

  useEffect(() => {
    let motionCleanup: (() => void) | null = null
    let motionValue = 0

    const sendEvent = async () => {
      try {
        // Capturar datos básicos del dispositivo
        const deviceData = captureDeviceData()

        // Intentar capturar movimiento (no bloqueante)
        console.log('[Scan] Inicializando captura de movimiento...')
        console.log('[Scan] DeviceMotionEvent disponible:', typeof DeviceMotionEvent !== 'undefined')
        console.log('[Scan] requestPermission disponible:', typeof (DeviceMotionEvent as any)?.requestPermission === 'function')
        console.log('[Scan] Protocolo:', window.location.protocol)
        console.log('[Scan] HTTPS:', window.location.protocol === 'https:')

        // Verificar si necesitamos permiso (iOS 13+)
        const needsPermission = typeof (DeviceMotionEvent as any)?.requestPermission === 'function'

        if (needsPermission) {
          // En iOS, intentar solicitar permiso automáticamente
          // Si falla, mostrará un botón para el usuario
          try {
            const permission = await (DeviceMotionEvent as any).requestPermission()
            console.log('[Scan] Permiso obtenido:', permission)

            if (permission === 'granted') {
              motionCleanup = initMotionCapture((value) => {
                const oldValue = motionValue
                motionValue = value
                if (value > 0.1 && Math.abs(value - oldValue) > 0.05) {
                  console.log('[Scan] ✅ Movimiento capturado:', value.toFixed(3))
                }
              })
            } else {
              setMotionPermissionNeeded(true)
              setStatus('needs-permission')
            }
          } catch (error) {
            console.error('[Scan] Error solicitando permiso:', error)
            setMotionPermissionNeeded(true)
            setStatus('needs-permission')
          }
        } else {
          // Android y otros - iniciar directamente
          motionCleanup = initMotionCapture((value) => {
            const oldValue = motionValue
            motionValue = value
            if (value > 0.1 && Math.abs(value - oldValue) > 0.05) {
              console.log('[Scan] ✅ Movimiento capturado:', value.toFixed(3))
            }
          })
        }

        // Esperar un momento para capturar movimiento inicial
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Enviar evento inicial al servidor
        // SIEMPRE incluir motion, incluso si es 0, para que el sistema sepa que estamos intentando capturar
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...deviceData,
            motion: motionValue, // Siempre enviar, incluso si es 0
          }),
        })

        if (response.ok) {
          setStatus('sent')
          console.log('[Scan] Evento inicial enviado, motion:', motionValue)

          // Continuar capturando y enviando movimiento mientras haya actividad
          // Enviar más frecuentemente para respuesta más rápida
          let lastSentMotion = 0
          const motionInterval = setInterval(async () => {
            // Enviar si hay cambio significativo en el movimiento (más de 0.1 de diferencia)
            // O si hay cualquier movimiento detectado (umbral muy bajo)
            const motionChanged = Math.abs(motionValue - lastSentMotion) > 0.1
            const hasMotion = motionValue > 0.05

            if (motionChanged || hasMotion) {
              console.log('[Scan] Enviando actualización de movimiento:', {
                motionValue: motionValue.toFixed(3),
                lastSent: lastSentMotion.toFixed(3),
                changed: motionChanged,
                hasMotion,
              })

              lastSentMotion = motionValue

              await fetch('/api/events', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ...deviceData,
                  motion: motionValue,
                }),
              })
            }
          }, 300) // Enviar cada 300ms para respuesta más rápida

          // Continuar capturando movimiento por más tiempo (30 segundos)
          setTimeout(() => {
            clearInterval(motionInterval)
            console.log('[Scan] Deteniendo captura de movimiento')
            if (motionCleanup) {
              motionCleanup()
            }
          }, 30000) // 30 segundos en lugar de 10
        } else {
          setStatus('error')
        }
      } catch (error) {
        console.error('Error enviando evento:', error)
        setStatus('error')
      }
    }

    sendEvent()

    // Limpiar al desmontar
    return () => {
      if (motionCleanup) {
        motionCleanup()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center">
        {status === 'loading' && (
          <div className="animate-pulse">
            <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full mx-auto mb-4 animate-spin" />
            <p className="text-sm opacity-70">Conectando...</p>
          </div>
        )}

        {status === 'sent' && (
          <div className="animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-full h-full text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm opacity-70">Conectado</p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <p className="text-sm opacity-70">Error de conexión</p>
          </div>
        )}

        {status === 'needs-permission' && motionPermissionNeeded && (
          <div className="animate-fade-in">
            <p className="text-sm opacity-70 mb-4">Permiso necesario para movimiento</p>
            <button
              onClick={async () => {
                try {
                  const permission = await (DeviceMotionEvent as any).requestPermission()
                  if (permission === 'granted') {
                    setMotionPermissionNeeded(false)
                    setStatus('loading')
                    // Reiniciar captura
                    window.location.reload()
                  }
                } catch (error) {
                  console.error('Error:', error)
                }
              }}
              className="px-4 py-2 bg-white text-black rounded text-sm"
            >
              Permitir movimiento
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
