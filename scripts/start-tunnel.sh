#!/bin/bash

# Script para iniciar túnel HTTPS con localtunnel
# Esto permite que DeviceMotionEvent funcione en móviles

echo "🚀 Iniciando túnel HTTPS para puerto 3000..."
echo ""
echo "⚠️  IMPORTANTE: Mantén esta ventana abierta mientras uses la instalación"
echo ""
echo "La URL HTTPS aparecerá abajo. Úsala para generar el QR."
echo ""

npx -y localtunnel --port 3000
