# OLÍMPICO — Instalación Web Interactiva

Instalación de arte digital interactiva para Olímpico Estudio.

## Concepto

La obra parte del Olímpico (sándwich uruguayo) como objeto cultural y lo reinterpreta como arquitectura digital viva. La instalación consiste en una plataforma física con forma de Olímpico sobre la que se proyecta una web que contiene, paradójicamente, solo un Olímpico. Al proyectarse sobre el objeto, la web "cobra cuerpo".

## Arquitectura

- **`/scan`** - Vista mobile-first accesible por QR. Captura datos del dispositivo sin fricción y emite eventos al sistema.
- **`/installacion`** - Vista proyectada sobre el objeto físico. Se mantiene conectada al stream en tiempo real y renderiza un Olímpico abstracto que reacciona dinámicamente a los eventos del público.

## Stack Técnico

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Server-Sent Events (SSE) para comunicación en tiempo real
- Sin base de datos (estado en memoria)

## Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (opcional)
cp .env.example .env.local
# Edita .env.local según tus necesidades

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar en producción
npm start
```

## Variables de Entorno

Copia `.env.example` a `.env.local` y ajusta según tu entorno:

- `NEXT_PUBLIC_BASE_URL`: URL base de la aplicación (se configura automáticamente en Vercel)
- `EVENT_TTL`: Tiempo de vida de eventos en memoria (default: 300000ms = 5 min)
- `MOTION_THRESHOLD`: Umbral mínimo para detectar movimiento (default: 0.05)
- `NEXT_PUBLIC_OLIMPICO_BASE_SCALE`: Escala base del Olímpico (default: 0.6)
- `NEXT_PUBLIC_OLIMPICO_MAX_SCALE`: Escala máxima del Olímpico (default: 1.2)

## Despliegue en Vercel

Ver [VERCEL.md](./VERCEL.md) para instrucciones detalladas de despliegue.

## Uso

1. **Vista de instalación**: Abrir `http://localhost:3000/installacion` en el dispositivo de proyección.
2. **Vista de escaneo**: Generar un QR que apunte a `http://localhost:3000/scan` (o la URL pública correspondiente).

## Mapping Visual

- **Usuarios activos** → Escala del Olímpico (0.6x - 1.2x)
- **Idiomas detectados** → Variación cromática (hue)
- **Hora promedio** → Modo día/noche (luminosidad)
- **Movimiento promedio** → Pulsación/respiración

## Decisiones Técnicas

### Server-Sent Events (SSE)

Elegimos SSE sobre WebSockets porque:
- Es más simple y no requiere dependencias externas
- Next.js lo soporta nativamente
- El flujo es principalmente unidireccional (servidor → cliente)
- Reconexión automática en caso de pérdida de conexión
- Menor overhead que WebSockets para este caso de uso

### Estado en Memoria

El estado de la instalación existe solo en memoria. Los eventos tienen un TTL de 5 minutos y se limpian automáticamente. No hay persistencia porque la obra es efímera por naturaleza.

### Captura de Movimiento

Usamos `DeviceMotionEvent` porque es más accesible que el Gyroscope API (que requiere permisos explícitos). El movimiento se normaliza a un valor 0-1 para facilitar el mapping visual.

## Estructura del Proyecto

```
/
├── app/
│   ├── api/
│   │   ├── events/      # POST endpoint para recibir eventos
│   │   └── stream/       # GET endpoint SSE para tiempo real
│   ├── installacion/    # Vista de proyección
│   ├── scan/            # Vista mobile QR
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── Olimpico.tsx     # Componente de renderizado abstracto
├── lib/
│   ├── eventStore.ts    # Sistema de eventos en memoria
│   └── deviceDetector.ts # Captura de datos del dispositivo
└── README.md
```

## Desarrollo

El proyecto está pensado para ejecutarse localmente durante la muestra. Para producción, considerar:

- Desplegar en una plataforma que soporte SSE (Vercel, Railway, etc.)
- Configurar CORS si es necesario
- Ajustar TTL de eventos según la duración de la muestra
- Optimizar para diferentes resoluciones de proyección

## Notas

Este proyecto no es una app comercial. Es una obra de arte digital interactiva. Cada decisión técnica acompaña la idea de: web → objeto → cuerpo → proyección → colectivo.
