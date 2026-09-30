/* ---------- secciones, render y eventos del lienzo ---------- */
var App = (() => {
  const SECCIONES = { cortos: Cortos, largos: Largos };
  let actual = 'cortos';
  const activa = () => SECCIONES[actual];

  function render(){ activa().render(); }
  let raf=0;
  function programar(){ cancelAnimationFrame(raf); raf=requestAnimationFrame(render); }

  function mostrar(nombre){
    actual=nombre;
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('activa',t.dataset.seccion===nombre));
    document.querySelectorAll('[data-panel]').forEach(p=>{ p.hidden = p.dataset.panel!==nombre; });
    cv.classList.remove('drag');
    render();
  }
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>mostrar(t.dataset.seccion)));

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
    document.fonts.load('600 40px Montserrat'),
    document.fonts.load('900 100px Montserrat')
  ]).then(render).catch(render);

  return { render, programar, mostrar };
})();
