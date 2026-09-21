# 🌹 Diario de la Rosa

Un Letterboxd exclusivo para capítulos de **La Rosa de Guadalupe**. Busca capítulos, califícalos con estrellas y escribe tus reseñas.

🔗 **[Abrir la app → pedroiruegas.github.io/diario-rosa](https://pedroiruegas.github.io/diario-rosa/)**

## Qué hace

- 🔎 Buscador por título y sinopsis, con filtro por temporada
- ⭐ Calificación de media en media estrella, estilo Letterboxd
- ✍️ Reseñas, marcar como visto y favoritos
- 📊 Mi diario: capítulos vistos, promedio y cómo calificas
- 💾 Respaldo de reseñas para copiar y restaurar
- 📲 Instalable como app (PWA), sin tiendas

## Actualizar el catálogo

Los capítulos viven en `capitulos.json`. Para regenerarlo con lo más nuevo de TMDB:

```powershell
$env:TMDB_KEY="tu_llave_v3"; node fetch-capitulos.mjs
```

Luego haz commit y push del `capitulos.json` nuevo.

## Instalar en el celular

**Android (Chrome):** menú ⋮ → "Añadir a pantalla de inicio"
**iPhone (Safari):** botón compartir □↑ → "Añadir a pantalla de inicio"

## Tecnologías

- HTML, CSS y JavaScript puro, en un solo archivo
- Datos de capítulos: [TMDB](https://www.themoviedb.org)
- Fuentes: Fraunces + DM Sans vía Google Fonts

> Este producto usa la API de TMDB pero no está avalado ni certificado por TMDB.

---

Hecho por [Pedro Iruegas](https://github.com/pedroiruegas)
