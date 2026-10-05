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
const LINEA_BASE_CORTOS = 'd0d999';

prueba('Cortos por defecto coincide con la línea base', w=>{
  if(w.App && w.App.mostrar) w.App.mostrar('cortos');
  dibujar(w);
  const h = hashLienzo(w);
  afirmar(LINEA_BASE_CORTOS !== null, 'línea base sin fijar; hash actual = ' + h);
  afirmar(h === LINEA_BASE_CORTOS, `hash ${h} ≠ línea base ${LINEA_BASE_CORTOS}`);
});

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
      afirmar(w.Largos.onPointerDown({x:1100, y:150}), 'no inicia arrastre con foto');
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

/* ---------- correcciones de la revisión final ---------- */
// cuenta píxeles casi blancos (texto) en un rectángulo del lienzo
function blancosEn(w,x,y,ancho,alto){
  const d=$w(w,'cv').getContext('2d').getImageData(x,y,ancho,alto).data;
  let n=0; for(let i=0;i<d.length;i+=4) if(d[i]>230 && d[i+1]>230 && d[i+2]>230) n++;
  return n;
}

prueba('Viaje: un título de 3 líneas no cruza la ruta', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='viaje';
  const antes=$w(w,'lTitulo').value;
  try{
    w.Largos.ponerFoto(null);
    $w(w,'lTitulo').value='UNO DOS TRES CUATRO CINCO SEIS\nSIETE OCHO NUEVE DIEZ ONCE\nDOCE TRECE CATORCE QUINCE';
    w.App.render();
    const n=blancosEn(w,810,310,370,160);
    afirmar(n===0, `${n} píxeles de texto bajo la ruta (x≥810)`);
  } finally { $w(w,'lTitulo').value=antes; }
});

prueba('Insignia larga se reduce hasta su ancho máximo', w=>{
  const ancho=w.Largos.insignia('DEL 12 DE ENERO AL 30 DE FEBRERO DE 2026 - RUTA COMPLETA',80,56,26,{gold:'#f2c35b'},653);
  afirmar(ancho<=653.5, 'ancho '+ancho);
  w.App.render();
});

prueba('Subir un archivo que no es imagen avisa al usuario', async w=>{
  const alertaOriginal=w.alert; let mensaje=null;
  w.alert=m=>{ mensaje=m; };
  try{
    w.leerImagen(new w.Blob(['hola'],{type:'text/plain'}), ()=>{ mensaje='cargó'; });
    for(let i=0;i<50 && mensaje===null;i++) await new Promise(r=>setTimeout(r,20));
    afirmar(mensaje && mensaje!=='cargó', 'sin aviso: '+mensaje);
  } finally { w.alert=alertaOriginal; }
});

prueba('La foto se escala con suavizado de alta calidad', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='vlog';
  const c=$w(w,'cv').getContext('2d'), original=c.drawImage, foto=fotoDePrueba(w,4000,2250);
  let calidad=null;
  c.drawImage=function(img,...r){ if(img===foto) calidad=this.imageSmoothingQuality; return original.call(this,img,...r); };
  try{ w.Largos.ponerFoto(foto); w.App.render(); }
  finally { delete c.drawImage; w.Largos.ponerFoto(null); }
  afirmar(calidad==='high', 'calidad = '+calidad);
});

/* ---------- Cortos: imagen de fondo ---------- */
prueba('Cortos: la imagen de fondo cubre todo y se encuadra arrastrando', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos;
  try{
    for(const [fw,fh] of [[1600,900],[300,900]]){
      C.ponerFondo(fotoDePrueba(w,fw,fh)); w.App.render();
      afirmar(hashLienzo(w) !== LINEA_BASE_CORTOS, 'el fondo no cambió el lienzo');
      afirmar(!$w(w,'bgAjustes').hidden, 'ajustes de fondo ocultos con imagen');
      afirmar(C.onPointerDown({x:60, y:60}), 'no arrastra el fondo fuera del ícono');
      C.onPointerMove({x:5060, y:5060}); C.onPointerUp(); w.App.render();
      for(const [x,y] of [[40,40],[40,680],[1240,680],[1240,40]])
        afirmar(pixel(w,x,y)[3] === 255, `hueco en (${x},${y}) con foto ${fw}×${fh}`);
    }
  } finally { C.ponerFondo(null); w.App.render(); }
});

prueba('Cortos: sobre el ícono se arrastra el ícono, no el fondo', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos, x0=$w(w,'iconX').value;
  try{
    C.ponerFondo(fotoDePrueba(w)); w.App.render();
    afirmar(C.onPointerDown({x:1280*0.79, y:720*0.51}), 'no toma el ícono');
    C.onPointerMove({x:1280*0.5, y:720*0.51}); C.onPointerUp();
    afirmar($w(w,'iconX').value === '50', 'iconX = '+$w(w,'iconX').value);
  } finally { $w(w,'iconX').value=x0; C.ponerFondo(null); w.App.render(); }
});

prueba('Cortos: quitar el fondo vuelve a la línea base', w=>{
  w.App.mostrar('cortos');
  w.Cortos.ponerFondo(fotoDePrueba(w)); w.App.render();
  $w(w,'bgQuitar').click();
  afirmar($w(w,'bgAjustes').hidden, 'ajustes de fondo visibles sin imagen');
  afirmar(hashLienzo(w) === LINEA_BASE_CORTOS, 'hash '+hashLienzo(w));
});

prueba('Cortos: el tamaño del título cambia en todo su recorrido', w=>{
  w.App.mostrar('cortos');
  const s=$w(w,'titleSize'), antes=s.value, hashes=new Set();
  try{
    for(const v of [140,170,200]){ s.value=v; w.App.render(); hashes.add(hashLienzo(w)); }
  } finally { s.value=antes; w.App.render(); }
  afirmar(hashes.size===3, 'tamaños distintos dibujan igual');
});

prueba('Cortos: las pestañas del panel muestran un grupo a la vez', w=>{
  const d=w.document, visibles=()=>[...d.querySelectorAll('.grupo[data-grupo]')].filter(g=>!g.hidden).map(g=>g.dataset.grupo);
  try{
    d.querySelector('.subtab[data-grupo="icono"]').click();
    afirmar(visibles().join()==='icono', 'visibles: '+visibles());
    afirmar(!$w(w,'icon').closest('.grupo').hidden, 'selector de ícono oculto');
    afirmar(d.querySelector('.subtab.activa').dataset.grupo==='icono', 'pestaña activa incorrecta');
  } finally { d.querySelector('.subtab[data-grupo="texto"]').click(); }
  afirmar(visibles().join()==='texto', 'visibles: '+visibles());
});

prueba('Cortos: sin efectos no se dibuja ningún destello ni partícula', w=>{
  w.App.mostrar('cortos');
  const chk=$w(w,'efectos'), ids=['icon','title','subtitle'], antes=ids.map(i=>$w(w,i).value);
  try{
    // sin ícono ni texto, lo que quede brillante solo pueden ser efectos
    $w(w,'icon').value='none'; $w(w,'title').value=''; $w(w,'subtitle').value='';
    chk.checked=false; w.App.render();
    afirmar($w(w,'efectosAjustes').hidden, 'controles de efectos visibles');
    const n=blancosEn(w,0,0,1280,720);
    afirmar(n===0, n+' píxeles brillantes sin efectos');
    chk.checked=true; w.App.render();
    afirmar(blancosEn(w,0,0,1280,720)>0, 'con efectos no se dibuja nada brillante');
  } finally { chk.checked=true; ids.forEach((i,k)=>{ $w(w,i).value=antes[k]; }); w.App.render(); }
  afirmar(hashLienzo(w)===LINEA_BASE_CORTOS, 'no vuelve a la línea base');
});

prueba('Cortos: brillo del ícono en 0 no deja resplandor alrededor', w=>{
  w.App.mostrar('cortos');
  const ids=['icon','title','subtitle','iconGlow'], antes=ids.map(i=>$w(w,i).value);
  // punto junto al globo, fuera de su forma (afectado solo por el resplandor)
  const junto=()=>[...pixel(w,782,323)].join();
  try{
    $w(w,'efectos').checked=false; $w(w,'title').value=''; $w(w,'subtitle').value='';
    $w(w,'icon').value='none'; w.App.render(); const fondo=junto();
    $w(w,'icon').value='globo';
    $w(w,'iconGlow').value=0;   w.App.render(); const sin=junto();
    $w(w,'iconGlow').value=100; w.App.render(); const normal=junto();
    $w(w,'iconGlow').value=200; w.App.render(); const doble=junto();
    afirmar(sin===fondo, `con brillo 0 hay resplandor: ${sin} ≠ ${fondo}`);
    afirmar(normal!==fondo, 'con brillo 100 no hay resplandor');
    afirmar(doble!==normal, 'brillo 200 igual a 100');
  } finally { $w(w,'efectos').checked=true; ids.forEach((i,k)=>{ $w(w,i).value=antes[k]; }); w.App.render(); }
  afirmar(hashLienzo(w)===LINEA_BASE_CORTOS, 'no vuelve a la línea base');
});

prueba('Cortos: "Sin ícono" oculta los ajustes del ícono', w=>{
  w.App.mostrar('cortos');
  const sel=$w(w,'icon'), antes=sel.value;
  try{
    sel.value='none'; w.App.render();
    afirmar($w(w,'iconAjustes').hidden, 'ajustes visibles sin ícono');
    sel.value='globo'; w.App.render();
    afirmar(!$w(w,'iconAjustes').hidden, 'ajustes ocultos con ícono');
  } finally { sel.value=antes; w.App.render(); }
});

/* ---------- Cortos: arrastrar el título ---------- */
prueba('Cortos: arrastrar el título lo mueve y no lo saca del lienzo', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos;
  try{
    afirmar(C.onPointerDown({x:200, y:300}), 'no toma el título');
    C.onPointerMove({x:200, y:200}); C.onPointerUp(); w.App.render();
    const movido=hashLienzo(w);
    afirmar(movido !== LINEA_BASE_CORTOS, 'el título no se movió');
    afirmar(C.puedeArrastrar({x:200, y:200}) && C.onPointerDown({x:200, y:200}), 'no toma el título en su nueva posición');
    C.onPointerMove({x:-5000, y:-5000}); C.onPointerUp(); w.App.render();
    afirmar(blancosEn(w,0,0,1280,720) > 0, 'el título salió del lienzo');
  } finally { $w(w,'centerTitle').click(); }
  afirmar(hashLienzo(w) === LINEA_BASE_CORTOS, 'reiniciar no vuelve a la línea base');
});

prueba('Cortos: el subtítulo se arrastra sin mover el título', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos, tituloAntes=blancosEn(w,90,180,700,250);
  try{
    afirmar(C.onPointerDown({x:300, y:490}), 'no toma el subtítulo');
    C.onPointerMove({x:300, y:650}); C.onPointerUp(); w.App.render();
    afirmar(hashLienzo(w) !== LINEA_BASE_CORTOS, 'el subtítulo no se movió');
    afirmar(blancosEn(w,90,180,700,250) === tituloAntes, 'el título también se movió');
    afirmar(C.onPointerDown({x:300, y:640}), 'no toma el subtítulo en su nueva posición');
    C.onPointerUp();
    afirmar(C.onPointerDown({x:200, y:300}), 'no toma el título');
    C.onPointerMove({x:200, y:250}); C.onPointerUp(); w.App.render();
  } finally { $w(w,'centerTitle').click(); }
  afirmar(hashLienzo(w) === LINEA_BASE_CORTOS, 'reiniciar no vuelve a la línea base');
});

prueba('Cortos: con fondo, el título se arrastra antes que el fondo', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos;
  try{
    C.ponerFondo(fotoDePrueba(w)); w.App.render();
    const antes=hashLienzo(w);
    afirmar(C.onPointerDown({x:200, y:300}), 'no toma nada');
    C.onPointerMove({x:260, y:300}); C.onPointerUp();
    $w(w,'centerTitle').click();
    afirmar(hashLienzo(w) === antes, 'se movió el fondo en vez del título');
  } finally { C.ponerFondo(null); w.App.render(); }
});

/* ---------- encuadre con sliders X/Y y textos movibles en Videos largos ---------- */
prueba('Cortos: arrastrar la imagen de fondo mueve sus sliders X/Y', w=>{
  w.App.mostrar('cortos');
  const C=w.Cortos;
  afirmar($w(w,'bgAjustes').hidden, 'ajustes de fondo visibles sin imagen');
  try{
    C.ponerFondo(fotoDePrueba(w,1600,1200)); w.App.render();   // más alta que el lienzo: se mueve en Y
    afirmar(!$w(w,'bgAjustes').hidden, 'ajustes de fondo ocultos con imagen');
    const antes=hashLienzo(w);
    afirmar(C.onPointerDown({x:60, y:300}), 'no toma el fondo');
    C.onPointerMove({x:60, y:340}); C.onPointerUp(); w.App.render();
    afirmar(+$w(w,'bgY').value > 50, 'bgY = '+$w(w,'bgY').value);
    afirmar($w(w,'bgX').value === '50', 'bgX = '+$w(w,'bgX').value);
    afirmar(hashLienzo(w) !== antes, 'el fondo no se movió');
    $w(w,'bgCentrar').click();
    afirmar(hashLienzo(w) === antes, 'centrar no vuelve al encuadre inicial');
  } finally { C.ponerFondo(null); w.App.render(); }
});

prueba('Largos: los sliders X/Y mueven la foto sin dejar huecos', w=>{
  w.App.mostrar('largos');
  try{
    for(const pl of ['vlog','podcast','viaje']){
      $w(w,'lPlantilla').value=pl;
      w.Largos.ponerFoto(fotoDePrueba(w,1600,1600)); $w(w,'lZoom').value=150; w.App.render();
      const centro=hashLienzo(w);
      for(const [x,y] of [[0,0],[100,100]]){
        $w(w,'lFotoX').value=x; $w(w,'lFotoY').value=y; w.App.render();
        afirmar(hashLienzo(w) !== centro, `${pl}: X/Y ${x} no mueve la foto`);
        for(const [px,py] of [[1250,30],[1250,690]])
          afirmar(pixel(w,px,py)[3] === 255, `${pl}: hueco en (${px},${py}) con X/Y ${x}`);
      }
    }
  } finally { $w(w,'lZoom').value=100; w.Largos.ponerFoto(null); $w(w,'lPlantilla').value='vlog'; w.App.render(); }
});

prueba('Largos: arrastrar la foto mueve sus sliders X/Y', w=>{
  w.App.mostrar('largos'); $w(w,'lPlantilla').value='vlog';
  try{
    w.Largos.ponerFoto(fotoDePrueba(w,1600,900)); $w(w,'lZoom').value=200; w.App.render();
    afirmar(w.Largos.onPointerDown({x:1100, y:150}), 'no toma la foto');
    w.Largos.onPointerMove({x:1000, y:200}); w.Largos.onPointerUp();
    afirmar(+$w(w,'lFotoX').value < 50 && +$w(w,'lFotoY').value > 50, `X=${$w(w,'lFotoX').value} Y=${$w(w,'lFotoY').value}`);
    $w(w,'lReencuadrar').click();
    afirmar($w(w,'lFotoX').value === '50' && $w(w,'lZoom').value === '100', 'reencuadrar no centra');
  } finally { $w(w,'lZoom').value=100; w.Largos.ponerFoto(null); w.App.render(); }
});

prueba('Largos: título y subtítulo se arrastran por separado en cada plantilla', w=>{
  w.App.mostrar('largos');
  const L=w.Largos, centro=b=>({x:b.x+Math.min(b.w/2,40), y:b.y+b.h/2});
  try{
    for(const pl of ['vlog','podcast','viaje']){
      $w(w,'lPlantilla').value=pl; L.ponerFoto(fotoDePrueba(w)); w.App.render();
      const inicial=hashLienzo(w);
      for(const k of ['titulo','subtitulo']){
        const b=L.cajaTexto(k), otra=L.cajaTexto(k==='titulo'?'subtitulo':'titulo');
        afirmar(b, `${pl}: sin caja de ${k}`);
        const c=centro(b);
        afirmar(L.onPointerDown(c), `${pl}: no toma ${k}`);
        L.onPointerMove({x:c.x+30, y:c.y-20}); L.onPointerUp(); w.App.render();
        const b2=L.cajaTexto(k), otra2=L.cajaTexto(k==='titulo'?'subtitulo':'titulo');
        afirmar(Math.abs(b2.x-b.x-30)<0.5 && Math.abs(b2.y-b.y+20)<0.5, `${pl}: ${k} no se movió 30,-20`);
        afirmar(otra2.x===otra.x && otra2.y===otra.y, `${pl}: mover ${k} movió el otro texto`);
        afirmar($w(w,'lFotoX').value === '50', `${pl}: mover ${k} movió la foto`);
      }
      // no sale del lienzo
      const c=centro(L.cajaTexto('titulo'));
      L.onPointerDown(c); L.onPointerMove({x:c.x-9999, y:c.y+9999}); L.onPointerUp(); w.App.render();
      const b=L.cajaTexto('titulo');
      afirmar(b.x>=-0.5 && b.y+b.h<=720.5, `${pl}: el título salió del lienzo`);
      $w(w,'lTextoReset').click();
      afirmar(hashLienzo(w) === inicial, `${pl}: reiniciar no vuelve a la posición original`);
    }
  } finally { $w(w,'lTextoReset').click(); L.ponerFoto(null); $w(w,'lPlantilla').value='vlog'; w.App.render(); }
});

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
  w.Cortos.ponerFondo(fotoPaisaje(w)); w.App.render(); res['cortos-con-fondo']=url();
  w.Cortos.ponerFondo(null); w.App.render();
  w.App.mostrar('largos');
  $w(w,'lPlantilla').value='vlog'; w.Largos.ponerFoto(null); w.App.render(); res['vlog-sin-foto']=url();
  w.Largos.ponerFoto(fotoPaisaje(w));
  for(const p of ['vlog','podcast','viaje']){ $w(w,'lPlantilla').value=p; w.App.render(); res[p]=url(); }
  w.Largos.ponerFoto(null);
  return res;
}

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
