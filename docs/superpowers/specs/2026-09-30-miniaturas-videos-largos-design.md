# Miniaturas para videos largos — Diseño

Fecha: 2026-09-30

## Objetivo

Agregar al generador una segunda sección, **"Videos largos"**, para crear miniaturas de
vlogs, podcasts y reportes de viaje. La sección actual pasa a llamarse **"Cortos / POV"**
y su resultado no debe cambiar.

## Requisitos

- Tres plantillas distintas: **Vlog**, **Podcast**, **Viaje**.
- El elemento principal es una **foto propia** subida por el usuario, con texto grande encima.
- Misma identidad del canal: acento dorado configurable, tipografía Montserrat, brillos/chispas.
- Salida PNG de 1280×720.
- Debe seguir funcionando abriendo el HTML con doble clic (sin servidor): scripts clásicos,
  sin `type="module"`.

## Interfaz

- Barra de pestañas sobre la aplicación: `Cortos / POV` | `Videos largos`.
- Cada pestaña muestra su propio panel de controles; el canvas (1280×720) se comparte.
- Cambiar de pestaña vuelve a dibujar el canvas con la sección activa.
- Botón "Descargar PNG" disponible en ambas secciones; nombre de archivo según sección
  (`miniatura-corto.png`, `miniatura-vlog.png`, `miniatura-podcast.png`, `miniatura-viaje.png`).

### Panel "Videos largos"

Controles comunes:
- Plantilla (select): Vlog / Podcast / Viaje.
- Subir foto (input file, image/*).
- Zoom de la foto (slider 100–300 %).
- Oscurecer foto (slider 0–80 %).
- Título (textarea, Enter = nueva línea) y subtítulo.
- Color dorado.
- Botón "↺ Reencuadrar foto" (vuelve zoom 100 % y posición centrada).
- Botones "🎲 Variar" (cambia semilla de chispas) y "⬇ Descargar PNG".

Controles por plantilla (visibles solo en la plantilla activa):
- Podcast: invitado (texto), número de episodio (texto corto).
- Viaje: destino/país (texto), fecha o duración (texto, ej. "7 DÍAS").

Encuadre de la foto: la foto se dibuja en modo "cover" dentro del área de foto de la
plantilla; el zoom la agranda y arrastrarla con mouse/dedo sobre el canvas la desplaza
(desplazamiento limitado para que la foto siempre cubra su área).

## Plantillas

**Vlog**
- Foto a pantalla completa.
- Degradado oscuro desde la izquierda (legibilidad del texto).
- Título grande abajo a la izquierda: relleno blanco→dorado claro, contorno oscuro y brillo dorado.
- Barra dorada de acento sobre el título; subtítulo bajo el título.
- Algunas chispas doradas (estrellas de 4 puntas).

**Podcast**
- Foto en el 55 % derecho, con fundido hacia el panel.
- Panel oscuro a la izquierda (fondo tipo `bg2` con degradado).
- Fila superior: ícono de micrófono dibujado en dorado con resplandor + insignia dorada
  "PODCAST · EP <n>" (solo "PODCAST" si el número está vacío).
- Título, luego nombre del invitado en dorado y subtítulo.

**Viaje**
- Foto a pantalla completa, degradado oscuro desde abajo.
- Destino en letras muy grandes abajo a la izquierda, con pin de ubicación dorado al lado.
- Etiqueta dorada arriba a la izquierda con la fecha/duración.
- Título/subtítulo como texto secundario sobre el destino.
- Línea punteada de ruta dorada decorativa en la parte superior derecha, que termina en un
  pin pequeño (no cruza los textos).

**Sin foto (todas las plantillas)**
- El área de foto muestra un degradado azul noche con el texto "Sube una foto" centrado.

## Arquitectura de archivos

```
generador-miniaturas.html   pestañas + ambos paneles + canvas
css/estilos.css             estilos (se agregan pestañas y campos condicionales)
js/comun.js                 W/H, canvas, ctx, $, rng, gauss, pick, colores (hexToRgb, rgba,
                            lighten, darken, darkRgba), setLS, star4, descargar(nombre)
js/cortos.js                generador actual: opts, fondo, bokeh, íconos, partículas, texto,
                            marco, arrastre del ícono; expone Cortos = {render, nombreArchivo,
                            pointerdown/move/up}
js/largos.js                plantillas nuevas; expone Largos = {render, nombreArchivo,
                            pointerdown/move/up}
js/app.js                   pestañas, sección activa, enruta render/eventos del canvas y descarga
```

Orden de carga: `comun.js`, `cortos.js`, `largos.js`, `app.js`.

Cada sección expone la misma interfaz mínima para que `app.js` no conozca sus detalles:
- `render()` dibuja la sección en el canvas compartido.
- `nombreArchivo()` devuelve el nombre del PNG.
- `puedeArrastrar(p)`, `onPointerDown(p)`, `onPointerMove(p)`, `onPointerUp()` con `p = {x, y}`
  en coordenadas del canvas; `onPointerDown` devuelve `true` si inicia un arrastre.
  `app.js` es dueño de los listeners del canvas, del cursor y de `setPointerCapture`.

Los listeners de inputs de cada panel solo redibujan si su sección está activa.

## Pruebas

Automáticas, sin dependencias: `node pruebas/correr.mjs` abre `pruebas/pruebas.html` en
Chrome headless (la página carga la app en un iframe y ejecuta las pruebas) e imprime el
resultado. `node pruebas/correr.mjs --capturas` además guarda PNG de cada plantilla en
`pruebas/capturas/` para revisión visual.

Casos (automáticos salvo el arrastre real con mouse y la subida de archivo, que se revisan a mano):

1. "Cortos / POV" genera la misma imagen que antes (semilla y valores por defecto).
2. Arrastre del ícono sigue funcionando en Cortos; arrastre de foto funciona en Largos.
3. Cada plantilla con foto y sin foto; campos condicionales aparecen/desaparecen.
4. Títulos largos se reducen para no salirse; campos vacíos no dejan insignias vacías.
5. Descarga produce PNG 1280×720 con el nombre correcto.
6. Consola del navegador sin errores.
