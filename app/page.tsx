/**
 * Página raíz
 *
 * Redirige a /installacion por defecto.
 * En producción, esta podría ser una página de bienvenida
 * o directamente la vista de instalación.
 */

import { redirect } from 'next/navigation'

// Forzar que esta página sea dinámica (para evitar pre-rendering)
export const dynamic = 'force-dynamic'

export default function Home() {
  redirect('/installacion')
}
