# 🌹 Diario de la Rosa

Un Letterboxd exclusivo para capítulos de **La Rosa de Guadalupe**. Busca capítulos, califícalos con estrellas y escribe tus reseñas.

🔗 **[Abrir la app → pedroiruegas.github.io/diario-rosa](https://pedroiruegas.github.io/diario-rosa/)**

## Qué hace

- 👤 Cuentas con usuario y contraseña (sin correo ni datos personales)
- ⭐ Calificación de media en media estrella, "me gusta", "por ver" y reseñas
- 📖 Perfil con 4 favoritos, diario por mes, reseñas y listas
- 🌹 Página de cada capítulo con reseñas de la comunidad y gráfica de calificaciones
- 🔎 Buscador y filtros por temporada entre más de 2,200 capítulos
- 📲 Instalable como app (PWA)

## Base de datos

Las cuentas y reseñas viven en [Supabase](https://supabase.com). El esquema está en `supabase.sql`.

## Actualizar el catálogo

Los capítulos viven en `capitulos.json`. Para regenerarlo con lo más nuevo de TMDB:

```powershell
$env:TMDB_KEY="tu_llave_v3"; node construir-catalogo.mjs
```

Luego haz commit y push del `capitulos.json` nuevo.

## Instalar en el celular

**Android (Chrome):** menú ⋮ → "Añadir a pantalla de inicio"
**iPhone (Safari):** botón compartir □↑ → "Añadir a pantalla de inicio"

## Tecnologías

- HTML, CSS y JavaScript puro, en un solo archivo
- Cuentas y datos: Supabase
- Datos de capítulos: [Fandom](https://rosa-de-guadalupe.fandom.com/es) y [TMDB](https://www.themoviedb.org)
- Fuentes: Fraunces + DM Sans vía Google Fonts

> Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.

---

Hecho por [Pedro Iruegas](https://github.com/pedroiruegas)
