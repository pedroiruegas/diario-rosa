// Construye capitulos.json combinando dos fuentes:
//   - Fandom (rosa-de-guadalupe.fandom.com): lista completa, títulos y fechas
//   - TMDB: sinopsis e imágenes donde existan
// Opcional --sinopsis: para los que sigan sin sinopsis, la toma de la página de cada capítulo en Fandom.
//
// Uso (PowerShell):
//   $env:TMDB_KEY="tu_llave"; node construir-catalogo.mjs
//   $env:TMDB_KEY="tu_llave"; node construir-catalogo.mjs --sinopsis
import { writeFileSync } from 'node:fs';

const KEY = process.env.TMDB_KEY;
const SERIE = 30826;
const WIKI = 'https://rosa-de-guadalupe.fandom.com/es/api.php';
const CON_SINOPSIS = process.argv.includes('--sinopsis');
const esperar = ms => new Promise(r => setTimeout(r, ms));

const MESES = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8,
                septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };

const normal = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim();

function fechaISO(txt) {
  const m = txt.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})/i);
  if (!m) return '';
  const mes = MESES[normal(m[2])];
  return mes ? `${m[3]}-${String(mes).padStart(2,'0')}-${m[1].padStart(2,'0')}` : '';
}

function limpiarLink(txt) {
  return txt
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1')   // [[Pagina|Texto]] → Texto
    .replace(/'{2,}/g, '')                              // ''cursiva'' / '''negrita'''
    .replace(/<ref[^>]*\/>|<ref[^>]*>.*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function traerJSON(url, intentos = 4) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'DiarioDeLaRosa/1.0 (github.com/pedroiruegas)' } });
      if (res.status === 429 || res.status >= 500) { await esperar(1500 * i); continue; }
      if (res.status === 401) throw new Error('Llave de TMDB inválida');
      if (res.status === 404) return null;
      return await res.json();
    } catch (e) {
      if (e.message.includes('Llave')) throw e;
      await esperar(1500 * i);
    }
  }
  return null;
}

/* ---------- Fandom: tabla de cada temporada ---------- */
function leerTabla(wikitext, s) {
  const caps = [];
  for (const fila of wikitext.split(/\n\|-/)) {
    const celdas = fila.split('\n')
      .filter(l => l.startsWith('|') && !l.startsWith('|}') && !l.startsWith('|-'))
      .flatMap(l => l.slice(1).split('||'))
      .map(c => c.trim());
    if (celdas.length < 2) continue;
    const num = celdas[0].match(/^(\d+)\s*(?:\((\d+)\))?/);
    if (!num) continue;
    const t = limpiarLink(celdas[1]);
    if (!t) continue;
    const pagina = (celdas[1].match(/\[\[([^\]|]+)/) || [])[1] || '';
    caps.push({ s, e: +num[1], g: num[2] ? +num[2] : undefined, t,
                d: fechaISO(celdas.slice(2).join(' ')), _pagina: pagina.trim() });
  }
  return caps;
}

async function fandom() {
  const todos = [];
  let faltantes = 0;
  for (let s = 1; s <= 30 && faltantes < 3; s++) {
    const pag = `Episodios_de_La_rosa_de_Guadalupe:_Temporada_${s}`;
    const d = await traerJSON(`${WIKI}?action=parse&page=${encodeURIComponent(pag)}&prop=wikitext&format=json&formatversion=2`);
    if (!d?.parse?.wikitext) { faltantes++; console.log(`  Fandom T${s}: no existe`); continue; }
    faltantes = 0;
    const caps = leerTabla(d.parse.wikitext, s);
    console.log(`  Fandom T${s}: ${caps.length} capítulos`);
    todos.push(...caps);
    await esperar(300);
  }
  return todos;
}

/* ---------- TMDB ---------- */
async function tmdb() {
  if (!KEY) { console.log('  Sin TMDB_KEY: se omite TMDB'); return []; }
  const api = r => traerJSON(`https://api.themoviedb.org/3${r}?language=es-MX&api_key=${KEY}`);
  const serie = await api(`/tv/${SERIE}`);
  if (!serie) throw new Error('No se pudo leer la serie en TMDB');
  const eps = [];
  for (const { season_number: s } of serie.seasons.filter(x => x.season_number > 0)) {
    const d = await api(`/tv/${SERIE}/season/${s}`);
    for (const ep of d?.episodes ?? [])
      eps.push({ t: (ep.name || '').trim(), o: (ep.overview || '').trim(), d: ep.air_date || '', img: ep.still_path || '' });
    await esperar(250);
  }
  console.log(`  TMDB: ${eps.length} capítulos`);
  return eps;
}

/* ---------- Sinopsis desde la página del capítulo ---------- */
function quitarPlantillas(txt) {
  let prev;
  do { prev = txt; txt = txt.replace(/\{\{[^{}]*\}\}/g, ''); } while (txt !== prev);
  return txt.replace(/\{\|[\s\S]*?\|\}/g, '');
}
function extraerSinopsis(wikitext) {
  const limpio = quitarPlantillas(wikitext)
    .replace(/\[\[(?:Archivo|File|Imagen|Image|Categoría|Category):[^\]]*\]\]/gi, '')
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '');
  const parrafos = limpio.split(/\n\s*\n/)
    .map(p => limpiarLink(p.replace(/\n/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(p => p.length >= 60 && !p.startsWith('=') && !p.startsWith('*') && !p.startsWith('|'));
  if (!parrafos.length) return '';
  const p = parrafos[0];
  return p.length > 700 ? p.slice(0, 700).replace(/\s\S*$/, '') + '…' : p;
}

async function sinopsisFandom(caps) {
  const pendientes = caps.filter(c => !c.o && c._pagina);
  console.log(`\nBuscando sinopsis en Fandom para ${pendientes.length} capítulos…`);
  let hechos = 0, encontradas = 0;
  for (let i = 0; i < pendientes.length; i += 5) {
    await Promise.all(pendientes.slice(i, i + 5).map(async c => {
      const d = await traerJSON(`${WIKI}?action=parse&page=${encodeURIComponent(c._pagina)}&prop=wikitext&redirects=1&format=json&formatversion=2`);
      const o = d?.parse?.wikitext ? extraerSinopsis(d.parse.wikitext) : '';
      if (o) { c.o = o; encontradas++; }
    }));
    hechos = Math.min(i + 5, pendientes.length);
    if (hechos % 100 < 5) console.log(`  ${hechos}/${pendientes.length} (${encontradas} encontradas)`);
    await esperar(400);
  }
  console.log(`  Sinopsis encontradas en Fandom: ${encontradas}`);
}

/* ---------- Unir ---------- */
function unir(caps, tm) {
  const porTitulo = new Map(), porFecha = new Map();
  for (const x of tm) {
    const k = normal(x.t);
    if (k) (porTitulo.get(k) || porTitulo.set(k, []).get(k)).push(x);
    if (x.d) porFecha.set(x.d, x);
  }
  let emparejados = 0;
  for (const c of caps) {
    const candidatos = porTitulo.get(normal(c.t)) || [];
    let m = candidatos.length === 1 ? candidatos[0]
          : candidatos.find(x => x.d && x.d === c.d)
            || candidatos.find(x => x.d && c.d && x.d.slice(0,4) === c.d.slice(0,4));
    if (!m && c.d && porFecha.has(c.d)) m = porFecha.get(c.d);
    if (m) {
      emparejados++;
      if (m.o) c.o = m.o;
      if (m.img) c.img = m.img;
      if (!c.d && m.d) c.d = m.d;
    }
  }
  console.log(`  Emparejados con TMDB: ${emparejados}`);
}

/* ---------- Principal ---------- */
console.log('Leyendo Fandom…');
const caps = await fandom();
if (!caps.length) { console.error('Fandom no devolvió capítulos. Revisa tu conexión.'); process.exit(1); }

console.log('\nLeyendo TMDB…');
unir(caps, await tmdb());

if (CON_SINOPSIS) await sinopsisFandom(caps);

const salida = caps.map(({ _pagina, ...c }) => {
  for (const k of Object.keys(c)) if (c[k] === '' || c[k] === undefined) delete c[k];
  return c;
});
writeFileSync('capitulos.json', JSON.stringify(salida));

const sinO = salida.filter(c => !c.o).length, sinI = salida.filter(c => !c.img).length;
console.log(`\nListo: ${salida.length} capítulos → capitulos.json`);
console.log(`Sin sinopsis: ${sinO} · Sin imagen: ${sinI}`);
