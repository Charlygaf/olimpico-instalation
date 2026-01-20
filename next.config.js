/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración mínima para instalación artística
  // Sin optimizaciones agresivas que interfieran con la experiencia visual

  // Asegurar que las rutas API funcionen correctamente
  experimental: {
    // Permitir streaming responses
  },
}

module.exports = nextConfig
