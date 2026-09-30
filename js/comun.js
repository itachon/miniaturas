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
