# Túnel HTTPS para DeviceMotionEvent

## Problema

Muchos navegadores móviles (especialmente iOS) requieren **HTTPS** para acceder a DeviceMotionEvent (acelerómetro/giroscopio). Como estás usando `http://` localmente, el movimiento no se captura.

## Solución: Túnel HTTPS

Usa un túnel HTTPS para exponer tu servidor local con HTTPS.

### Opción 1: localtunnel (Recomendado - No requiere registro)

```bash
npm run tunnel
```

Esto iniciará un túnel y te mostrará una URL HTTPS como:
```
https://random-name.loca.lt
```

**Pasos:**
1. Ejecuta `npm run tunnel` en una terminal separada
2. Copia la URL HTTPS que aparece
3. Genera un nuevo QR con: `npm run qr` (pero primero actualiza el script para usar la URL del túnel)
4. O manualmente genera un QR apuntando a: `https://TU-URL-DEL-TUNEL/scan`

### Opción 2: ngrok (Requiere cuenta gratuita)

1. Instala ngrok: https://ngrok.com/download
2. Regístrate y obtén tu token de autenticación
3. Ejecuta: `ngrok http 3000`
4. Usa la URL HTTPS que aparece (ej: `https://abc123.ngrok.io`)

### Opción 3: cloudflared (Alternativa)

```bash
npx -y cloudflared tunnel --url http://localhost:3000
```

## Uso

1. **Terminal 1**: Ejecuta `npm run dev` (servidor Next.js)
2. **Terminal 2**: Ejecuta `npm run tunnel` (túnel HTTPS)
3. **Terminal 3**: Genera QR con la URL HTTPS del túnel

## Nota

- Mantén el túnel corriendo mientras uses la instalación
- La URL del túnel cambia cada vez que lo inicias (a menos que uses ngrok con cuenta)
- Algunos túneles pueden mostrar una página de advertencia la primera vez - solo acepta y continúa
