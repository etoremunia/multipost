# MultiPost — Guía de despliegue

## Estructura de archivos
```
multipost/
├── index.html              ← Tu web principal
├── netlify.toml            ← Configuración de Netlify
├── .env.example            ← Variables de entorno (referencia)
├── supabase-schema.sql     ← SQL para crear las tablas
└── netlify/
    └── functions/
        ├── youtube-auth.js         ← Inicia OAuth de YouTube
        ├── youtube-callback.js     ← Recibe el token de YouTube
        ├── get-connections.js      ← Consulta plataformas conectadas
        └── disconnect-platform.js  ← Desconecta una plataforma
```

---

## PASO 1 — Crear las tablas en Supabase

1. Ve a https://supabase.com → tu proyecto `multipost`
2. Menú izquierdo → **SQL Editor** → **New query**
3. Copia y pega todo el contenido de `supabase-schema.sql`
4. Pulsa **Run**

---

## PASO 2 — Subir los archivos a Netlify

Sube a tu sitio de Netlify todos estos archivos manteniendo la estructura de carpetas:
- `index.html` (en la raíz)
- `netlify.toml` (en la raíz)
- `netlify/functions/youtube-auth.js`
- `netlify/functions/youtube-callback.js`
- `netlify/functions/get-connections.js`
- `netlify/functions/disconnect-platform.js`

La forma más fácil es usando GitHub:
1. Crea un repositorio en github.com
2. Sube todos los archivos
3. En Netlify → Site settings → Link to Git → selecciona ese repositorio

---

## PASO 3 — Configurar variables de entorno en Netlify

1. Ve a tu sitio en Netlify → **Site configuration** → **Environment variables**
2. Añade estas variables una a una:

| Variable | Valor |
|---|---|
| YOUTUBE_CLIENT_ID | 134695295105-9t8dv26am9thbjp8ahpm64eav2m2t5l4.apps.googleusercontent.com |
| YOUTUBE_CLIENT_SECRET | (el que tienes guardado del JSON) |
| YOUTUBE_REDIRECT_URI | https://melodious-cuchufli-02f042.netlify.app/auth/youtube/callback |
| SUPABASE_URL | https://xwbreyqsgujjxqwjtrbi.supabase.co |
| SUPABASE_ANON_KEY | (la key que empieza por eyJ...) |
| SESSION_SECRET | (cualquier string largo aleatorio, ej: mp_s3cr3t_2025_xyz) |

3. Pulsa **Deploy site** para que se apliquen

---

## PASO 4 — Verificar que funciona

Abre en tu navegador:
```
https://melodious-cuchufli-02f042.netlify.app/.netlify/functions/get-connections?email=test@test.com
```
Debe devolver: `{"connected":[]}`

Si ves eso, el backend funciona correctamente.

---

## PRÓXIMOS PASOS (TikTok e Instagram)

Una vez que YouTube funcione, el proceso para TikTok e Instagram es idéntico:

**TikTok:**
- Regístrate en developers.tiktok.com
- Crea una app y solicita permisos `video.upload`
- Te creo los archivos `tiktok-auth.js` y `tiktok-callback.js`

**Instagram:**
- Regístrate en developers.facebook.com
- Crea una app Business con Instagram Graph API
- Te creo los archivos `instagram-auth.js` y `instagram-callback.js`
