# Cómo Usar la Instalación Localmente

## Paso a Paso Rápido

### 1. Iniciar el servidor

```bash
npm install  # Solo la primera vez
npm run dev
```

Verás algo como:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
```

### 2. Encontrar tu IP local

**En macOS (tu caso):**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

O simplemente ejecuta:
```bash
npm run qr
```

Esto te mostrará automáticamente tu IP y generará el QR.

**Ejemplo de IP:** `192.168.1.5` (la tuya puede ser diferente)

### 3. Configurar las vistas

#### Vista de Proyección (en tu PC)
1. Abre en el navegador: `http://localhost:3000/installacion`
2. Presiona F11 para pantalla completa
3. Deja esta ventana abierta

#### Vista de Escaneo (para móviles)
1. **IMPORTANTE**: Tu móvil debe estar en la **misma red WiFi** que tu PC
2. Genera el QR con tu IP:
   ```bash
   npm run qr
   ```

   O manualmente:
   - URL: `http://192.168.1.5:3000/scan` (reemplaza con tu IP)
   - Genera QR en: https://www.qr-code-generator.com/

3. Escanea el QR con tu móvil
4. La página se cargará automáticamente y enviará datos

### 4. Ver la magia ✨

Cuando escanees el QR desde tu móvil:
- El móvil enviará datos automáticamente
- La proyección en tu PC se actualizará en tiempo real
- El Olímpico cambiará según los datos recibidos

## Troubleshooting

### "No puedo acceder desde el móvil"

1. **Verifica que estén en la misma WiFi**
   - PC y móvil deben estar en la misma red
   - No uses datos móviles en el teléfono

2. **Verifica el firewall**
   - En macOS: Sistema → Seguridad → Firewall
   - Permite conexiones entrantes para Node.js

3. **Verifica la IP**
   - Ejecuta `npm run qr` para ver tu IP actual
   - Asegúrate de usar la IP correcta en el QR

### "El QR no funciona"

- Verifica que el servidor esté corriendo (`npm run dev`)
- Verifica que la URL en el QR sea correcta (debe incluir `http://` y el puerto `:3000`)
- Prueba abrir la URL manualmente en el navegador del móvil

### "La proyección no se actualiza"

- Verifica que `/installacion` esté abierta
- Revisa la consola del navegador (F12) para ver errores
- Verifica que el indicador de conexión (en desarrollo) esté verde

## Ejemplo Completo

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Generar QR
npm run qr
# Te mostrará: http://192.168.1.5:3000/scan

# Luego:
# 1. Abre http://localhost:3000/installacion en tu PC
# 2. Escanea el QR con tu móvil
# 3. ¡Listo! 🎉
```

## Tips

- **Para probar múltiples usuarios**: Abre `/scan` en varias pestañas del móvil o pide a amigos que escaneen
- **Para ver datos en tiempo real**: En desarrollo, verás indicadores en `/installacion`
- **Para resetear**: Reinicia el servidor (`Ctrl+C` y `npm run dev` de nuevo)
