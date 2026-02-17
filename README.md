# Frontend Poker de Dados

App Next.js (App Router) con UI del juego y conexión en tiempo real por Socket.IO.

## Requisitos
- Node.js 18+ (recomendado 20+)

## Instalación
```bash
npm install
```

## Desarrollo
```bash
npm run dev
```

## Producción
```bash
npm run build
npm start
```

## Variables de entorno
- `NEXT_PUBLIC_SOCKET_URL` URL del backend Socket.IO (ej.: https://tu-backend.onrender.com)

## Despliegue gratuito (Vercel)
1) Crear proyecto en Vercel.
2) Root Directory: `frontend_poker`.
3) Variable `NEXT_PUBLIC_SOCKET_URL` apuntando al backend.
4) Deploy.

## Notas
- Si usas Render en free tier, el primer acceso puede tardar.
- Asegúrate de que el backend tenga `CORS_ORIGIN` con el dominio de Vercel.
