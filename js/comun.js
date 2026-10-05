/* ---------- lienzo compartido ---------- */
const W = 1280, H = 720;
const cv = document.getElementById('cv');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);

/* ---------- utilidades ---------- */
function rng(s){ return function(){ s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s);
  t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const gauss = R => (R()+R()+R()-1.5)/1.5;
const pick = (R,a) => a[Math.floor(R()*a.length)];
function hexToRgb(h){ const n=parseInt(h.slice(1),16); return [n>>16&255,n>>8&255,n&255]; }
function rgba(h,a){ const [r,g,b]=hexToRgb(h); return `rgba(${r},${g},${b},${a})`; }
function lighten(h,t){ const [r,g,b]=hexToRgb(h); return `rgb(${r+(255-r)*t|0},${g+(255-g)*t|0},${b+(255-b)*t|0})`; }
function darken(h,t){ const [r,g,b]=hexToRgb(h); return `rgb(${r*(1-t)|0},${g*(1-t)|0},${b*(1-t)|0})`; }
function darkRgba(h,t,a){ const [r,g,b]=hexToRgb(h); return `rgba(${r*(1-t)|0},${g*(1-t)|0},${b*(1-t)|0},${a})`; }
function setLS(c,px){ if('letterSpacing' in c) c.letterSpacing = px + 'px'; }

/* ---------- dibujo compartido ---------- */
function goldG(c,o,y0,y1){
  const g=c.createLinearGradient(0,y0,0,y1);
  g.addColorStop(0,'#fff8e0'); g.addColorStop(0.45,lighten(o.gold,0.4)); g.addColorStop(1,o.gold);
  return g;
}

function star4(x,y,s,o,a){
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.translate(x,y);
  const g=ctx.createRadialGradient(0,0,0,0,0,s*1.3);
  g.addColorStop(0,rgba('#fff6d8',0.5*a)); g.addColorStop(1,rgba(o.gold,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,s*1.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=rgba('#fffbe8',a);
  const w=s*0.12;
  ctx.beginPath(); ctx.moveTo(0,-s);
  ctx.quadraticCurveTo(w,-w,s,0); ctx.quadraticCurveTo(w,w,0,s);
  ctx.quadraticCurveTo(-w,w,-s,0); ctx.quadraticCurveTo(-w,-w,0,-s); ctx.fill();
  ctx.restore();
}

function drawFrame(){
  ctx.save();
  ctx.strokeStyle='rgba(5,10,30,0.92)'; ctx.lineWidth=36; ctx.strokeRect(0,0,W,H);
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=2; ctx.strokeRect(18,18,W-36,H-36);
  ctx.restore();
}

/* ---------- encuadre de fotos con sliders X/Y ---------- */
// "cover" de img en el área a, con zoom; px/py (0–1) eligen la parte visible: 0.5 = centrada
function encuadrar(img,a,zoom,px,py){
  const s=Math.max(a.w/img.width, a.h/img.height)*zoom, w=img.width*s, h=img.height*s;
  const mx=(w-a.w)/2, my=(h-a.h)/2;
  return { x:a.x+(a.w-w)/2+(px*2-1)*mx, y:a.y+(a.h-h)/2+(py*2-1)*my, w, h, mx, my };
}
// arrastrar la foto mueve sus sliders X/Y (g = último encuadre dibujado)
function iniciarEncuadre(p,g,idX,idY){ return { px:p.x, py:p.y, x0:+$(idX).value, y0:+$(idY).value, mx:g.mx, my:g.my, idX, idY }; }
function moverEncuadre(d,p){
  const v=(v0,delta,m)=> m>0 ? Math.max(0,Math.min(100,Math.round(v0+delta/m*50))) : v0;
  $(d.idX).value=v(d.x0,p.x-d.px,d.mx);
  $(d.idY).value=v(d.y0,p.y-d.py,d.my);
}

// ancho de la línea más ancha con la fuente dada
function medirTexto(lineas,peso,size,ls){
  ctx.save(); ctx.font=`${peso} ${size}px Montserrat, sans-serif`; setLS(ctx,size*ls);
  const ancho=Math.max(0,...lineas.map(l=>ctx.measureText(l).width));
  ctx.restore();
  return ancho;
}

/* ---------- fotos superpuestas ----------
   Cada sección tiene su lista de fotos: se mueven arrastrando con el botón izquierdo
   y se agrandan o achican con Ctrl + rueda del mouse, tomando el cursor como centro.
   inputId: <input type=file multiple>; listaId: contenedor donde se listan con su botón ✕. */
function crearFotos(inputId, listaId){
  const lista=[];   // { img, cx, cy, w }: centro y ancho en px del lienzo
  let arrastre=null;
  const alto=f=>f.w*f.img.height/f.img.width;
  const caja=f=>({ x:f.cx-f.w/2, y:f.cy-alto(f)/2, w:f.w, h:alto(f) });
  const lim=(v,a,z)=>Math.max(a,Math.min(z,v));

  // la foto de más arriba bajo el punto p
  function en(p){
    for(let i=lista.length-1;i>=0;i--){
      const b=caja(lista[i]);
      if(p.x>=b.x && p.x<=b.x+b.w && p.y>=b.y && p.y<=b.y+b.h) return lista[i];
    }
    return null;
  }

  function agregar(img){
    // cabe en 30 % del ancho y 50 % del alto; las nuevas se escalonan para no taparse
    const w=Math.min(W*0.3, H*0.5*img.width/img.height), n=lista.length%6;
    lista.push({ img, cx:W/2+n*40, cy:H/2+n*30, w });
    listar();
  }
  function quitar(f){ const i=lista.indexOf(f); if(i>=0) lista.splice(i,1); listar(); }
  function vaciar(){ lista.length=0; listar(); }

  function dibujar(){
    if(!lista.length) return;
    ctx.save(); ctx.imageSmoothingQuality='high';
    ctx.shadowColor='rgba(0,0,0,0.45)'; ctx.shadowBlur=24; ctx.shadowOffsetY=6;
    lista.forEach(f=>{ const b=caja(f); ctx.drawImage(f.img,b.x,b.y,b.w,b.h); });
    ctx.restore();
  }

  // arrastre: la foto tomada pasa al frente; su centro no sale del lienzo
  function tomar(p){
    const f=en(p); if(!f) return false;
    lista.splice(lista.indexOf(f),1); lista.push(f);
    arrastre={ f, dx:p.x-f.cx, dy:p.y-f.cy };
    listar();
    return true;
  }
  function mover(p){
    if(!arrastre) return false;
    arrastre.f.cx=lim(p.x-arrastre.dx,0,W);
    arrastre.f.cy=lim(p.y-arrastre.dy,0,H);
    return true;
  }
  function soltar(){ arrastre=null; }

  // deltaY > 0 achica, < 0 agranda; el punto bajo el cursor queda fijo
  function escalar(p,deltaY){
    const f=en(p); if(!f) return false;
    const w=lim(f.w*Math.exp(-lim(deltaY,-200,200)*0.0015), 40, W*3), k=w/f.w;
    f.cx=p.x+(f.cx-p.x)*k; f.cy=p.y+(f.cy-p.y)*k; f.w=w;
    return true;
  }

  // lista del panel: miniatura + botón para quitar, la de más arriba primero
  function listar(){
    const cont=$(listaId); if(!cont) return;
    cont.replaceChildren(...lista.slice().reverse().map((f,i)=>{
      const fila=document.createElement('div'); fila.className='foto-item';
      const mini=document.createElement('canvas'); mini.width=64; mini.height=40;
      const m=mini.getContext('2d'), s=Math.min(64/f.img.width,40/f.img.height);
      m.drawImage(f.img,(64-f.img.width*s)/2,(40-f.img.height*s)/2,f.img.width*s,f.img.height*s);
      const nombre=document.createElement('span'); nombre.textContent='Foto '+(lista.length-i);
      const x=document.createElement('button'); x.type='button'; x.className='ghost'; x.textContent='✕';
      x.title='Quitar esta foto';
      x.addEventListener('click',()=>{ quitar(f); App.render(); });
      fila.append(mini,nombre,x);
      return fila;
    }));
    cont.hidden=!lista.length;
  }

  $(inputId).addEventListener('change',e=>{
    [...e.target.files].forEach(file=>leerImagen(file,img=>{ agregar(img); App.render(); }));
    e.target.value='';
  });

  return { lista, en, agregar, quitar, vaciar, dibujar, tomar, mover, soltar, escalar };
}

/* ---------- archivos ---------- */
function leerImagen(file, listo){
  const r=new FileReader();
  const fallo=()=>alert('No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP.');
  r.onerror=fallo;
  r.onload=()=>{ const img=new Image(); img.onload=()=>listo(img); img.onerror=fallo; img.src=r.result; };
  r.readAsDataURL(file);
}

function descargar(nombre){
  cv.toBlob(b=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(b); a.download=nombre; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  },'image/png');
}
