import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Phone Connection App',
  description: 'Connect your phone via QR code',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
