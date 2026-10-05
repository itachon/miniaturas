/* ---------- sección "Videos largos": vlog, podcast y viaje ---------- */
var Largos = (() => {
  let seed = 20260930;
  let foto = null;
  let geoFoto = null;            // último encuadre dibujado de la foto
  let area = null;               // área de la foto en la plantilla dibujada
  let arrastre = null;
  let desp = {};                 // desplazamiento de cada texto, por plantilla: desp.vlog.titulo = {dx,dy}
  let cajas = {};                // caja de cada texto movible, sin desplazar
  const NOCHE = '#08122e', NOCHE2 = '#1f4f9a';

  function opts(){
    return {
      plantilla: $('lPlantilla').value,
      zoom: +$('lZoom').value/100, oscuro: +$('lOscuro').value/100,
      fotoX: +$('lFotoX').value/100, fotoY: +$('lFotoY').value/100,
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

  function dibujarFoto(a,o){
    ctx.save();
    ctx.beginPath(); ctx.rect(a.x,a.y,a.w,a.h); ctx.clip();
    if(foto){
      const g=geoFoto=encuadrar(foto,a,o.zoom,o.fotoX,o.fotoY);
      ctx.imageSmoothingQuality='high';   // las fotos de celular se reducen mucho
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
    const ancho=Math.max(1,medirTexto(lineas,peso,size,ls));
    return ancho>maxW ? size*maxW/ancho : size;
  }

  /* ---------- textos movibles ---------- */
  function despDe(k){
    const p=$('lPlantilla').value;
    desp[p]=desp[p]||{};
    return desp[p][k]=desp[p][k]||{dx:0, dy:0};
  }
  // dibuja un texto desplazado según lo que el usuario lo haya arrastrado
  function movible(k,caja,dibujar){
    cajas[k]=caja;
    const d=despDe(k);
    ctx.save(); ctx.translate(d.dx,d.dy); dibujar(); ctx.restore();
  }
  // cajas aproximadas de tituloDorado y textoPlano
  function cajaDorado(lineas,x,yBase,size){
    const y=yBase-(lineas.length-1)*size*1.02-size*0.8;
    return { x, y, w:medirTexto(lineas,900,size,0.01), h:yBase+size*0.25-y };
  }
  const cajaPlano=(t,x,y,size,peso,ls=0.04)=>({ x, y:y-size*0.85, w:medirTexto([t],peso,size,ls), h:size*1.1 });

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

  // píldora dorada con texto oscuro, reducida si supera maxW; devuelve su ancho
  function insignia(t,x,y,size,o,maxW=Infinity){
    ctx.save();
    ctx.font=`800 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.08);
    let w=ctx.measureText(t).width+size*1.4;
    if(w>maxW){
      size*=maxW/w;
      ctx.font=`800 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.08);
      w=ctx.measureText(t).width+size*1.4;
    }
    const h=size*1.9;
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
    // barra de acento sobre el título
    const barra=top=>{
      ctx.save(); ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=18;
      ctx.fillStyle=o.gold; ctx.fillRect(x+4,top-30,140,10); ctx.restore();
    };
    const lineas=lineasDe(o.titulo);
    if(lineas.length){
      const size=ajustar(lineas,900,Math.min(150,330/lineas.length),W*0.62);
      const caja=cajaDorado(lineas,x,yBase,size);
      caja.y-=30; caja.h+=30;   // incluye la barra
      movible('titulo',caja,()=>barra(tituloDorado(lineas,x,yBase,size,o)));
    } else barra(yBase);
    if(sub){
      const s=ajustar([sub],700,38,W*0.62,0.04);
      movible('subtitulo',cajaPlano(sub,x+4,H-72,s,700),()=>textoPlano(sub,x+4,H-72,s,700,lighten(o.gold,0.2)));
    }
    chispas(R,o,5,{x:W*0.55, y:H*0.08, w:W*0.4, h:H*0.3});
  }

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
    let g=ctx.createLinearGradient(0,0,a.x,0);   // termina en NOCHE justo donde empieza el fundido
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
      const size=ajustar(lineas,900,Math.min(96,300/lineas.length),maxW), yT=190+size*0.85+(lineas.length-1)*size*1.02;
      movible('titulo',cajaDorado(lineas,x,yT,size),()=>tituloDorado(lineas,x,yT,size,o));
      y=yT;
    }
    const inv=o.invitado.trim().toUpperCase();
    if(inv){ y+=64; textoPlano(inv,x,y,ajustar([inv],800,40,maxW,0.04),800,lighten(o.gold,0.15)); }
    const sub=o.subtitulo.trim().toUpperCase();
    if(sub){
      y+=52; const s=ajustar([sub],600,26,maxW,0.04), yS=y;
      movible('subtitulo',cajaPlano(sub,x,yS,s,600),()=>textoPlano(sub,x,yS,s,600,'rgba(232,236,247,0.8)'));
    }
    chispas(R,o,4,{x:40, y:H*0.72, w:W*0.38, h:H*0.2});
  }

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
  const RUTA_X0=W*0.62;
  function ruta(o){
    const x0=RUTA_X0, y0=H*0.42, x1=W*0.9, y1=H*0.2;
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

    const x=80, maxTexto=RUTA_X0-x-30;   // título, subtítulo y fecha no llegan a la ruta
    if(o.fecha) insignia(o.fecha.toUpperCase(),x,56,26,o,maxTexto);
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
    if(sub){
      const s=ajustar([sub],600,28,maxTexto,0.04), yS=y;
      movible('subtitulo',cajaPlano(sub,x,yS,s,600),()=>textoPlano(sub,x,yS,s,600,'rgba(232,236,247,0.85)'));
      y-=48;
    }
    const lineas=lineasDe(o.titulo);
    if(lineas.length){
      const s=ajustar(lineas,800,Math.min(56,150/lineas.length),maxTexto,0.04), yB=y;
      const top=yB-(lineas.length-1)*s*1.1-s*0.85;
      const caja={ x, y:top, w:medirTexto(lineas,800,s,0.04), h:yB+s*0.25-top };
      movible('titulo',caja,()=>{
        lineas.forEach((l,i)=>textoPlano(l,x,yB-(lineas.length-1-i)*s*1.1,s,800,'#ffffff'));
      });
    }
    chispas(R,o,4,{x:W*0.6, y:H*0.05, w:W*0.35, h:H*0.25});
  }

  const PLANTILLAS = { vlog, podcast, viaje };

  /* ---------- render ---------- */
  function render(){
    const o=opts(), R=rng(seed);
    $('lZoomv').textContent=$('lZoom').value+'%';
    $('lOscurov').textContent=$('lOscuro').value+'%';
    $('lFotoXv').textContent=$('lFotoX').value+'%';
    $('lFotoYv').textContent=$('lFotoY').value+'%';
    cajas={};
    document.querySelectorAll('[data-plantilla]').forEach(el=>{ el.hidden = el.dataset.plantilla!==o.plantilla; });
    ctx.save(); ctx.clearRect(0,0,W,H);
    PLANTILLAS[o.plantilla](R,o);
    drawFrame();
    ctx.restore();
  }

  /* ---------- arrastrar el subtítulo, el título o la foto (en ese orden) ---------- */
  const dentro=(b,p)=>!!b && p.x>=b.x && p.x<=b.x+b.w && p.y>=b.y && p.y<=b.y+b.h;
  function textoEn(p){
    return ['subtitulo','titulo'].find(k=>{
      const b=cajas[k], d=despDe(k);
      return b && dentro({...b, x:b.x+d.dx, y:b.y+d.dy},p);
    });
  }
  const sobreFoto=p=>!!foto && !!geoFoto && dentro(area,p);
  function puedeArrastrar(p){ return !!textoEn(p) || sobreFoto(p); }
  function onPointerDown(p){
    const t=textoEn(p);
    if(t){ const d=despDe(t); arrastre={texto:t, dx:p.x-d.dx, dy:p.y-d.dy}; }
    else if(sobreFoto(p)) arrastre={e:iniciarEncuadre(p,geoFoto,'lFotoX','lFotoY')};
    else return false;
    return true;
  }
  function onPointerMove(p){
    if(!arrastre) return;
    if(arrastre.e){ moverEncuadre(arrastre.e,p); return; }
    // el texto no puede salir del lienzo
    const b=cajas[arrastre.texto], d=despDe(arrastre.texto), lim=(v,a,z)=>Math.max(a,Math.min(z,v));
    if(!b) return;
    d.dx=lim(p.x-arrastre.dx, -b.x, W-b.x-b.w);
    d.dy=lim(p.y-arrastre.dy, -b.y, H-b.y-b.h);
  }
  function onPointerUp(){ arrastre=null; }

  function centrarFoto(){ $('lFotoX').value=50; $('lFotoY').value=50; }
  function ponerFoto(img){ foto=img; geoFoto=null; centrarFoto(); }

  /* ---------- controles propios ---------- */
  $('lFoto').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    leerImagen(f,img=>{ ponerFoto(img); App.render(); });
  });
  $('lReencuadrar').addEventListener('click',()=>{ $('lZoom').value=100; centrarFoto(); App.render(); });
  $('lTextoReset').addEventListener('click',()=>{ desp={}; App.render(); });
  $('lRand').addEventListener('click',()=>{ seed=Math.floor(Math.random()*1e9); App.render(); });

  return {
    render, nombreArchivo: ()=>'miniatura-'+$('lPlantilla').value+'.png',
    puedeArrastrar, onPointerDown, onPointerMove, onPointerUp,
    ponerFoto, ajustar, insignia, etiquetaPodcast,
    cajaTexto: k=>cajas[k] && {...cajas[k], x:cajas[k].x+despDe(k).dx, y:cajas[k].y+despDe(k).dy}
  };
})();
