import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OLÍMPICO — Instalación',
  description: 'Instalación web interactiva de Olímpico Estudio',
  // Sin viewport restrictions para permitir proyección flexible
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
