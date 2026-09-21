// Genera capitulos.json con todos los capítulos de La Rosa de Guadalupe desde TMDB.
// Uso (PowerShell):  $env:TMDB_KEY="tu_llave"; node fetch-capitulos.mjs
import { writeFileSync } from 'node:fs';

const KEY = process.env.TMDB_KEY;
const SERIE = 30826;
if (!KEY) { console.error('Falta TMDB_KEY'); process.exit(1); }

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function api(ruta) {
  const url = `https://api.themoviedb.org/3${ruta}${ruta.includes('?') ? '&' : '?'}language=es-MX&api_key=${KEY}`;
  for (let intento = 1; intento <= 4; intento++) {
    const res = await fetch(url);
    if (res.status === 401) throw new Error('Llave inválida');
    if (res.status === 429) { await esperar(1500 * intento); continue; }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${res.status} en ${ruta}`);
    return res.json();
  }
  throw new Error(`Demasiados reintentos en ${ruta}`);
}

const serie = await api(`/tv/${SERIE}`);
const temporadas = serie.seasons.map(s => s.season_number).filter(n => n > 0);
console.log(`${serie.name}: ${temporadas.length} temporadas`);

const capitulos = [];
let sinSinopsis = 0, sinImagen = 0;

for (const s of temporadas) {
  const datos = await api(`/tv/${SERIE}/season/${s}`);
  const eps = datos?.episodes ?? [];
  for (const ep of eps) {
    const c = {
      s, e: ep.episode_number,
      t: (ep.name || `Capítulo ${ep.episode_number}`).trim(),
      o: (ep.overview || '').trim(),
      d: ep.air_date || '',
      img: ep.still_path || ''
    };
    if (!c.o) sinSinopsis++;
    if (!c.img) sinImagen++;
    capitulos.push(c);
  }
  console.log(`  T${s}: ${eps.length} capítulos`);
  await esperar(250);
}

writeFileSync('capitulos.json', JSON.stringify(capitulos));
console.log(`\nListo: ${capitulos.length} capítulos → capitulos.json`);
console.log(`Sin sinopsis: ${sinSinopsis} · Sin imagen: ${sinImagen}`);
