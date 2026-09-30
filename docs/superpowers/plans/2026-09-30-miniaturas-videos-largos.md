# Miniaturas para videos largos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una sección "Videos largos" (plantillas Vlog, Podcast y Viaje basadas en una foto propia) junto a la sección actual, que pasa a llamarse "Cortos / POV" sin cambiar su resultado.

**Architecture:** Página única con pestañas y un canvas 1280×720 compartido. El JS se divide en scripts clásicos cargados en orden: `comun.js` (lienzo + utilidades), `cortos.js` (generador actual), `largos.js` (plantillas nuevas) y `app.js` (pestañas, render, eventos del canvas, descarga). Cada sección expone la misma interfaz (`render`, `nombreArchivo`, `puedeArrastrar`, `onPointerDown/Move/Up`).

**Tech Stack:** HTML + CSS + Canvas 2D en JavaScript plano (sin build, sin módulos). Pruebas: página `pruebas/pruebas.html` ejecutada en Chrome headless mediante `node pruebas/correr.mjs` (Node 24, sin dependencias npm).

**Spec:** `docs/superpowers/specs/2026-09-30-miniaturas-videos-largos-design.md`

## Global Constraints

- Salida PNG de 1280×720.
- Debe funcionar abriendo `generador-miniaturas.html` con doble clic: scripts clásicos, **sin** `type="module"`, sin servidor.
- Orden de carga: `js/comun.js`, `js/cortos.js`, `js/largos.js`, `js/app.js`.
- Identidad: tipografía Montserrat, acento dorado configurable (por defecto `#f2c35b`), brillos/chispas.
- "Cortos / POV" con valores por defecto debe producir **exactamente** el mismo PNG que antes (hash de línea base).
- Nombres de descarga: `miniatura-corto.png`, `miniatura-vlog.png`, `miniatura-podcast.png`, `miniatura-viaje.png`.
- Textos de interfaz y comentarios en español, con el mismo estilo compacto del código existente.
- **No usar git** en este proyecto (ni commits ni `git init`). Los pasos de "commit" de la plantilla se omiten.

## Review Focus

1. **Foto vertical o pequeña** (ej. 300×900 en un lienzo 16:9) con zoom y arrastre extremo: la foto debe seguir cubriendo toda su área, sin huecos transparentes. → prueba en Tarea 3.
2. **Título o destino muy largo**: el texto se reduce para caber, no se sale del lienzo. → prueba de `ajustar` en Tarea 3.
3. **Campos vacíos** (episodio, invitado, subtítulo, destino, fecha): no aparecen insignias vacías ni errores. → pruebas en Tareas 4 y 5.
4. **Ir y volver entre pestañas**: "Cortos" sigue dibujando la línea base después de usar "Videos largos". → prueba en Tarea 3.
5. **Arrastrar sin foto o fuera del área de la foto** (ej. sobre el panel del podcast): no inicia arrastre. → pruebas en Tareas 3 y 4.

---

## Estructura de archivos

```
generador-miniaturas.html   MODIFICAR: pestañas, data-panel en paneles, panel largos, 4 scripts
css/estilos.css             MODIFICAR: pestañas y regla [hidden]
js/app.js                   REEMPLAZAR: pasa a ser solo pestañas/render/eventos del canvas
js/comun.js                 CREAR: lienzo, $, rng, colores, goldG, star4, drawFrame, leerImagen, descargar
js/cortos.js                CREAR: generador actual envuelto en `var Cortos = (() => {...})()`
js/largos.js                CREAR: `var Largos = (() => {...})()` con vlog, podcast y viaje
pruebas/pruebas.html        CREAR: iframe con la app + resultado en <pre>
pruebas/pruebas.js          CREAR: mini-framework y pruebas
pruebas/correr.mjs          CREAR: lanza Chrome headless y muestra el resultado
```

Las secciones se declaran con `var` para que queden en `window` y las pruebas (que viven fuera del iframe) puedan usarlas como `w.Cortos`, `w.Largos`, `w.App`.

---

### Task 1: Arnés de pruebas y línea base de "Cortos"

**Files:**
- Create: `pruebas/pruebas.html`
- Create: `pruebas/pruebas.js`
- Create: `pruebas/correr.mjs`

**Interfaces:**
- Consumes: la app actual expone la función global `render()` (antes de la Tarea 2) o `App.render()` (después).
- Produces: `node pruebas/correr.mjs` → imprime una línea por prueba (`OK   …` / `FALLA …`) y termina con `TODO OK` (código 0) o `N FALLA(S)` (código 1). Helpers en `pruebas.js`: `prueba(nombre, fn(w))`, `afirmar(cond, msg)`, `hashLienzo(w)`, `dibujar(w)`, `pixel(w,x,y)`, `$w(w,id)`, `fotoDePrueba(w, ancho, alto)`, constante `LINEA_BASE_CORTOS`.

- [ ] **Step 1: Crear `pruebas/pruebas.html`**

```html
<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Pruebas</title></head>
<body>
<pre id="resultado">corriendo…</pre>
<pre id="capturas"></pre>
<iframe id="app" src="../generador-miniaturas.html" width="1400" height="900"></iframe>
<script src="pruebas.js"></script>
</body>
</html>
```

- [ ] **Step 2: Crear `pruebas/pruebas.js`**

```js
/* Pruebas del generador. Se ejecutan en Chrome headless: node pruebas/correr.mjs */
const PRUEBAS = [];
const prueba = (nombre, fn) => PRUEBAS.push({ nombre, fn });
function afirmar(cond, msg){ if(!cond) throw new Error(msg); }
const $w = (w, id) => w.document.getElementById(id);
const dibujar = w => (w.App ? w.App.render() : w.render());
function pixel(w,x,y){ return $w(w,'cv').getContext('2d').getImageData(x,y,1,1).data; }

// hash FNV-1a del PNG del lienzo
function hashLienzo(w){
  const d = $w(w,'cv').toDataURL('image/png');
  let h = 0x811c9dc5;
  for(let i=0;i<d.length;i++){ h ^= d.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h>>>0).toString(16);
}

// foto sintética: roja con una franja azul
function fotoDePrueba(w, ancho=1600, alto=900){
  const c = w.document.createElement('canvas'); c.width = ancho; c.height = alto;
  const x = c.getContext('2d');
  x.fillStyle = '#ff0000'; x.fillRect(0,0,ancho,alto);
  x.fillStyle = '#0033ff'; x.fillRect(0,alto*0.45,ancho,alto*0.1);
  return c;
}

// "Cortos / POV" con valores por defecto (se fija en la Tarea 1, paso 5)
const LINEA_BASE_CORTOS = null;

prueba('Cortos por defecto coincide con la línea base', w=>{
  if(w.App && w.App.mostrar) w.App.mostrar('cortos');
  dibujar(w);
  const h = hashLienzo(w);
  afirmar(LINEA_BASE_CORTOS !== null, 'línea base sin fijar; hash actual = ' + h);
  afirmar(h === LINEA_BASE_CORTOS, `hash ${h} ≠ línea base ${LINEA_BASE_CORTOS}`);
});

/* ---------- ejecución ---------- */
async function correr(){
  const fr = $w(window,'app');
  if(fr.contentWindow.location.href === 'about:blank' || fr.contentDocument.readyState !== 'complete')
    await new Promise(r => fr.addEventListener('load', r, { once:true }));
  const w = fr.contentWindow;
  const errores = [];
  w.addEventListener('error', e => errores.push(e.message));
  await Promise.all(['600 40px Montserrat','800 100px Montserrat','900 100px Montserrat']
    .map(f => w.document.fonts.load(f).catch(()=>{})));

  const lineas = []; let fallos = 0;
  for(const t of PRUEBAS){
    try{ await t.fn(w); lineas.push('OK    ' + t.nombre); }
    catch(e){ fallos++; lineas.push('FALLA ' + t.nombre + ' — ' + e.message); }
  }
  if(errores.length){ fallos++; lineas.push('FALLA errores en la app — ' + errores.join(' | ')); }
  if(location.search.includes('capturas') && typeof capturas === 'function')
    $w(window,'capturas').textContent = JSON.stringify(await capturas(w));
  lineas.push(fallos ? `${fallos} FALLA(S)` : 'TODO OK');
  $w(window,'resultado').textContent = lineas.join('\n');
}
correr().catch(e => { $w(window,'resultado').textContent = 'ERROR ' + e.stack + '\n1 FALLA(S)'; });
```

- [ ] **Step 3: Crear `pruebas/correr.mjs`**

```js
// Ejecuta pruebas/pruebas.html en Chrome headless e imprime el resultado.
// Uso: node pruebas/correr.mjs [--capturas]
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const conCapturas = process.argv.includes('--capturas');
const pagina = pathToFileURL(path.join(aqui, 'pruebas.html')).href + (conCapturas ? '?capturas' : '');
const candidatos = [
  process.env.NAVEGADOR,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);
const navegador = candidatos.find(p => fs.existsSync(p));
if(!navegador){ console.error('No encontré Chrome ni Edge (define NAVEGADOR)'); process.exit(2); }

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'miniaturas-'));
const html = execFileSync(navegador, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--user-data-dir=' + perfil, '--virtual-time-budget=30000', '--dump-dom', pagina
], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

const desescapar = s => s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
const m = html.match(/<pre id="resultado">([\s\S]*?)<\/pre>/);
const texto = m ? desescapar(m[1]) : 'sin resultado\n1 FALLA(S)';
console.log(texto);

if(conCapturas){
  const c = html.match(/<pre id="capturas">([\s\S]*?)<\/pre>/);
  if(c && c[1].trim()){
    const dir = path.join(aqui, 'capturas');
    fs.mkdirSync(dir, { recursive: true });
    for(const [nombre, url] of Object.entries(JSON.parse(desescapar(c[1])))){
      fs.writeFileSync(path.join(dir, nombre + '.png'), Buffer.from(url.split(',')[1], 'base64'));
      console.log('captura: pruebas/capturas/' + nombre + '.png');
    }
  }
}
process.exit(/TODO OK\s*$/.test(texto) ? 0 : 1);
```

- [ ] **Step 4: Ejecutar y verificar que falla pidiendo la línea base**

Run: `node pruebas/correr.mjs`
Expected: `FALLA Cortos por defecto coincide con la línea base — línea base sin fijar; hash actual = <hex>` y `1 FALLA(S)`.
Si en cambio aparece `sin resultado` o `ERROR`, arreglar el arnés antes de seguir (revisar la ruta del navegador y los flags).

- [ ] **Step 5: Fijar la línea base**

En `pruebas/pruebas.js` reemplazar `const LINEA_BASE_CORTOS = null;` por el hash impreso, por ejemplo:

```js
const LINEA_BASE_CORTOS = '1a2b3c4d';   // hash real impreso en el paso 4
```

- [ ] **Step 6: Ejecutar dos veces y verificar que pasa de forma estable**

Run: `node pruebas/correr.mjs` (dos veces)
Expected: ambas veces `OK    Cortos por defecto coincide con la línea base` y `TODO OK`.
Si el hash cambia entre corridas, la carga de fuentes no es determinista: aumentar `--virtual-time-budget` o esperar `w.document.fonts.ready` en `correr()` antes de continuar.

---

### Task 2: Separar `comun.js`, `cortos.js` y `app.js` sin cambiar el resultado

**Files:**
- Create: `js/comun.js`
- Create: `js/cortos.js`
- Replace: `js/app.js`
- Modify: `generador-miniaturas.html` (botón de descarga y etiquetas `<script>`)
- Test: `pruebas/pruebas.js`

**Interfaces:**
- Consumes: el código actual de `js/app.js`.
- Produces:
  - Globales de `comun.js`: `W`, `H`, `cv`, `ctx`, `$`, `rng(s)`, `gauss(R)`, `pick(R,a)`, `hexToRgb(h)`, `rgba(h,a)`, `lighten(h,t)`, `darken(h,t)`, `darkRgba(h,t,a)`, `setLS(c,px)`, `goldG(c,o,y0,y1)`, `star4(x,y,s,o,a)`, `drawFrame()`, `leerImagen(file, listo(img))`, `descargar(nombre)`.
  - `Cortos = { render(), nombreArchivo() → 'miniatura-corto.png', puedeArrastrar(p) → bool, onPointerDown(p) → bool, onPointerMove(p), onPointerUp() }` con `p = {x, y}` en coordenadas del lienzo.
  - `App = { render(), programar() }` (la Tarea 3 agrega `mostrar(nombre)`).
  - Botones de descarga marcados con el atributo `data-descargar`.

- [ ] **Step 1: Agregar las pruebas nuevas al final de las pruebas en `pruebas/pruebas.js`** (antes del bloque `/* ---------- ejecución ---------- */`)

```js
prueba('Cortos: nombre de descarga', w=>{
  afirmar(w.Cortos && w.Cortos.nombreArchivo() === 'miniatura-corto.png', 'Cortos.nombreArchivo() incorrecto o inexistente');
});

prueba('Cortos: arrastrar el ícono mueve los sliders', w=>{
  if(w.App.mostrar) w.App.mostrar('cortos');
  w.App.render();
  const C = w.Cortos, x0 = $w(w,'iconX').value;
  afirmar(!C.puedeArrastrar({x:40, y:40}), 'una esquina no debería ser arrastrable');
  afirmar(C.onPointerDown({x:1280*0.79, y:720*0.51}), 'no toma el ícono');
  C.onPointerMove({x:1280*0.5, y:720*0.51}); C.onPointerUp();
  const x1 = $w(w,'iconX').value;
  $w(w,'iconX').value = x0; w.App.render();
  afirmar(x1 === '50', 'iconX = ' + x1);
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node pruebas/correr.mjs`
Expected: `FALLA Cortos: nombre de descarga — Cortos.nombreArchivo() incorrecto o inexistente` y `FALLA Cortos: arrastrar…` (error por `w.App`/`w.Cortos` indefinido). La línea base sigue en `OK`.

- [ ] **Step 3: Crear `js/comun.js`**

Contenido: el encabezado de abajo y, a continuación, **movidas sin cambios desde `js/app.js`**, en este orden: el bloque `/* ---------- utilidades ---------- */` (`rng`, `gauss`, `pick`, `hexToRgb`, `rgba`, `lighten`, `darken`, `darkRgba`, `setLS`), la función `goldG`, la función `star4` y la función `drawFrame`. Terminar con `leerImagen` y `descargar`.

```js
/* ---------- lienzo compartido ---------- */
const W = 1280, H = 720;
const cv = document.getElementById('cv');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);

/* ---------- utilidades ---------- */
// (rng, gauss, pick, hexToRgb, rgba, lighten, darken, darkRgba, setLS: copiar tal cual)

// (goldG, star4, drawFrame: copiar tal cual)

/* ---------- archivos ---------- */
function leerImagen(file, listo){
  const r=new FileReader();
  r.onload=()=>{ const img=new Image(); img.onload=()=>listo(img); img.src=r.result; };
  r.readAsDataURL(file);
}

function descargar(nombre){
  cv.toBlob(b=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=nombre; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },'image/png');
}
```

Las líneas de comentario entre paréntesis indican dónde van las funciones copiadas; no deben quedar en el archivo final.

- [ ] **Step 4: Crear `js/cortos.js`**

Estructura:

```js
/* ---------- sección "Cortos / POV" ---------- */
var Cortos = (() => {
  let seed = 20260929;
  let userImg = null;
  let iconBox = null;
  let drag = null;

  // (aquí va, sin cambios, todo lo que queda de js/app.js desde `function opts()` hasta
  //  `function drawText(o){...}` inclusive: opts, drawBackground, drawBokeh, el lienzo `ic`/`ix`,
  //  ICONS, placeIcon, drawParticles, drawSparkles, drawText. NO copiar goldG, star4 ni
  //  drawFrame: ahora viven en comun.js)

  /* ---------- render ---------- */
  function render(){
    const o=opts(), R=rng(seed);
    $('iconXv').textContent=$('iconX').value+'%';
    $('iconYv').textContent=$('iconY').value+'%';
    $('iconAlphav').textContent=$('iconAlpha').value+'%';
    iconBox=null;
    ctx.save(); ctx.clearRect(0,0,W,H);
    drawBackground(R,o);
    drawBokeh(R,o);
    const p=placeIcon(o);
    drawParticles(R,o,p);
    drawSparkles(R,o,p);
    drawText(o);
    drawFrame();
    ctx.restore();
  }

  /* ---------- arrastrar el ícono ---------- */
  function puedeArrastrar(p){ const b=iconBox; return !!b && p.x>=b.x && p.x<=b.x+b.w && p.y>=b.y && p.y<=b.y+b.h; }
  function onPointerDown(p){
    if(!puedeArrastrar(p)) return false;
    drag={dx:p.x-W*$('iconX').value/100, dy:p.y-H*$('iconY').value/100};
    return true;
  }
  function onPointerMove(p){
    if(!drag) return;
    const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
    $('iconX').value=clamp((p.x-drag.dx)/W*100);
    $('iconY').value=clamp((p.y-drag.dy)/H*100);
  }
  function onPointerUp(){ drag=null; }

  /* ---------- controles propios ---------- */
  $('file').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    leerImagen(f,img=>{ userImg=img; $('icon').value='imagen'; App.render(); });
  });
  $('centerIcon').addEventListener('click',()=>{ $('iconX').value=79; $('iconY').value=51; App.render(); });
  $('rand').addEventListener('click',()=>{ seed=Math.floor(Math.random()*1e9); App.render(); });

  return { render, nombreArchivo: ()=>'miniatura-corto.png', puedeArrastrar, onPointerDown, onPointerMove, onPointerUp };
})();
```

La línea de comentario entre paréntesis indica qué código copiar; no debe quedar en el archivo final. **No** copiar desde `js/app.js`: las constantes `W/H/cv/ctx/$`, `let seed/userImg/iconBox` (ya declaradas arriba), la función `render` antigua, el bloque `raf/schedule` con el `querySelectorAll('input,textarea,select')`, el listener de `file` antiguo, el bloque de arrastre (`canvasPos`, `inIcon`, listeners `pointer*`, `touchAction`), los listeners de `centerIcon`, `rand` y `dl`, ni el `render()` inicial con `document.fonts.load`.

- [ ] **Step 5: Reemplazar `js/app.js` completo**

```js
/* ---------- secciones, render y eventos del lienzo ---------- */
var App = (() => {
  const SECCIONES = { cortos: Cortos };
  let actual = 'cortos';
  const activa = () => SECCIONES[actual];

  function render(){ activa().render(); }
  let raf=0;
  function programar(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(render); }

  document.addEventListener('input', e=>{ if(e.target.type!=='file') programar(); });

  /* arrastrar con el mouse o el dedo */
  function canvasPos(e){
    const r=cv.getBoundingClientRect();
    return { x:(e.clientX-r.left)*W/r.width, y:(e.clientY-r.top)*H/r.height };
  }
  let arrastrando=false;
  cv.addEventListener('pointerdown',e=>{
    if(!activa().onPointerDown(canvasPos(e))) return;
    arrastrando=true; cv.setPointerCapture(e.pointerId); cv.classList.add('dragging');
  });
  cv.addEventListener('pointermove',e=>{
    const p=canvasPos(e);
    if(!arrastrando){ cv.classList.toggle('drag',activa().puedeArrastrar(p)); return; }
    activa().onPointerMove(p); programar();
  });
  ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>{
    if(arrastrando){ arrastrando=false; activa().onPointerUp(); }
    cv.classList.remove('dragging');
  }));
  cv.style.touchAction='none';

  document.querySelectorAll('[data-descargar]').forEach(b=>
    b.addEventListener('click',()=>descargar(activa().nombreArchivo())));

  render();
  Promise.all([
    document.fonts.load('800 100px Montserrat'),
    document.fonts.load('600 40px Montserrat')
  ]).then(render).catch(render);

  return { render, programar };
})();
```

- [ ] **Step 6: Actualizar `generador-miniaturas.html`**

Cambiar el botón de descarga:

```html
      <button class="primary" id="dl">⬇ Descargar PNG</button>
```
por
```html
      <button class="primary" data-descargar type="button">⬇ Descargar PNG</button>
```

Y reemplazar `<script src="js/app.js"></script>` por:

```html
<script src="js/comun.js"></script>
<script src="js/cortos.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 7: Ejecutar y verificar que todo pasa**

Run: `node pruebas/correr.mjs`
Expected: las tres pruebas `OK` (incluida la línea base, que prueba que el resultado no cambió) y `TODO OK`.

---

### Task 3: Pestañas, panel "Videos largos" y plantilla Vlog

**Files:**
- Create: `js/largos.js`
- Modify: `generador-miniaturas.html`
- Modify: `css/estilos.css`
- Modify: `js/app.js`
- Test: `pruebas/pruebas.js`

**Interfaces:**
- Consumes: globales de `comun.js` (Tarea 2); `App.render()`.
- Produces:
  - `Largos = { render(), nombreArchivo() → 'miniatura-<plantilla>.png', puedeArrastrar(p), onPointerDown(p), onPointerMove(p), onPointerUp(), ponerFoto(img|canvas|null), ajustar(lineas, peso, size, maxW, ls=0.01) → size, etiquetaPodcast(ep) → string }`.
  - `App.mostrar('cortos'|'largos')` cambia la pestaña y redibuja.
  - Ids del panel: `lPlantilla`, `lFoto`, `lZoom`, `lZoomv`, `lOscuro`, `lOscurov`, `lReencuadrar`, `lTitulo`, `lSubtitulo`, `lGold`, `lRand`. Los campos propios de una plantilla van en un `<label data-plantilla="<nombre>">`.
  - Helpers internos de `largos.js` que usan las Tareas 4 y 5: `AREAS`, `dibujarFoto(a,o)`, `lineasDe(t)`, `tituloDorado(lineas,x,yBase,size,o) → yTop`, `textoPlano(t,x,y,size,peso,color,ls=0.04)`, `insignia(t,x,y,size,o) → ancho`, `chispas(R,o,n,zona)`, `PLANTILLAS`, `NOCHE`.

- [ ] **Step 1: Agregar las pruebas nuevas** (antes del bloque de ejecución)

```js
prueba('Pestaña "Videos largos" muestra su panel y oculta el de cortos', w=>{
  w.document.querySelector('.tab[data-seccion="largos"]').click();
  afirmar(!w.document.querySelector('[data-panel="largos"]').hidden, 'panel largos oculto');
  afirmar(w.document.querySelector('[data-panel="cortos"]').hidden, 'panel cortos visible');
});

prueba('Vlog sin foto dibuja algo distinto de cortos', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='vlog';
  w.Largos.ponerFoto(null); w.App.render();
  afirmar(hashLienzo(w) !== LINEA_BASE_CORTOS, 'el lienzo no cambió');
});

prueba('Sin foto no se puede arrastrar', w=>{
  w.App.mostrar('largos'); w.Largos.ponerFoto(null); w.App.render();
  afirmar(w.Largos.onPointerDown({x:640, y:360}) === false, 'inició arrastre sin foto');
});

prueba('La foto cubre el área con zoom y arrastre extremo (vlog)', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='vlog';
  try{
    for(const [fw,fh] of [[1600,900],[300,900]]){
      w.Largos.ponerFoto(fotoDePrueba(w,fw,fh)); $w(w,'lZoom').value=200; w.App.render();
      afirmar(w.Largos.onPointerDown({x:640, y:360}), 'no inicia arrastre con foto');
      w.Largos.onPointerMove({x:5640, y:5360}); w.Largos.onPointerUp(); w.App.render();
      for(const [x,y] of [[60,60],[60,660],[1220,660],[1220,360]])
        afirmar(pixel(w,x,y)[3] === 255, `hueco en (${x},${y}) con foto ${fw}×${fh}`);
    }
  } finally { $w(w,'lZoom').value=100; w.Largos.ponerFoto(null); }
});

prueba('Títulos largos se reducen para caber', w=>{
  const largo='SUPERCALIFRAGILISTICOESPIALIDOSO';
  const s=w.Largos.ajustar([largo],900,150,500);
  const c=$w(w,'cv').getContext('2d');
  c.save(); c.font=`900 ${s}px Montserrat, sans-serif`;
  if('letterSpacing' in c) c.letterSpacing=(s*0.01)+'px';
  const ancho=c.measureText(largo).width; c.restore();
  afirmar(ancho <= 501, `ancho ${ancho} > 500`);
});

prueba('Vlog: nombre de descarga', w=>{
  $w(w,'lPlantilla').value='vlog';
  afirmar(w.Largos.nombreArchivo() === 'miniatura-vlog.png', w.Largos.nombreArchivo());
});

prueba('Cortos sigue igual después de visitar Videos largos', w=>{
  w.App.mostrar('cortos');
  afirmar(hashLienzo(w) === LINEA_BASE_CORTOS, 'hash ' + hashLienzo(w));
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node pruebas/correr.mjs`
Expected: las 7 pruebas nuevas en `FALLA` (no existe `.tab`, `w.Largos` ni `App.mostrar`); las 3 anteriores siguen en `OK`.

- [ ] **Step 3: Estilos en `css/estilos.css`** (agregar al final)

```css
[hidden]{display:none !important}
.tabs{display:flex;gap:8px;max-width:1500px;margin:auto;padding:20px 20px 0}
@media(max-width:900px){.tabs{padding:16px 16px 0}}
.tab{background:#1c2542;color:var(--muted);border:1px solid var(--line)}
.tab.activa{background:linear-gradient(180deg,#ffe29a,#d9a33a);color:#2a1a00;border-color:transparent}
```

- [ ] **Step 4: HTML en `generador-miniaturas.html`**

a) Justo después de `<body>`, antes de `<div class="app">`:

```html
<nav class="tabs">
  <button class="tab activa" data-seccion="cortos" type="button">Cortos / POV</button>
  <button class="tab" data-seccion="largos" type="button">Videos largos</button>
</nav>
```

b) Cambiar `<aside class="panel">` por `<aside class="panel" data-panel="cortos">`.

c) Después del `</aside>` de cortos y antes de `<main class="stage">`, agregar:

```html
  <aside class="panel" data-panel="largos" hidden>
    <h1>✦ VIDEOS LARGOS</h1>

    <label>Plantilla
      <select id="lPlantilla">
        <option value="vlog">Vlog</option>
      </select>
    </label>
    <label>Foto
      <input type="file" id="lFoto" accept="image/*">
    </label>
    <div class="row2">
      <label>Zoom <span class="val" id="lZoomv">100%</span><input type="range" id="lZoom" min="100" max="300" value="100"></label>
      <label>Oscurecer <span class="val" id="lOscurov">30%</span><input type="range" id="lOscuro" min="0" max="80" value="30"></label>
    </div>
    <button class="ghost" id="lReencuadrar" type="button">↺ Reencuadrar foto</button>

    <label>Título (Enter = nueva línea)
      <textarea id="lTitulo">MI PRIMER DÍA
EN TOKIO</textarea>
    </label>
    <label>Subtítulo
      <input type="text" id="lSubtitulo" value="VLOG DE VIAJE">
    </label>

    <label>Dorado<input type="color" id="lGold" value="#f2c35b"></label>

    <div class="btns">
      <button class="ghost" id="lRand" type="button">🎲 Variar</button>
      <button class="primary" data-descargar type="button">⬇ Descargar PNG</button>
    </div>
    <p class="hint">Arrastra la foto sobre la miniatura para encuadrarla. Usa fotos horizontales de buena resolución (1280×720 o más).</p>
  </aside>
```

d) Agregar el script de largos antes de `app.js`:

```html
<script src="js/comun.js"></script>
<script src="js/cortos.js"></script>
<script src="js/largos.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 5: Crear `js/largos.js`**

```js
/* ---------- sección "Videos largos": vlog, podcast y viaje ---------- */
var Largos = (() => {
  let seed = 20260930;
  let foto = null;
  let encuadre = {dx:0, dy:0};   // desplazamiento de la foto, en px del lienzo
  let area = null;               // área de la foto en la plantilla dibujada
  let arrastre = null;
  const NOCHE = '#08122e', NOCHE2 = '#1f4f9a';

  function opts(){
    return {
      plantilla: $('lPlantilla').value,
      zoom: +$('lZoom').value/100, oscuro: +$('lOscuro').value/100,
      titulo: $('lTitulo').value, subtitulo: $('lSubtitulo').value,
      invitado: $('lInvitado') ? $('lInvitado').value : '',
      episodio: $('lEpisodio') ? $('lEpisodio').value.trim() : '',
      destino: $('lDestino') ? $('lDestino').value : '',
      fecha: $('lFecha') ? $('lFecha').value.trim() : '',
      gold: $('lGold').value
    };
  }

  /* ---------- foto ---------- */
  // área que ocupa la foto en cada plantilla
  const AREAS = {
    vlog:    {x:0, y:0, w:W, h:H},
    podcast: {x:W*0.45, y:0, w:W*0.55, h:H},
    viaje:   {x:0, y:0, w:W, h:H}
  };

  // "cover" + zoom + desplazamiento limitado para no dejar huecos
  function geometria(a, zoom){
    const s=Math.max(a.w/foto.width, a.h/foto.height)*zoom;
    const w=foto.width*s, h=foto.height*s;
    const mx=(w-a.w)/2, my=(h-a.h)/2;
    encuadre.dx=Math.max(-mx, Math.min(mx, encuadre.dx));
    encuadre.dy=Math.max(-my, Math.min(my, encuadre.dy));
    return { x:a.x+(a.w-w)/2+encuadre.dx, y:a.y+(a.h-h)/2+encuadre.dy, w, h };
  }

  function dibujarFoto(a,o){
    ctx.save();
    ctx.beginPath(); ctx.rect(a.x,a.y,a.w,a.h); ctx.clip();
    if(foto){
      const g=geometria(a,o.zoom);
      ctx.drawImage(foto,g.x,g.y,g.w,g.h);
      ctx.fillStyle=`rgba(0,0,10,${o.oscuro})`; ctx.fillRect(a.x,a.y,a.w,a.h);
    } else {
      const g=ctx.createLinearGradient(a.x,a.y,a.x+a.w,a.y+a.h);
      g.addColorStop(0,NOCHE2); g.addColorStop(1,NOCHE);
      ctx.fillStyle=g; ctx.fillRect(a.x,a.y,a.w,a.h);
      ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.font='700 28px Montserrat, sans-serif';
      setLS(ctx,3); ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('SUBE UNA FOTO', a.x+a.w/2, a.y+a.h*0.3);
    }
    ctx.restore();
  }

  /* ---------- texto ---------- */
  const lineasDe = t => t.toUpperCase().split('\n').filter(l=>l.trim()!=='');

  // tamaño para que la línea más ancha quepa en maxW
  function ajustar(lineas,peso,size,maxW,ls=0.01){
    ctx.save(); ctx.font=`${peso} ${size}px Montserrat, sans-serif`; setLS(ctx,size*ls);
    const ancho=Math.max(1,...lineas.map(l=>ctx.measureText(l).width));
    ctx.restore();
    return ancho>maxW ? size*maxW/ancho : size;
  }

  // título blanco→dorado con contorno y brillo; yBase = línea base de la última línea.
  // Devuelve el borde superior aproximado del bloque.
  function tituloDorado(lineas,x,yBase,size,o){
    const lh=size*1.02, y0=yBase-(lineas.length-1)*lh;
    ctx.save();
    ctx.font=`900 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.01);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.lineJoin='round';
    const grad=ctx.createLinearGradient(0,y0-size*0.8,0,yBase);
    grad.addColorStop(0,'#ffffff'); grad.addColorStop(0.5,lighten(o.gold,0.6)); grad.addColorStop(1,lighten(o.gold,0.1));
    lineas.forEach((l,i)=>{
      const y=y0+i*lh;
      ctx.shadowColor=rgba(o.gold,0.8); ctx.shadowBlur=size*0.35;
      ctx.strokeStyle='rgba(5,8,20,0.9)'; ctx.lineWidth=size*0.12; ctx.strokeText(l,x,y);
      ctx.shadowBlur=0; ctx.fillStyle=grad; ctx.fillText(l,x,y);
    });
    ctx.restore();
    return y0-size*0.8;
  }

  function textoPlano(t,x,y,size,peso,color,ls=0.04){
    ctx.save();
    ctx.font=`${peso} ${size}px Montserrat, sans-serif`; setLS(ctx,size*ls);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=12; ctx.fillStyle=color;
    ctx.fillText(t,x,y);
    ctx.restore();
  }

  // píldora dorada con texto oscuro; devuelve su ancho
  function insignia(t,x,y,size,o){
    ctx.save();
    ctx.font=`800 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.08);
    const w=ctx.measureText(t).width+size*1.4, h=size*1.9;
    ctx.shadowColor=rgba(o.gold,0.7); ctx.shadowBlur=20;
    const g=ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,lighten(o.gold,0.45)); g.addColorStop(1,o.gold);
    ctx.fillStyle=g; ctx.beginPath(); ctx.roundRect(x,y,w,h,h/2); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle=darken(o.gold,0.8); ctx.textBaseline='middle';
    ctx.fillText(t,x+size*0.7,y+h/2+size*0.05);
    ctx.restore();
    return w;
  }

  function chispas(R,o,n,z){
    for(let i=0;i<n;i++) star4(z.x+R()*z.w, z.y+R()*z.h, 8+R()*18, o, 0.6+R()*0.4);
  }

  const etiquetaPodcast = ep => ep ? `PODCAST · EP ${ep.toUpperCase()}` : 'PODCAST';

  /* ---------- plantillas ---------- */
  function vlog(R,o){
    const a=AREAS.vlog; area=a; dibujarFoto(a,o);
    let g=ctx.createLinearGradient(0,0,W*0.75,0);
    g.addColorStop(0,'rgba(3,6,18,0.85)'); g.addColorStop(1,'rgba(3,6,18,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    g=ctx.createLinearGradient(0,H*0.5,0,H);
    g.addColorStop(0,'rgba(3,6,18,0)'); g.addColorStop(1,'rgba(3,6,18,0.6)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

    const x=80, sub=o.subtitulo.trim().toUpperCase();
    const yBase= sub ? H-140 : H-80;
    let top=yBase;
    const lineas=lineasDe(o.titulo);
    if(lineas.length){
      const size=ajustar(lineas,900,Math.min(150,330/lineas.length),W*0.62);
      top=tituloDorado(lineas,x,yBase,size,o);
    }
    // barra de acento
    ctx.save(); ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=18;
    ctx.fillStyle=o.gold; ctx.fillRect(x+4,top-30,140,10); ctx.restore();
    if(sub) textoPlano(sub,x+4,H-72,ajustar([sub],700,38,W*0.62,0.04),700,lighten(o.gold,0.2));
    chispas(R,o,5,{x:W*0.55, y:H*0.08, w:W*0.4, h:H*0.3});
  }

  const PLANTILLAS = { vlog };

  /* ---------- render ---------- */
  function render(){
    const o=opts(), R=rng(seed);
    $('lZoomv').textContent=$('lZoom').value+'%';
    $('lOscurov').textContent=$('lOscuro').value+'%';
    document.querySelectorAll('[data-plantilla]').forEach(el=>{ el.hidden = el.dataset.plantilla!==o.plantilla; });
    ctx.save(); ctx.clearRect(0,0,W,H);
    PLANTILLAS[o.plantilla](R,o);
    drawFrame();
    ctx.restore();
  }

  /* ---------- arrastrar la foto ---------- */
  function puedeArrastrar(p){
    return !!foto && !!area && p.x>=area.x && p.x<=area.x+area.w && p.y>=area.y && p.y<=area.y+area.h;
  }
  function onPointerDown(p){
    if(!puedeArrastrar(p)) return false;
    arrastre={x:p.x-encuadre.dx, y:p.y-encuadre.dy};
    return true;
  }
  function onPointerMove(p){ if(arrastre){ encuadre.dx=p.x-arrastre.x; encuadre.dy=p.y-arrastre.y; } }
  function onPointerUp(){ arrastre=null; }

  function ponerFoto(img){ foto=img; encuadre={dx:0, dy:0}; }

  /* ---------- controles propios ---------- */
  $('lFoto').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    leerImagen(f,img=>{ ponerFoto(img); App.render(); });
  });
  $('lReencuadrar').addEventListener('click',()=>{ $('lZoom').value=100; encuadre={dx:0, dy:0}; App.render(); });
  $('lRand').addEventListener('click',()=>{ seed=Math.floor(Math.random()*1e9); App.render(); });

  return {
    render, nombreArchivo: ()=>'miniatura-'+$('lPlantilla').value+'.png',
    puedeArrastrar, onPointerDown, onPointerMove, onPointerUp,
    ponerFoto, ajustar, etiquetaPodcast
  };
})();
```

- [ ] **Step 6: Pestañas en `js/app.js`**

a) Reemplazar `const SECCIONES = { cortos: Cortos };` por:

```js
  const SECCIONES = { cortos: Cortos, largos: Largos };
```

b) Después de la función `programar`, agregar:

```js
  function mostrar(nombre){
    actual=nombre;
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('activa',t.dataset.seccion===nombre));
    document.querySelectorAll('[data-panel]').forEach(p=>{ p.hidden = p.dataset.panel!==nombre; });
    cv.classList.remove('drag');
    render();
  }
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>mostrar(t.dataset.seccion)));
```

c) Agregar la fuente 900 a la carga inicial:

```js
  Promise.all([
    document.fonts.load('800 100px Montserrat'),
    document.fonts.load('600 40px Montserrat'),
    document.fonts.load('900 100px Montserrat')
  ]).then(render).catch(render);
```

d) Cambiar el `return` por:

```js
  return { render, programar, mostrar };
```

- [ ] **Step 7: Ejecutar y verificar que todo pasa**

Run: `node pruebas/correr.mjs`
Expected: 10 `OK` y `TODO OK`.

---

### Task 4: Plantilla Podcast

**Files:**
- Modify: `js/largos.js`
- Modify: `generador-miniaturas.html`
- Test: `pruebas/pruebas.js`

**Interfaces:**
- Consumes: helpers internos de `largos.js` de la Tarea 3 (`AREAS`, `dibujarFoto`, `lineasDe`, `ajustar`, `tituloDorado`, `textoPlano`, `insignia`, `chispas`, `etiquetaPodcast`, `NOCHE`, `PLANTILLAS`) y `goldG`, `darkRgba` de `comun.js`.
- Produces: opción `podcast` en `lPlantilla`; ids `lInvitado`, `lEpisodio` dentro de `<label data-plantilla="podcast">`.

- [ ] **Step 1: Agregar las pruebas nuevas**

```js
prueba('Podcast: muestra sus campos', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='podcast'; w.App.render();
  afirmar(!$w(w,'lInvitado').closest('label').hidden, 'invitado oculto');
  afirmar(!$w(w,'lEpisodio').closest('label').hidden, 'episodio oculto');
  $w(w,'lPlantilla').value='vlog'; w.App.render();
  afirmar($w(w,'lInvitado').closest('label').hidden, 'invitado visible en vlog');
});

prueba('Podcast: etiqueta sin número dice solo PODCAST', w=>{
  afirmar(w.Largos.etiquetaPodcast('') === 'PODCAST', w.Largos.etiquetaPodcast(''));
  afirmar(w.Largos.etiquetaPodcast('12') === 'PODCAST · EP 12', w.Largos.etiquetaPodcast('12'));
});

prueba('Podcast: campos vacíos y foto dibujan sin errores', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='podcast';
  const ids=['lInvitado','lEpisodio','lSubtitulo','lTitulo'], antes=ids.map(i=>$w(w,i).value);
  try{
    ids.forEach(i=>{ $w(w,i).value=''; });
    w.Largos.ponerFoto(fotoDePrueba(w)); w.App.render();
    w.Largos.ponerFoto(null); w.App.render();
  } finally { ids.forEach((i,k)=>{ $w(w,i).value=antes[k]; }); }
});

prueba('Podcast: solo se arrastra sobre la foto', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='podcast';
  w.Largos.ponerFoto(fotoDePrueba(w)); w.App.render();
  try{
    afirmar(w.Largos.onPointerDown({x:100, y:360}) === false, 'arrastra sobre el panel');
    afirmar(w.Largos.onPointerDown({x:1000, y:360}) === true, 'no arrastra sobre la foto');
    w.Largos.onPointerUp();
  } finally { w.Largos.ponerFoto(null); }
});

prueba('Podcast: nombre de descarga', w=>{
  $w(w,'lPlantilla').value='podcast';
  afirmar(w.Largos.nombreArchivo() === 'miniatura-podcast.png', w.Largos.nombreArchivo());
  $w(w,'lPlantilla').value='vlog';
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node pruebas/correr.mjs`
Expected: las pruebas de Podcast en `FALLA` (no existen `lInvitado`/`lEpisodio` ni la plantilla), salvo la de la etiqueta, que ya pasa. Las anteriores siguen en `OK`.

- [ ] **Step 3: HTML en `generador-miniaturas.html`**

a) En `lPlantilla`, después de `<option value="vlog">Vlog</option>`:

```html
        <option value="podcast">Podcast</option>
```

b) Después del `<label>` del subtítulo de largos (el que contiene `lSubtitulo`):

```html
    <label data-plantilla="podcast" hidden>Invitado
      <input type="text" id="lInvitado" value="CON ANA PÉREZ">
    </label>
    <label data-plantilla="podcast" hidden>N.º de episodio
      <input type="text" id="lEpisodio" value="12" maxlength="6">
    </label>
```

- [ ] **Step 4: Plantilla en `js/largos.js`**

a) Después de la función `vlog`, agregar:

```js
  // micrófono dorado centrado en (cx,cy); mide ~190 unidades de alto antes de escalar
  function microfono(cx,cy,esc,o){
    ctx.save(); ctx.translate(cx,cy); ctx.scale(esc,esc);
    ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=30;
    const g=goldG(ctx,o,-100,90);
    ctx.fillStyle=g; ctx.strokeStyle=g; ctx.lineCap='round';
    ctx.beginPath(); ctx.roundRect(-32,-100,64,120,32); ctx.fill();        // cápsula
    ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(0,-10,52,0,Math.PI); ctx.stroke();           // soporte en U
    ctx.beginPath(); ctx.moveTo(0,42); ctx.lineTo(0,80); ctx.stroke();    // pie
    ctx.beginPath(); ctx.moveTo(-36,84); ctx.lineTo(36,84); ctx.stroke(); // base
    ctx.shadowBlur=0; ctx.strokeStyle=darkRgba(o.gold,0.5,0.45); ctx.lineWidth=4;
    [-70,-50,-30].forEach(y=>{ ctx.beginPath(); ctx.moveTo(-20,y); ctx.lineTo(20,y); ctx.stroke(); }); // rejilla
    ctx.restore();
  }

  function podcast(R,o){
    const a=AREAS.podcast; area=a;
    let g=ctx.createLinearGradient(0,0,W*0.45,H);
    g.addColorStop(0,'#13204a'); g.addColorStop(1,NOCHE);
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    dibujarFoto(a,o);
    // fundido de la foto hacia el panel
    g=ctx.createLinearGradient(a.x,0,a.x+240,0);
    g.addColorStop(0,NOCHE); g.addColorStop(1,'rgba(8,18,46,0)');
    ctx.fillStyle=g; ctx.fillRect(a.x,0,240,H);

    const x=70, maxW=W*0.42;
    microfono(x+22,112,0.4,o);
    insignia(etiquetaPodcast(o.episodio),x+64,88,24,o);
    let y=190;
    const lineas=lineasDe(o.titulo);
    if(lineas.length){
      const size=ajustar(lineas,900,Math.min(96,300/lineas.length),maxW);
      y=190+size*0.85+(lineas.length-1)*size*1.02;
      tituloDorado(lineas,x,y,size,o);
    }
    const inv=o.invitado.trim().toUpperCase();
    if(inv){ y+=64; textoPlano(inv,x,y,ajustar([inv],800,40,maxW,0.04),800,lighten(o.gold,0.15)); }
    const sub=o.subtitulo.trim().toUpperCase();
    if(sub){ y+=52; textoPlano(sub,x,y,ajustar([sub],600,26,maxW,0.04),600,'rgba(232,236,247,0.8)'); }
    chispas(R,o,4,{x:40, y:H*0.72, w:W*0.38, h:H*0.2});
  }
```

b) Cambiar `const PLANTILLAS = { vlog };` por:

```js
  const PLANTILLAS = { vlog, podcast };
```

- [ ] **Step 5: Ejecutar y verificar que todo pasa**

Run: `node pruebas/correr.mjs`
Expected: 15 `OK` y `TODO OK`.

---

### Task 5: Plantilla Reporte de viaje

**Files:**
- Modify: `js/largos.js`
- Modify: `generador-miniaturas.html`
- Test: `pruebas/pruebas.js`

**Interfaces:**
- Consumes: los mismos helpers de `largos.js` que la Tarea 4, más `goldG`, `darkRgba`, `lighten`, `rgba` de `comun.js`.
- Produces: opción `viaje` en `lPlantilla`; ids `lDestino`, `lFecha` dentro de `<label data-plantilla="viaje">`.

- [ ] **Step 1: Agregar las pruebas nuevas**

```js
prueba('Viaje: muestra sus campos y oculta los de podcast', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='viaje'; w.App.render();
  afirmar(!$w(w,'lDestino').closest('label').hidden, 'destino oculto');
  afirmar(!$w(w,'lFecha').closest('label').hidden, 'fecha oculta');
  afirmar($w(w,'lInvitado').closest('label').hidden, 'invitado visible en viaje');
  $w(w,'lPlantilla').value='podcast'; w.App.render();
  afirmar($w(w,'lDestino').closest('label').hidden, 'destino visible en podcast');
});

prueba('Viaje: campos vacíos, destino largo y foto dibujan sin errores', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='viaje';
  const ids=['lDestino','lFecha','lSubtitulo','lTitulo'], antes=ids.map(i=>$w(w,i).value);
  try{
    ids.forEach(i=>{ $w(w,i).value=''; });
    w.Largos.ponerFoto(fotoDePrueba(w,300,900)); w.App.render();
    $w(w,'lDestino').value='REPÚBLICA DEMOCRÁTICA DEL CONGO Y ALREDEDORES'; w.App.render();
  } finally { ids.forEach((i,k)=>{ $w(w,i).value=antes[k]; }); w.Largos.ponerFoto(null); }
});

prueba('Viaje: nombre de descarga', w=>{
  $w(w,'lPlantilla').value='viaje';
  afirmar(w.Largos.nombreArchivo() === 'miniatura-viaje.png', w.Largos.nombreArchivo());
  $w(w,'lPlantilla').value='vlog';
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `node pruebas/correr.mjs`
Expected: las 3 pruebas de Viaje en `FALLA` (no existen `lDestino`/`lFecha`, `PLANTILLAS.viaje` es indefinida). Las anteriores siguen en `OK`.

- [ ] **Step 3: HTML en `generador-miniaturas.html`**

a) En `lPlantilla`, después de `<option value="podcast">Podcast</option>`:

```html
        <option value="viaje">Reporte de viaje</option>
```

b) Después del `<label>` de `lEpisodio`:

```html
    <label data-plantilla="viaje" hidden>Destino / país
      <input type="text" id="lDestino" value="JAPÓN">
    </label>
    <label data-plantilla="viaje" hidden>Fecha o duración
      <input type="text" id="lFecha" value="7 DÍAS">
    </label>
```

- [ ] **Step 4: Plantilla en `js/largos.js`**

a) Después de la función `podcast`, agregar:

```js
  // pin de ubicación con la punta en (x,y)
  function pin(x,y,alto,o){
    const r=alto*0.34, cy=y-alto+r;
    ctx.save(); ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=25;
    ctx.fillStyle=goldG(ctx,o,y-alto,y);
    ctx.beginPath(); ctx.arc(x,cy,r,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x-r*0.87,cy+r*0.5); ctx.lineTo(x+r*0.87,cy+r*0.5); ctx.lineTo(x,y); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0; ctx.fillStyle=darkRgba(o.gold,0.6,0.85);
    ctx.beginPath(); ctx.arc(x,cy,r*0.4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ruta punteada decorativa arriba a la derecha, termina en un pin pequeño
  function ruta(o){
    const x0=W*0.62, y0=H*0.42, x1=W*0.9, y1=H*0.2;
    ctx.save(); ctx.lineCap='round'; ctx.setLineDash([1,18]); ctx.lineWidth=7;
    ctx.strokeStyle=lighten(o.gold,0.3); ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=10;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(W*0.66,H*0.12,x1,y1); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle=lighten(o.gold,0.3);
    ctx.beginPath(); ctx.arc(x0,y0,8,0,Math.PI*2); ctx.fill();
    ctx.restore();
    pin(x1,y1,60,o);
  }

  function viaje(R,o){
    const a=AREAS.viaje; area=a; dibujarFoto(a,o);
    const g=ctx.createLinearGradient(0,H*0.35,0,H);
    g.addColorStop(0,'rgba(3,6,18,0)'); g.addColorStop(1,'rgba(3,6,18,0.85)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);

    const x=80;
    if(o.fecha) insignia(o.fecha.toUpperCase(),x,56,26,o);
    ruta(o);
    const destino=o.destino.trim().toUpperCase(), yDest=H-78;
    let top=yDest;
    if(destino){
      const size=ajustar([destino],900,170,W-2*x-150);
      const alto=size*0.8, ancho=alto*0.68;
      pin(x+ancho/2,yDest,alto,o);
      top=tituloDorado([destino],x+ancho+24,yDest,size,o);
    }
    // título y subtítulo encima del destino, de abajo hacia arriba
    let y=top-18;
    const sub=o.subtitulo.trim().toUpperCase();
    if(sub){ textoPlano(sub,x,y,ajustar([sub],600,28,W*0.8,0.04),600,'rgba(232,236,247,0.85)'); y-=48; }
    const lineas=lineasDe(o.titulo);
    if(lineas.length){
      const s=ajustar(lineas,800,Math.min(56,150/lineas.length),W*0.8,0.04);
      for(let i=lineas.length-1;i>=0;i--){ textoPlano(lineas[i],x,y,s,800,'#ffffff'); y-=s*1.1; }
    }
    chispas(R,o,4,{x:W*0.6, y:H*0.05, w:W*0.35, h:H*0.25});
  }
```

b) Cambiar `const PLANTILLAS = { vlog, podcast };` por:

```js
  const PLANTILLAS = { vlog, podcast, viaje };
```

- [ ] **Step 5: Ejecutar y verificar que todo pasa**

Run: `node pruebas/correr.mjs`
Expected: 18 `OK` y `TODO OK`.

---

### Task 6: Capturas y revisión visual

**Files:**
- Modify: `pruebas/pruebas.js`
- Output: `pruebas/capturas/*.png`

**Interfaces:**
- Consumes: `App.mostrar`, `Largos.ponerFoto`, ids del panel; `correr()` ya llama a `capturas(w)` si existe y la URL tiene `?capturas`; `correr.mjs --capturas` guarda los PNG.
- Produces: `cortos.png`, `vlog.png`, `vlog-sin-foto.png`, `podcast.png`, `viaje.png` en `pruebas/capturas/`.

- [ ] **Step 1: Agregar la función `capturas` en `pruebas/pruebas.js`** (antes del bloque de ejecución)

```js
// foto sintética más realista: cielo de atardecer, sol y montañas
function fotoPaisaje(w){
  const c=w.document.createElement('canvas'); c.width=1600; c.height=1000;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,1000);
  g.addColorStop(0,'#2b4c8c'); g.addColorStop(0.55,'#f0a35e'); g.addColorStop(1,'#5a3b2e');
  x.fillStyle=g; x.fillRect(0,0,1600,1000);
  x.fillStyle='#ffe3a0'; x.beginPath(); x.arc(1100,560,90,0,Math.PI*2); x.fill();
  x.fillStyle='#2a2238'; x.beginPath(); x.moveTo(0,1000); x.lineTo(0,700); x.lineTo(300,480);
  x.lineTo(620,720); x.lineTo(900,520); x.lineTo(1250,760); x.lineTo(1600,600); x.lineTo(1600,1000); x.fill();
  return c;
}

async function capturas(w){
  const res={}, url=()=>$w(w,'cv').toDataURL('image/png');
  w.App.mostrar('cortos'); res.cortos=url();
  w.App.mostrar('largos');
  $w(w,'lPlantilla').value='vlog'; w.Largos.ponerFoto(null); w.App.render(); res['vlog-sin-foto']=url();
  w.Largos.ponerFoto(fotoPaisaje(w));
  for(const p of ['vlog','podcast','viaje']){ $w(w,'lPlantilla').value=p; w.App.render(); res[p]=url(); }
  w.Largos.ponerFoto(null);
  return res;
}
```

- [ ] **Step 2: Generar las capturas**

Run: `node pruebas/correr.mjs --capturas`
Expected: `TODO OK` y 5 líneas `captura: pruebas/capturas/<nombre>.png`.

- [ ] **Step 3: Revisar cada PNG** (abrirlos y mirarlos)

Checklist por imagen:
- `cortos.png`: idéntica a la miniatura original (globo dorado a la derecha, "VUELTA AL MUNDO").
- `vlog.png`: título legible abajo a la izquierda, barra dorada encima sin tocar el título, subtítulo debajo, nada cortado por el marco.
- `vlog-sin-foto.png`: degradado azul con "SUBE UNA FOTO" visible y sin tapar el título.
- `podcast.png`: micrófono e insignia alineados en la fila superior, título/invitado/subtítulo dentro del panel izquierdo y sin encimarse, fundido suave hacia la foto.
- `viaje.png`: insignia "7 DÍAS" arriba a la izquierda, ruta y pin pequeño arriba a la derecha sin cruzar textos, "JAPÓN" grande con pin a su izquierda, título y subtítulo encima sin encimarse.

Si algo se ve mal, ajustar las coordenadas o tamaños en la función de esa plantilla en `js/largos.js`, volver a generar con `node pruebas/correr.mjs --capturas` y revisar de nuevo. Las pruebas deben seguir en `TODO OK`.

- [ ] **Step 4: Verificación manual en el navegador (la hace el usuario)**

Abrir `generador-miniaturas.html` con doble clic y comprobar:
1. Las pestañas cambian el panel y la miniatura.
2. En "Videos largos", subir una foto real y arrastrarla con el mouse: se mueve y nunca deja bordes vacíos; "↺ Reencuadrar foto" la centra.
3. Cambiar de plantilla muestra/oculta los campos correctos.
4. "⬇ Descargar PNG" baja el archivo con el nombre correcto en ambas pestañas.
5. En "Cortos / POV", el ícono se sigue arrastrando y todo funciona como antes.
