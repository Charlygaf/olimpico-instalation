#!/usr/bin/env node

/**
 * Script para generar QR automáticamente
 * Detecta la IP local y genera un QR que apunta a /scan
 */

const os = require('os')
const { execSync } = require('child_process')

// Obtener IP local
function getLocalIP() {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar loopback y IPv6
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }

  return 'localhost'
}

// Usar variable de entorno si está disponible, sino usar IP local
const baseURL = process.env.NEXT_PUBLIC_BASE_URL || `http://${getLocalIP()}:${process.env.PORT || 3000}`
const scanURL = `${baseURL}/scan`

console.log('🔗 URL para escanear:', scanURL)
console.log('')
console.log('📱 Generando QR code...')
console.log('')

// Intentar usar qrcode-cli si está instalado
try {
  execSync(`npx -y qrcode "${scanURL}"`, { stdio: 'inherit' })
  console.log('')
  console.log('✅ QR generado en la terminal')
  console.log('')
  console.log('💡 Para guardar como imagen:')
  console.log(`   npx -y qrcode "${scanURL}" -o qr-scan.png`)
} catch (error) {
  console.log('⚠️  No se pudo generar QR automáticamente')
  console.log('')
  console.log('📋 Opciones:')
  console.log('')
  console.log('1. Instalar qrcode y generar:')
  console.log(`   npm install -g qrcode`)
  console.log(`   qrcode "${scanURL}" -o qr-scan.png`)
  console.log('')
  console.log('2. Usar generador online:')
  console.log(`   Copia esta URL: ${scanURL}`)
  console.log('   Ve a: https://www.qr-code-generator.com/')
  console.log('')
  console.log('3. Usar API de Google Charts:')
  console.log(`   https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(scanURL)}`)
}
