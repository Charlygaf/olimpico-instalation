/**
 * API Route: GET /api/stream
 *
 * Server-Sent Events (SSE) para comunicación en tiempo real
 *
 * Decisión técnica: Elegimos SSE sobre WebSockets porque:
 * 1. Es más simple - no requiere dependencias externas
 * 2. Next.js lo soporta nativamente
 * 3. El flujo es principalmente unidireccional (servidor → cliente)
 * 4. Reconección automática en caso de pérdida de conexión
 * 5. Menor overhead que WebSockets para este caso de uso
 *
 * La vista /installacion se conecta aquí y recibe actualizaciones
 * cada vez que cambia el estado de la instalación.
 */

import { NextRequest } from 'next/server'
import { eventStore } from '@/lib/eventStore'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Crear stream SSE
  const stream = new ReadableStream({
    start(controller) {
      // Función para enviar datos al cliente
      const send = (data: object) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(new TextEncoder().encode(message))
      }

      // Suscribirse a cambios en el event store
      const unsubscribe = eventStore.subscribe((state) => {
        // Calcular movimiento promedio
        const avgMotion = state.motionCount > 0
          ? state.totalMotion / state.motionCount
          : 0

        // Enviar estado completo cada vez que cambia
        const stateData = {
          activeUsers: state.activeUsers,
          languages: Array.from(state.languages),
          averageHour: state.averageHour,
          averageMotion: avgMotion,
        }

        console.log('[SSE Stream] Enviando estado:', stateData)

        send({
          type: 'state',
          data: stateData,
        })
      })

      // Enviar evento inicial de conexión
      send({ type: 'connected' })

      // Mantener conexión viva con ping cada 30 segundos
      const pingInterval = setInterval(() => {
        try {
          send({ type: 'ping' })
        } catch (error) {
          clearInterval(pingInterval)
          unsubscribe()
          controller.close()
        }
      }, 30000)

      // Limpiar al cerrar conexión
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        unsubscribe()
        controller.close()
      })
    },
  })

  // Retornar respuesta SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // CORS para permitir conexiones desde diferentes orígenes si es necesario
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    },
  })
}
