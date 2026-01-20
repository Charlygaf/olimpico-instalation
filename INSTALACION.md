# Guía de Instalación y Uso

## Preparación para la Muestra

### 1. Instalación Local

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### 2. Configuración de Vistas

- **Vista de Proyección**: Abrir `http://localhost:3000/installacion` en el navegador del dispositivo de proyección
  - Configurar el navegador en modo pantalla completa (F11)
  - Asegurar que el navegador no entre en modo sleep
  - Verificar que la conexión SSE se mantenga activa (indicador verde en desarrollo)

- **Vista de Escaneo**: Generar un QR que apunte a `http://TU-IP-LOCAL:3000/scan`

  **⚠️ IMPORTANTE**: Tu móvil necesita estar en la **misma red WiFi** que tu PC.

  **Obtener tu IP local:**
  - **macOS/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
  - **Windows**: `ipconfig` (buscar "IPv4 Address" en la sección de tu WiFi)

  **Generar QR automáticamente:**
  ```bash
  npm run qr
  ```

  Esto detectará tu IP automáticamente y generará el QR en la terminal.

  **O generar QR manualmente:**
  - Usar un generador online: https://www.qr-code-generator.com/
  - O instalar `qrcode`: `npm install -g qrcode && qrcode "http://TU-IP:3000/scan" -o qr.png`

### 3. Generar QR Code

#### Opción A: Usando herramienta online
1. Ir a https://www.qr-code-generator.com/ o similar
2. Ingresar URL: `http://TU-IP:3000/scan`
3. Descargar e imprimir el QR

#### Opción B: Usando Node.js
```bash
npm install -g qrcode
qrcode "http://TU-IP:3000/scan" -o qr-scan.png
```

### 4. Pruebas Pre-Muestra

1. **Proyección**: Verificar que `/installacion` se renderice correctamente
2. **Escaneo**: Probar `/scan` desde un dispositivo móvil
3. **Sincronización**: Verificar que los eventos desde `/scan` afecten `/installacion`
4. **Movimiento**: Probar captura de movimiento moviendo el dispositivo
5. **Múltiples usuarios**: Simular múltiples escaneos simultáneos

### 5. Ajustes Visuales (Opcional)

Si necesitas ajustar el renderizado del Olímpico, editar:
- `components/Olimpico.tsx` - Lógica de renderizado y mapping visual
- `lib/eventStore.ts` - TTL de eventos y cálculo de estado agregado

### 6. Despliegue en Producción

Para una muestra pública, considerar:

1. **Plataforma de hosting**:
   - Vercel (recomendado para Next.js)
   - Railway
   - Render
   - Cualquier plataforma que soporte SSE

2. **Configuración**:
   - Actualizar URL del QR con el dominio público
   - Configurar CORS si es necesario
   - Ajustar TTL de eventos según duración de la muestra

3. **Monitoreo**:
   - En desarrollo, los indicadores de debug muestran estado
   - En producción, estos se ocultan automáticamente

## Notas Técnicas

### Comunicación en Tiempo Real

El sistema usa Server-Sent Events (SSE) para comunicación unidireccional:
- `/installacion` se conecta a `/api/stream`
- `/scan` envía eventos a `/api/events`
- El estado se mantiene en memoria (sin base de datos)

### Estado Efímero

- Los eventos expiran después de 5 minutos
- Los usuarios activos se calculan sobre eventos de los últimos 2 minutos
- No hay persistencia - el estado se resetea al reiniciar el servidor

### Captura de Datos

Los datos capturados son:
- `language`: Idioma del navegador (`navigator.language`)
- `hour`: Hora local del dispositivo (0-23)
- `deviceType`: mobile / tablet / desktop (basado en viewport y user agent)
- `motion`: Movimiento del dispositivo (opcional, requiere permisos)

## Troubleshooting

### La proyección no se actualiza
- Verificar conexión SSE (indicador en desarrollo)
- Revisar consola del navegador para errores
- Verificar que el servidor esté corriendo

### Los eventos no se registran
- Verificar que `/api/events` esté accesible
- Revisar consola del navegador en `/scan`
- Verificar CORS si están en diferentes dominios

### El movimiento no se captura
- Algunos navegadores requieren HTTPS para DeviceMotionEvent
- Verificar permisos del navegador
- Probar en diferentes dispositivos

## Extensión de la Obra

Para extender la instalación:

1. **Nuevos datos**: Agregar campos en `DeviceEvent` y `deviceDetector.ts`
2. **Nuevos mappings**: Modificar `Olimpico.tsx` para responder a nuevos datos
3. **Nuevas vistas**: Crear nuevas rutas en `app/`
4. **Nuevos efectos**: Agregar lógica visual en el componente de renderizado

El código está comentado para facilitar la comprensión y extensión.
