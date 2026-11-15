# 🎁 Amigo Invisible (WhatsApp sin spoilers)

Aplicación web estática en español para organizar sorteos de Amigo Invisible gratis, sin registros, sin instalar apps y sin spoilers para quien organiza.

## Cómo funciona

1. Introduce los nombres y teléfonos WhatsApp de los participantes (7 huecos listos por defecto, ampliable/reducible desde 3).
2. Opcionalmente añade nombre del grupo, presupuesto, fecha, nota o exclusiones (ej. parejas que no pueden regalarse entre sí).
3. Pulsa **Hacer sorteo y generar sobres**:
   - El algoritmo de backtracking calcula un emparejamiento válido garantizado si existe solución.
   - Cada resultado se cifra en el navegador con AES-128-GCM (`Web Crypto API`) dentro del fragmento `#s=...` de la URL (nunca viaja a servidores).
4. La organizadora pulsa **Enviar WhatsApp** junto a cada persona (`wa.me/...`) para mandarle su sobre secreto sin ver a quién le ha tocado nadie.
5. Al abrir el enlace, cada participante ve una pantalla previa anti-spoiler (*"Toca para abrir tu sobre secreto"*) con confeti festivo al revelar.

## Desarrollo local

```bash
npm install
npm run dev
npm test
npm run build
```

## Despliegue en Cloudflare Pages

- **Build command:** `npm run build`
- **Build output directory:** `dist`
