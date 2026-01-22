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

      onMotion(motionValue)
    }
  }

  if (typeof DeviceMotionEvent !== 'undefined') {
    // iOS 13+ requiere permiso explícito
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {

      let listenerAdded = false
      const addListener = () => {
        if (listenerAdded) return
        listenerAdded = true
        window.addEventListener('devicemotion', handleMotion as EventListener, true)
      }

      // Intentar solicitar permiso (puede fallar si no es desde un gesto)
      try {
        (DeviceMotionEvent as any).requestPermission()
          .then((permission: string) => {
            if (permission === 'granted') {
              addListener()
            } else {
              // Intentar agregar listener de todas formas (algunos navegadores lo permiten)
              addListener()
            }
          })
          .catch(() => {
            // Intentar agregar listener de todas formas
            addListener()
          })
      } catch {
        addListener()
      }

      return () => {
        if (listenerAdded) {
          window.removeEventListener('devicemotion', handleMotion as EventListener, true)
        }
      }
    } else {
      // Android y otros navegadores - no requieren permiso
      window.addEventListener('devicemotion', handleMotion as EventListener, true)

      return () => {
        window.removeEventListener('devicemotion', handleMotion as EventListener, true)
      }
    }
  } else {
    return () => {}
  }
}
