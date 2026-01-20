/**
 * API Route: POST /api/events
 *
 * Endpoint para recibir eventos desde /scan
 *
 * Decisión técnica: Usamos POST porque estamos creando un evento.
 * No hay autenticación ni validación estricta porque la obra
 * prioriza la fluidez sobre la seguridad (no hay datos sensibles).
 */

import { NextRequest, NextResponse } from 'next/server'
import { eventStore } from '@/lib/eventStore'

// Forzar que esta ruta sea dinámica (no pre-renderizada)
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validación mínima de estructura
    if (
      typeof body.language !== 'string' ||
      typeof body.hour !== 'number' ||
      !['mobile', 'tablet', 'desktop'].includes(body.deviceType)
    ) {
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 400 }
      )
    }

    // Agregar evento al store
    eventStore.addEvent({
      language: body.language,
      hour: body.hour,
      deviceType: body.deviceType,
      motion: body.motion,
    })

    console.log('[API Events] Evento recibido:', {
      language: body.language,
      hour: body.hour,
      deviceType: body.deviceType,
      motion: body.motion,
    })

    // Respuesta mínima - el evento ya está procesado
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error procesando evento:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
