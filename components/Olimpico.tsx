/**
 * Componente: Olimpico
 *
 * Renderizado abstracto del Olímpico como arquitectura digital viva.
 *
 * Decisión estética: No es una ilustración literal.
 * Es una construcción modular por capas que se transforma
 * según el estado de la instalación.
 *
 * El Olímpico está compuesto por:
 * - Capa base (pan inferior)
 * - Capas intermedias (carne, queso, lechuga, tomate)
 * - Capa superior (pan superior)
 *
 * Cada capa responde a diferentes aspectos del estado:
 * - Escala general → cantidad de usuarios
 * - Colores → idiomas detectados
 * - Modo día/noche → hora promedio
 * - Pulsación → movimiento promedio
 */

'use client'

import { useEffect, useRef } from 'react'

interface OlimpicoProps {
  activeUsers: number
  languages: string[]
  averageHour: number
  averageMotion: number
}

export default function Olimpico({
  activeUsers,
  languages,
  averageHour,
  averageMotion,
}: OlimpicoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ajustar tamaño del canvas al viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Función de renderizado
    const render = () => {
      const { width, height } = canvas

      // Limpiar canvas
      ctx.clearRect(0, 0, width, height)

      // Calcular transformaciones basadas en el estado

      // Escala: configurable via env, default 0.6 a 1.2 según usuarios activos
      const baseScale = parseFloat(process.env.NEXT_PUBLIC_OLIMPICO_BASE_SCALE || '0.6')
      const maxScale = parseFloat(process.env.NEXT_PUBLIC_OLIMPICO_MAX_SCALE || '1.2')
      const scaleRange = maxScale - baseScale
      // Mínimo 0 usuarios = escala mínima, con usuarios escala hasta máximo
      const userScale = Math.max(baseScale, Math.min(baseScale + (activeUsers / 10) * scaleRange, maxScale))


      // Modo día/noche: 0 = noche (6am), 1 = día (6pm)
      const dayNight = (() => {
        const normalizedHour = (averageHour + 6) % 24
        if (normalizedHour < 12) {
          return normalizedHour / 12 // 0 → 1 (noche → día)
        } else {
          return 1 - (normalizedHour - 12) / 12 // 1 → 0 (día → noche)
        }
      })()

      // Pulsación basada en movimiento (más visible)
      // Usar movimiento promedio para intensificar la pulsación
      // Si hay movimiento, hacerlo más visible; si no, mantener pulsación base sutil
      const hasMotion = averageMotion > 0.01
      const pulseIntensity = hasMotion
        ? Math.min(averageMotion * 3, 1) // Escalar movimiento más agresivamente
        : 0.1 // Pulsación base sutil incluso sin movimiento

      const pulse = 1 + Math.sin(Date.now() / 800) * pulseIntensity * 0.2 // Pulsación más visible (0.8 a 1.2)

      // También agregar rotación sutil basada en movimiento
      const rotation = averageMotion * 8 // Rotación de hasta 8 grados (más visible)

      // Agregar efecto de "respiración" más pronunciado cuando hay movimiento
      const breathing = hasMotion
        ? Math.sin(Date.now() / 1200) * averageMotion * 0.1
        : 0

      // Mapeo de idiomas a colores
      // Cada idioma aporta un matiz diferente
      const languageHue = languages.length > 0
        ? languages.reduce((sum, lang) => {
            // Hash simple del código de idioma a un hue
            const hash = lang.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
            return sum + (hash % 360)
          }, 0) / languages.length
        : 30 // Color por defecto (naranja/amarillo)

      // Centro del canvas
      const centerX = width / 2
      const centerY = height / 2

      // Dimensiones base del Olímpico
      const baseWidth = Math.min(width, height) * 0.4
      const baseHeight = baseWidth * 0.6

      // Aplicar transformaciones globales
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate((rotation * Math.PI) / 180) // Rotación sutil
      ctx.scale(userScale * pulse * (1 + breathing), userScale * pulse * (1 + breathing))

      // Configurar sombra sutil (modo día/noche)
      ctx.shadowColor = `rgba(0, 0, 0, ${0.2 * (1 - dayNight)})`
      ctx.shadowBlur = 20
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 10

      // Fondo sutil (modo día/noche)
      const bgAlpha = dayNight * 0.1
      ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`
      ctx.fillRect(-width / 2, -height / 2, width, height)

      // Capa 1: Pan inferior (base)
      const panBottomY = baseHeight * 0.3
      ctx.fillStyle = `hsl(${languageHue}, 40%, ${85 - dayNight * 10}%)`
      drawRoundedRect(ctx, -baseWidth / 2, panBottomY, baseWidth, baseHeight * 0.15, 8)

      // Capa 2: Carne
      const carneY = panBottomY - baseHeight * 0.12
      ctx.fillStyle = `hsl(${(languageHue + 20) % 360}, 60%, ${40 - dayNight * 5}%)`
      drawRoundedRect(ctx, -baseWidth / 2 * 0.95, carneY, baseWidth * 0.95, baseHeight * 0.12, 6)

      // Capa 3: Queso
      const quesoY = carneY - baseHeight * 0.1
      ctx.fillStyle = `hsla(${(languageHue + 40) % 360}, 70%, ${60 - dayNight * 10}%, 0.8)`
      drawRoundedRect(ctx, -baseWidth / 2 * 0.9, quesoY, baseWidth * 0.9, baseHeight * 0.08, 5)

      // Capa 4: Lechuga (textura)
      const lechugaY = quesoY - baseHeight * 0.08
      ctx.fillStyle = `hsl(${(languageHue + 100) % 360}, 50%, ${70 - dayNight * 5}%)`
      drawRoundedRect(ctx, -baseWidth / 2 * 0.85, lechugaY, baseWidth * 0.85, baseHeight * 0.1, 4)
      // Textura de lechuga (líneas)
      ctx.strokeStyle = `hsla(${(languageHue + 100) % 360}, 50%, ${60 - dayNight * 5}%, 0.5)`
      ctx.lineWidth = 1
      for (let i = 0; i < 5; i++) {
        const x = -baseWidth / 2 * 0.85 + (baseWidth * 0.85 / 6) * (i + 1)
        ctx.beginPath()
        ctx.moveTo(x, lechugaY)
        ctx.lineTo(x, lechugaY + baseHeight * 0.1)
        ctx.stroke()
      }

      // Capa 5: Tomate
      const tomateY = lechugaY - baseHeight * 0.08
      ctx.fillStyle = `hsla(${(languageHue + 0) % 360}, 80%, ${55 - dayNight * 5}%, 0.9)`
      drawRoundedRect(ctx, -baseWidth / 2 * 0.8, tomateY, baseWidth * 0.8, baseHeight * 0.06, 3)

      // Capa 6: Pan superior
      const panTopY = tomateY - baseHeight * 0.1
      ctx.fillStyle = `hsl(${languageHue}, 40%, ${85 - dayNight * 10}%)`
      drawRoundedRect(ctx, -baseWidth / 2, panTopY, baseWidth, baseHeight * 0.15, 8)

      // Limpiar sombra antes de restaurar
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.restore()

      // Continuar animación
      animationFrameRef.current = requestAnimationFrame(render)
    }

    // Iniciar renderizado
    render()

    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [activeUsers, languages, averageHour, averageMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}

/**
 * Helper: Dibuja un rectángulo redondeado
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
}
