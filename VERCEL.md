# Despliegue en Vercel

## Configuración Rápida

### 1. Preparar el proyecto

```bash
# Asegúrate de que todo esté commiteado
git add .
git commit -m "Preparado para Vercel"
```

### 2. Conectar con Vercel

**Opción A: Desde la CLI**
```bash
# Instalar Vercel CLI (si no lo tienes)
npm i -g vercel

# Desplegar
vercel

# Seguir las instrucciones:
# - ¿Quieres modificar la configuración? No
# - ¿Qué proyecto? Crear nuevo
# - ¿Qué directorio? ./
```

**Opción B: Desde el Dashboard**
1. Ve a https://vercel.com
2. Conecta tu repositorio de GitHub/GitLab/Bitbucket
3. Vercel detectará automáticamente Next.js
4. Click en "Deploy"

### 3. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel, ve a:
**Settings → Environment Variables**

Agrega estas variables (opcionales, tienen valores por defecto):

```
NEXT_PUBLIC_BASE_URL=https://tu-proyecto.vercel.app
EVENT_TTL=300000
MOTION_THRESHOLD=0.05
NEXT_PUBLIC_OLIMPICO_BASE_SCALE=0.6
NEXT_PUBLIC_OLIMPICO_MAX_SCALE=1.2
```

**Nota**: `NEXT_PUBLIC_BASE_URL` se configura automáticamente en Vercel, pero puedes sobrescribirlo si necesitas un dominio personalizado.

### 4. Generar QR para Producción

Una vez desplegado, obtén la URL de producción (ej: `https://olimpico-instalacion.vercel.app`) y genera el QR:

```bash
# Opción 1: Usar el script (actualiza la URL manualmente)
NEXT_PUBLIC_BASE_URL=https://tu-proyecto.vercel.app npm run qr

# Opción 2: Generar manualmente
# Ve a https://www.qr-code-generator.com/
# URL: https://tu-proyecto.vercel.app/scan
```

## Configuración Avanzada

### Dominio Personalizado

1. En Vercel Dashboard → Settings → Domains
2. Agrega tu dominio
3. Sigue las instrucciones de DNS
4. Actualiza `NEXT_PUBLIC_BASE_URL` con tu dominio

### Regiones

Por defecto se usa `iad1` (US East). Para cambiar:

1. Edita `vercel.json`
2. Cambia `regions` a la región más cercana:
   - `iad1` - US East (Virginia)
   - `sfo1` - US West (San Francisco)
   - `syd1` - Asia Pacific (Sydney)
   - `hnd1` - Asia Pacific (Tokyo)
   - `fra1` - Europe (Frankfurt)
   - `ams1` - Europe (Amsterdam)

### Variables de Entorno por Entorno

Puedes configurar variables diferentes para:
- **Production**: Variables para producción
- **Preview**: Variables para preview deployments (PRs)
- **Development**: Variables para `vercel dev`

## Troubleshooting

### El movimiento no funciona en producción

- Verifica que estés usando HTTPS (Vercel lo proporciona automáticamente)
- Revisa los logs en Vercel Dashboard → Functions
- Verifica que `NEXT_PUBLIC_BASE_URL` esté configurada correctamente

### Los eventos no se sincronizan

- Verifica que SSE esté funcionando (revisa Network tab en DevTools)
- Los eventos tienen un TTL de 5 minutos por defecto
- En producción, considera usar Redis para estado compartido si necesitas escalar

### CORS Errors

- Vercel maneja CORS automáticamente para el mismo dominio
- Si usas un dominio personalizado, asegúrate de configurarlo correctamente

## Monitoreo

Vercel proporciona:
- **Analytics**: Tráfico y rendimiento
- **Logs**: Errores y eventos en tiempo real
- **Functions**: Métricas de las API routes

Accede desde el Dashboard de Vercel.
