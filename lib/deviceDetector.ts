/**
 * Device Detector - Captura de datos del dispositivo
 *
 * Extrae información del dispositivo sin fricción:
 * - Idioma del navegador
 * - Hora local
 * - Tipo de dispositivo
 * - Movimiento (si está disponible)
 *
 * Decisión estética: No pedimos permisos explícitos.
 * La interacción debe sentirse natural, casi imperceptible.
 */

export interface DeviceData {
  language: string
  hour: number
  deviceType: 'mobile' | 'tablet' | 'desktop'
  motion?: number
}

/**
 * Detecta el tipo de dispositivo basado en el user agent y viewport
 */
function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  const userAgent = navigator.userAgent.toLowerCase()

  // Mobile: ancho pequeño o user agent móvil
  if (width < 768 || /mobile|android|iphone|ipod/.test(userAgent)) {
    return 'mobile'
  }

  // Tablet: ancho medio
  if (width < 1024 || /ipad|tablet/.test(userAgent)) {
    return 'tablet'
  }

  // Desktop por defecto
  return 'desktop'
}

/**
 * Captura datos del dispositivo de forma no invasiva
 */
export function captureDeviceData(): DeviceData {
  const now = new Date()

  return {
    language: navigator.language || 'es',
    hour: now.getHours(),
    deviceType: detectDeviceType(),
  }
}

/**
 * Inicializa captura de movimiento (gyroscope/accelerometer)
 * Retorna una función para limpiar los listeners
 *
 * Basado en: https://stackoverflow.com/questions/4378435/how-to-access-accelerometer-gyroscope-data-from-javascript
 *
 * Decisión técnica: Usamos DeviceMotionEvent para aceleración.
 * El movimiento se calcula usando accelerationIncludingGravity y se normaliza a 0-1.
 */
export function initMotionCapture(
  onMotion: (value: number) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  let lastUpdate = Date.now()
  let motionValue = 0
  let lastAccel = { x: 0, y: 0, z: 0 }

  const handleMotion = (event: DeviceMotionEvent) => {
    const now = Date.now()

    // Throttle: actualizar máximo cada 100ms
    if (now - lastUpdate < 100) return
    lastUpdate = now

    // Usar accelerationIncludingGravity (más confiable según Stack Overflow)
    const accel = event.accelerationIncludingGravity
    if (accel && accel.x !== null && accel.y !== null && accel.z !== null) {
      // Si es la primera lectura, inicializar lastAccel
      if (lastAccel.x === 0 && lastAccel.y === 0 && lastAccel.z === 0) {
        lastAccel = { x: accel.x, y: accel.y, z: accel.z }
        console.log('[Motion] Primera lectura:', { x: accel.x.toFixed(2), y: accel.y.toFixed(2), z: accel.z.toFixed(2) })
        return // No calcular movimiento en la primera lectura
      }

      // Calcular cambio en aceleración (delta desde la última lectura)
      const deltaX = Math.abs(accel.x - lastAccel.x)
      const deltaY = Math.abs(accel.y - lastAccel.y)
      const deltaZ = Math.abs(accel.z - lastAccel.z)

      // Magnitud del cambio (movimiento relativo)
      const deltaMagnitude = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2)

      // Normalizar: cambios pequeños (< 0.3 m/s²) = movimiento sutil
      // cambios grandes (> 1.5 m/s²) = movimiento fuerte
      // Usar umbral más bajo para detectar movimiento más fácilmente
      const normalized = Math.min(deltaMagnitude / 1.5, 1)

      // Suavizar menos para respuesta más rápida
      motionValue = motionValue * 0.3 + normalized * 0.7

      // Guardar valores actuales para la próxima comparación
      lastAccel = { x: accel.x, y: accel.y, z: accel.z }

      // Log cuando hay movimiento significativo
      if (motionValue > 0.05) {
        console.log('[Motion] ✅ Movimiento detectado:', {
          deltaMagnitude: deltaMagnitude.toFixed(3),
          normalized: normalized.toFixed(3),
          motionValue: motionValue.toFixed(3),
          accel: { x: accel.x.toFixed(2), y: accel.y.toFixed(2), z: accel.z.toFixed(2) },
        })
      }

      onMotion(motionValue)
    } else {
      console.warn('[Motion] ⚠️ Datos de aceleración inválidos:', accel)
    }
  }

  // Verificar disponibilidad de DeviceMotionEvent
  console.log('[Motion] Verificando DeviceMotionEvent...')
  console.log('[Motion] DeviceMotionEvent disponible:', typeof DeviceMotionEvent !== 'undefined')
  console.log('[Motion] requestPermission disponible:', typeof (DeviceMotionEvent as any)?.requestPermission === 'function')
  console.log('[Motion] Protocolo:', typeof window !== 'undefined' ? window.location.protocol : 'N/A')
  console.log('[Motion] HTTPS:', typeof window !== 'undefined' ? window.location.protocol === 'https:' : false)

  if (typeof DeviceMotionEvent !== 'undefined') {
    // iOS 13+ requiere permiso explícito
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      console.log('[Motion] iOS detectado - DeviceMotionEvent.requestPermission disponible')
      console.log('[Motion] ⚠️ En iOS, requestPermission debe llamarse desde un gesto del usuario')

      let listenerAdded = false
      const addListener = () => {
        if (listenerAdded) return
        listenerAdded = true
        window.addEventListener('devicemotion', handleMotion as EventListener, true)
        console.log('[Motion] ✅ Listener agregado')
      }

      // Intentar solicitar permiso (puede fallar si no es desde un gesto)
      try {
        (DeviceMotionEvent as any).requestPermission()
          .then((permission: string) => {
            console.log('[Motion] Permiso recibido:', permission)
            if (permission === 'granted') {
              addListener()
            } else {
              console.warn('[Motion] ❌ Permiso denegado, intentando de todas formas...')
              // Intentar agregar listener de todas formas (algunos navegadores lo permiten)
              addListener()
            }
          })
          .catch((error: Error) => {
            console.error('[Motion] Error solicitando permiso:', error)
            console.warn('[Motion] Intentando agregar listener de todas formas...')
            // Intentar agregar listener de todas formas
            addListener()
          })
      } catch (error) {
        console.error('[Motion] Error al llamar requestPermission:', error)
        console.warn('[Motion] Intentando agregar listener de todas formas...')
        addListener()
      }

      return () => {
        if (listenerAdded) {
          window.removeEventListener('devicemotion', handleMotion as EventListener, true)
          console.log('[Motion] Listener removido')
        }
      }
    } else {
      // Android y otros navegadores - no requieren permiso
      console.log('[Motion] Iniciando captura (sin permiso requerido - Android/Desktop)')
      window.addEventListener('devicemotion', handleMotion as EventListener, true)
      console.log('[Motion] ✅ Listener agregado')

      // Verificar después de un momento si el evento se está disparando
      setTimeout(() => {
        if (motionValue === 0 && lastAccel.x === 0 && lastAccel.y === 0 && lastAccel.z === 0) {
          console.warn('[Motion] ⚠️ No se recibieron eventos después de 2 segundos')
          console.warn('[Motion] Posibles causas:')
          console.warn('  - Navegador requiere HTTPS (actualmente:', window.location.protocol, ')')
          console.warn('  - Dispositivo no tiene acelerómetro')
          console.warn('  - Permisos bloqueados en configuración del navegador')
        } else {
          console.log('[Motion] ✅ Eventos recibidos correctamente')
        }
      }, 2000)

      return () => {
        window.removeEventListener('devicemotion', handleMotion as EventListener, true)
        console.log('[Motion] Listener removido')
      }
    }
  } else {
    console.warn('[Motion] ⚠️ DeviceMotionEvent no disponible en este navegador')
    return () => {}
  }
}
