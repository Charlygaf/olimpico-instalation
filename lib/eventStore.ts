/**
 * Event Store - Sistema de eventos en memoria
 *
 * Este módulo gestiona el estado efímero de la instalación.
 * Los datos existen solo mientras la aplicación está activa.
 * No hay persistencia, no hay base de datos.
 *
 * Decisión técnica: Usamos un patrón singleton simple
 * porque necesitamos compartir estado entre rutas API y componentes.
 * En producción, esto podría escalarse con Redis o similar,
 * pero para la instalación artística, la simplicidad es clave.
 */

export interface DeviceEvent {
  id: string // ID único del evento
  language: string
  hour: number // 0-23
  deviceType: 'mobile' | 'tablet' | 'desktop'
  motion?: number // Valor normalizado 0-1
  timestamp: number // Para expiración automática
}

export interface InstallationState {
  activeUsers: number
  events: DeviceEvent[]
  languages: Set<string>
  averageHour: number
  totalMotion: number
  motionCount: number
}

class EventStore {
  private state: InstallationState = {
    activeUsers: 0,
    events: [],
    languages: new Set(),
    averageHour: new Date().getHours(),
    totalMotion: 0,
    motionCount: 0,
  }

  private subscribers: Set<(state: InstallationState) => void> = new Set()

  // Tiempo de vida de un evento (configurable via env, default 5 minutos)
  private EVENT_TTL = parseInt(process.env.EVENT_TTL || '300000', 10)

  /**
   * Agrega un nuevo evento del dispositivo
   * Actualiza el estado agregregado de la instalación
   */
  addEvent(event: Omit<DeviceEvent, 'id' | 'timestamp'>): void {
    const fullEvent: DeviceEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    // Agregar evento
    this.state.events.push(fullEvent)

    // Actualizar estado agregregado
    this.state.languages.add(fullEvent.language)

    // Calcular promedio de hora (ponderado por cantidad de eventos)
    const totalHours = this.state.events.reduce((sum, e) => sum + e.hour, 0)
    this.state.averageHour = totalHours / this.state.events.length

    // Actualizar movimiento
    if (fullEvent.motion !== undefined) {
      this.state.totalMotion += fullEvent.motion
      this.state.motionCount++
    }

    // Actualizar usuarios activos ANTES de limpiar (eventos de los últimos 2 minutos)
    // Contamos eventos únicos por combinación de deviceType + language como proxy de usuario único
    // (cada escaneo de QR genera un nuevo evento, así que contamos eventos recientes)
    const now = Date.now()
    const recentEvents = this.state.events.filter(
      e => now - e.timestamp < 2 * 60 * 1000
    )
    // Contar eventos recientes como usuarios activos
    // En una instalación real, cada escaneo = un usuario
    this.state.activeUsers = recentEvents.length

    // NO limpiar eventos inmediatamente después de agregar
    // Solo limpiar en getState() cuando sea necesario
    // this.cleanExpiredEvents() // Comentado para evitar eliminar eventos recién agregados

    // Notificar a todos los suscriptores
    this.notifySubscribers()
  }

  /**
   * Obtiene el estado actual de la instalación
   * @param skipCleanup Si es true, no limpia eventos expirados (útil para notificaciones inmediatas)
   */
  getState(skipCleanup: boolean = false): InstallationState {
    // Recalcular usuarios activos primero (sin limpiar todavía)
    const now = Date.now()
    const recentEvents = this.state.events.filter(
      e => now - e.timestamp < 2 * 60 * 1000
    )
    this.state.activeUsers = recentEvents.length

    // Limpiar eventos expirados después (solo los muy viejos, > 5 min)
    // Esto no afecta el cálculo de usuarios activos que usa 2 minutos
    if (!skipCleanup) {
      this.cleanExpiredEvents()
    }

    // Retornar copia profunda del estado
    const stateCopy: InstallationState = {
      activeUsers: this.state.activeUsers,
      events: [...this.state.events], // Copia del array
      languages: new Set(this.state.languages), // Nuevo Set
      averageHour: this.state.averageHour,
      totalMotion: this.state.totalMotion,
      motionCount: this.state.motionCount,
    }

    return stateCopy
  }

  /**
   * Suscribe un callback para recibir actualizaciones
   * Retorna función para desuscribirse
   */
  subscribe(callback: (state: InstallationState) => void): () => void {
    this.subscribers.add(callback)

    // NO limpiar eventos antes de enviar el estado inicial
    // Solo calcular usuarios activos
    const now = Date.now()
    const recentEvents = this.state.events.filter(
      e => now - e.timestamp < 2 * 60 * 1000
    )
    this.state.activeUsers = recentEvents.length

    // Crear copia del estado SIN limpiar eventos todavía
    const initialState: InstallationState = {
      activeUsers: this.state.activeUsers,
      events: [...this.state.events], // Copia del array
      languages: new Set(this.state.languages), // Nuevo Set
      averageHour: this.state.averageHour,
      totalMotion: this.state.totalMotion,
      motionCount: this.state.motionCount,
    }

    callback(initialState)

    // Retornar función de desuscripción
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Notifica a todos los suscriptores del cambio de estado
   */
  private notifySubscribers(): void {
    // Calcular usuarios activos sin limpiar eventos todavía
    // (para evitar eliminar eventos recién agregados)
    const now = Date.now()
    const recentEvents = this.state.events.filter(
      e => now - e.timestamp < 2 * 60 * 1000
    )
    this.state.activeUsers = recentEvents.length

    // Obtener estado actual SIN limpiar eventos (para notificaciones inmediatas)
    // La limpieza se hará en el próximo getState() normal
    const currentState = this.getState(true) // skipCleanup = true

    this.subscribers.forEach(callback => {
      try {
        callback(currentState)
      } catch (error) {
        // Error notificando suscriptor
      }
    })
  }

  /**
   * Limpia eventos que han expirado
   * Mantiene la memoria bajo control sin perder la sensación de "vivo"
   */
  private cleanExpiredEvents(): void {
    const now = Date.now()
    const initialLength = this.state.events.length

    // Solo limpiar eventos muy viejos (> 5 minutos)
    // Los eventos de los últimos 2 minutos se usan para usuarios activos
    const filteredEvents = this.state.events.filter(
      event => now - event.timestamp < this.EVENT_TTL
    )

    // Si se eliminaron eventos, recalcular estado
    if (filteredEvents.length !== initialLength) {
      this.state.events = filteredEvents

      // Recalcular idiomas
      this.state.languages.clear()
      this.state.events.forEach(e => this.state.languages.add(e.language))

      // Recalcular promedio de hora
      if (this.state.events.length > 0) {
        const totalHours = this.state.events.reduce((sum, e) => sum + e.hour, 0)
        this.state.averageHour = totalHours / this.state.events.length
      } else {
        // Si no hay eventos, resetear a hora actual
        this.state.averageHour = new Date().getHours()
      }

      // Recalcular movimiento
      const motionEvents = this.state.events.filter(e => e.motion !== undefined)
      this.state.totalMotion = motionEvents.reduce((sum, e) => sum + (e.motion || 0), 0)
      this.state.motionCount = motionEvents.length
    } else {
      // No se eliminaron eventos, mantener el array original
      this.state.events = filteredEvents
    }
  }

  /**
   * Resetea el estado (útil para reiniciar la instalación)
   */
  reset(): void {
    this.state = {
      activeUsers: 0,
      events: [],
      languages: new Set(),
      averageHour: new Date().getHours(),
      totalMotion: 0,
      motionCount: 0,
    }
    this.notifySubscribers()
  }
}

// Singleton - una sola instancia compartida
export const eventStore = new EventStore()
